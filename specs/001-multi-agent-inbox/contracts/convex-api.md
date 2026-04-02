# Convex API Contracts: Multi-Agent Shared Inbox

**Feature**: `001-multi-agent-inbox` | **Date**: 2026-04-02

These contracts define the public interface of Convex functions. All functions validate `tenantId` from the Clerk JWT before any data access.

---

## conversations.ts

### `listForCaller` — query (live)
Returns conversations visible to the authenticated caller based on their role.

**Input**: none (tenantId and callerId extracted from auth context)

**Output**:
```typescript
Array<{
  _id: Id<"conversations">;
  contactId: Id<"contacts">;
  channelId: Id<"channels">;
  assignedAgentId: string | null;
  status: "open" | "pending" | "resolved";
  labels: string[];
  lastMessageAt: number;
  lastMessagePreview: string;
  unreadCount: number;
}>
```

**Visibility rule**: Agents receive only conversations where `assignedAgentId === callerId` OR `assignedAgentId === null` (Unassigned queue). Admins/Supervisors receive all conversations for the tenant.

---

### `assign` — mutation
Assigns a conversation to an agent (or unassigns by passing `null`).

**Input**:
```typescript
{ conversationId: Id<"conversations">; agentId: string | null }
```

**Auth**: Admin or Supervisor role required. Returns `ConvexError("FORBIDDEN")` for Agent role.

**Output**: `void`

---

### `setStatus` — mutation
Changes the status of a conversation.

**Input**:
```typescript
{ conversationId: Id<"conversations">; status: "open" | "pending" | "resolved" }
```

**Auth**: Any authenticated agent with access to the conversation.

**Output**: `void`

---

### `get` — query (live)
Returns a single conversation by ID (role-checked).

**Input**: `{ conversationId: Id<"conversations"> }`

**Output**: Conversation document or `null` if not found / not accessible.

---

## messages.ts

### `listForConversation` — query (live)
Returns all messages (including internal notes) for a conversation thread.

**Input**: `{ conversationId: Id<"conversations"> }`

**Output**:
```typescript
Array<{
  _id: Id<"messages">;
  direction: "inbound" | "outbound";
  content: string;
  type: "text" | "image" | "document" | "unsupported";
  isInternalNote: boolean;
  senderId: string;
  status: "sent" | "delivered" | "read" | "failed" | null;
  timestamp: number;
}>
```

**Note**: Internal notes (`isInternalNote: true`) are included. UI is responsible for visual distinction. Internal notes are NEVER returned to the customer via any channel.

---

### `sendReply` — mutation
Sends an outbound WhatsApp message to the customer.

**Input**:
```typescript
{ conversationId: Id<"conversations">; content: string }
```

**Behavior**:
1. Validates caller has access to this conversation
2. Creates message document with `direction: "outbound"`, `status: "sent"`
3. Schedules a Convex action to call Meta Send Message API
4. Updates `conversation.lastMessageAt` and `lastMessagePreview`
5. If channel is `first_reply` mode and conversation is Unassigned → assigns to sender

**Output**: `Id<"messages">`

---

### `addInternalNote` — mutation
Adds an internal note (never sent to customer).

**Input**:
```typescript
{ conversationId: Id<"conversations">; content: string }
```

**Output**: `Id<"messages">` with `isInternalNote: true`

---

### `createInbound` — internal mutation (called from webhook action)
Persists an inbound message from a Meta webhook payload.

**Input**:
```typescript
{
  tenantId: string;
  channelId: Id<"channels">;
  metaMessageId: string;
  senderPhone: string;
  content: string;
  type: "text" | "image" | "document" | "unsupported";
  timestamp: number;
}
```

**Behavior**:
1. Deduplicates by `metaMessageId` — ignores if already exists
2. Upserts contact by `(tenantId, senderPhone)`
3. Finds or creates open conversation for `(tenantId, channelId, contactId)`
4. If conversation was `resolved` → re-opens to `open`
5. Creates message document
6. Updates `conversation.lastMessageAt`, `lastMessagePreview`, `unreadCount`

**Auth**: Internal only — not callable from client.

---

## quickReplies.ts

### `list` — query (live)
Returns all quick replies for the tenant, optionally filtered by category.

**Input**: `{ category?: string }`

**Output**: `Array<{ _id, title, body, category }>`

---

### `create` — mutation
Creates a new quick reply. Admin/Supervisor only.

**Input**: `{ title: string; body: string; category?: string }`

**Output**: `Id<"quickReplies">`

---

### `update` — mutation
Updates an existing quick reply. Admin/Supervisor only.

**Input**: `{ id: Id<"quickReplies">; title?: string; body?: string; category?: string }`

**Output**: `void`

---

### `remove` — mutation
Deletes a quick reply. Admin/Supervisor only.

**Input**: `{ id: Id<"quickReplies"> }`

**Output**: `void`

---

## http.ts (Webhook)

### `POST /meta/webhook` — httpAction
Receives and verifies incoming Meta WhatsApp webhook payloads.

**Verification**: HMAC-SHA256 of raw request body using `META_APP_SECRET`. Returns `403` if invalid.

**GET handler**: Returns `hub.challenge` for Meta webhook verification handshake.

**On valid inbound message**:
1. Identifies tenant by `phoneNumberId` (looks up channel)
2. Calls `ctx.runMutation(api.messages.createInbound, {...})`

**On status update** (delivered/read): Updates `message.status` field.

**Returns**: `200 OK` for all valid payloads (Meta requires 200 to stop retries).
