# Research: Multi-Agent Shared Inbox

**Feature**: `001-multi-agent-inbox` | **Date**: 2026-04-02

---

## 1. Convex Real-Time Subscriptions for Inbox

**Decision**: Use `useQuery` for all inbox data — conversation list, active thread, unread counts.

**Rationale**: Convex live queries push updates to all subscribed clients automatically whenever the underlying data changes. No WebSocket setup, no polling, no pub/sub infrastructure needed. Meets SC-002 (messages appear within 3 seconds) by design.

**Pattern**:
```typescript
// In conversation-list.tsx (Client Component)
const conversations = useQuery(api.conversations.listForAgent, { tenantId, agentId });
```

**Alternatives considered**:
- Polling: Forbidden by constitution (Principle III).
- Custom WebSocket: Unnecessary complexity — Convex provides this out of the box.

---

## 2. Multi-Tenant Auth with Clerk + Convex

**Decision**: Use Clerk `orgId` as `tenantId` in all Convex function contexts. Extract via `ctx.auth.getUserIdentity()` in Convex functions.

**Rationale**: Clerk Organizations provide built-in multi-tenant membership. `orgId` is available in the Clerk JWT and accessible in every Convex function context as `identity.orgId`. This eliminates the need for a custom `tenants` table.

**Pattern**:
```typescript
// convex/conversations.ts
export const listForAgent = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const tenantId = identity?.orgId;
    if (!tenantId) throw new Error("Unauthorized");
    // all queries filtered by tenantId
    return ctx.db.query("conversations")
      .withIndex("by_tenant", q => q.eq("tenantId", tenantId))
      .collect();
  }
});
```

**Role extraction**: Clerk org membership role (`org:admin`, `org:member`) mapped to WaDesk roles in Convex. Role checked server-side before permissioned operations.

**Alternatives considered**:
- Custom `tenants` table in Convex: Adds sync complexity with Clerk. Rejected.
- NextAuth: Lacks multi-tenant org model. Rejected per CLAUDE.md decision log.

---

## 3. Meta WhatsApp Webhook Integration

**Decision**: Receive Meta webhooks via a Convex `httpAction` in `convex/http.ts`. Verify HMAC-SHA256 signature before processing.

**Rationale**: Convex HTTP actions run server-side and can perform signature verification, then call internal Convex mutations to persist messages. This keeps all Meta API token usage server-side (Constitution Principle IV).

**Webhook verification pattern**:
```typescript
// convex/http.ts
export const metaWebhook = httpAction(async (ctx, request) => {
  const signature = request.headers.get("x-hub-signature-256");
  const body = await request.text();
  const expected = hmacSha256(process.env.META_APP_SECRET, body);
  if (signature !== `sha256=${expected}`) {
    return new Response("Forbidden", { status: 403 });
  }
  // parse + store message
});
```

**Inbound message flow**:
1. Customer sends WhatsApp message → Meta delivers webhook to Convex HTTP action
2. Action verifies signature → extracts message payload
3. Action calls `ctx.runMutation(api.messages.createInbound, {...})` to persist
4. Convex live query on client pushes update to all subscribed agents in real time

**Alternatives considered**:
- Next.js API route (`app/api/webhook/route.ts`): Possible, but Convex action keeps all data logic co-located and avoids cross-service auth. Rejected for simplicity.

---

## 4. RTL Layout with shadcn/ui + Tailwind

**Decision**: Set `dir="rtl"` on root `<html>` element in `app/layout.tsx`. Use Tailwind CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`) exclusively. Load Cairo font via `next/font/google`.

**Rationale**: Constitution Principle I requires RTL-first. Setting direction at root ensures all shadcn/ui components (Drawer, Sheet, Dialog, ScrollArea) inherit RTL behavior without per-component overrides.

**Font setup**:
```typescript
// app/layout.tsx
import { Cairo } from "next/font/google";
const cairo = Cairo({ subsets: ["arabic", "latin"] });
```

**Key RTL considerations for inbox**:
- Conversation list panel: on the right side in RTL (start of reading direction)
- Chevron icons in list items: flipped via `rotate-180` in RTL
- Message bubbles: inbound messages align `start`, outbound align `end`
- Phone number inputs: always `dir="ltr"` override

**Alternatives considered**:
- Per-component `dir` attribute: Error-prone, easy to miss. Rejected.
- CSS `direction: rtl` only: Less robust than HTML `dir` attribute with logical properties. Rejected.

---

## 5. Two-Panel Inbox Layout

**Decision**: Use shadcn/ui `ResizablePanelGroup` with `ResizablePanel` and `ResizableHandle` for the inbox split view.

**Rationale**: Provides drag-to-resize, persists panel sizes in localStorage, and is fully accessible. Works correctly with RTL by default.

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Sidebar (channels/nav)  │  Inbox Split View         │
│                          │  ┌──────────┬──────────┐  │
│                          │  │ Conv List│  Thread  │  │
│                          │  │ (30%)    │  (70%)   │  │
│                          │  └──────────┴──────────┘  │
└─────────────────────────────────────────────────────┘
```

In RTL: conversation list appears on the right; thread on the left.

---

## 6. Role-Based Conversation Visibility

**Decision**: Enforce visibility at the Convex query layer, not only in the UI.

**Rationale**: UI-only enforcement is bypassable. Convex queries must check the caller's role before returning data (Constitution Principle II — tenant isolation applies to agent isolation within a tenant too).

**Pattern**:
```typescript
// Agents see only their assigned conversations
// Admins/Supervisors see all
const role = await getCallerRole(ctx); // from Clerk org membership
if (role === "agent") {
  return ctx.db.query("conversations")
    .withIndex("by_tenant_agent", q => q.eq("tenantId", tenantId).eq("assignedAgentId", callerId))
    .collect();
} else {
  return ctx.db.query("conversations")
    .withIndex("by_tenant", q => q.eq("tenantId", tenantId))
    .collect();
}
```

---

## 7. Assignment Mode Logic

**Decision**: Implement assignment mode as a field on the `channels` document. Process in the webhook action when a new conversation is created.

| Mode | Behavior |
|------|----------|
| `first_reply` | Conversation assigned to first agent who sends a reply |
| `manual` | Conversation stays Unassigned; admin/supervisor assigns |
| `round_robin` | On conversation creation, assign to next agent in rotation (all active agents, ignoring online status) |

**Round Robin state**: Track `channel.roundRobinIndex` (integer) — increment on each assignment, modulo active agent count.

**Alternatives considered**:
- Presence-based round robin (online agents only): Requires presence system, out of scope. Rejected per clarification session 2026-04-02.
