# WhatsApp Message Interactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three WhatsApp-native message interactions to the WaDesk inbox: (1) Reply to a specific message (quoted reply), (2) Delete a sent message within the ~60-second window, and (3) React to a message with an emoji.

**Architecture:** Each feature follows the same data flow — UI gesture → Convex mutation stores intent in DB → Convex internalAction calls Meta Cloud API. Schema changes are additive (new optional fields on `messages`). The `MessageBubble` component gains a hover-action menu, the `MessageInput` gains a reply context banner, and `sendWhatsAppMessage.ts` gains new action handlers for delete and react.

**Tech Stack:** Next.js 15 App Router, Convex (mutations + internalActions), Meta WhatsApp Cloud API v21.0, shadcn/ui, Tailwind CSS v4, TypeScript (strict, no `any`)

---

## Feature Overview & API Mapping

| Feature | Meta API call | Limitation |
|---|---|---|
| Quoted reply | `POST /{phone-number-id}/messages` with `context.message_id` | Requires `metaMessageId` of the target message |
| Delete message | `DELETE /{phone-number-id}/messages/{message_id}` | Only within ~60 seconds of sending; outbound only |
| Emoji reaction | `POST /{phone-number-id}/messages` with `type: "reaction"` | Works on any message (inbound or outbound) |

---

## File Map

### New files
- `components/inbox/message-action-menu.tsx` — Hover menu on each bubble (Reply, React, Delete buttons)
- `components/inbox/reply-context-banner.tsx` — Strip shown above the textarea when a message is being quoted

### Modified files
- `convex/schema.ts` — Add `quotedMessageId`, `reactions`, `deletedAt` fields to `messages` table
- `convex/messages.ts` — Add `sendQuotedReply`, `deleteMessage`, `reactToMessage` mutations + internal helpers
- `convex/actions/sendWhatsAppMessage.ts` — Add `sendQuotedMessage`, `deleteWhatsAppMessage`, `sendReaction` internalActions
- `components/inbox/message-bubble.tsx` — Wrap with hover state, render quoted context banner inside bubble, render reaction badges, show deleted state
- `components/inbox/message-input.tsx` — Accept `replyTo` prop, render `ReplyContextBanner`, pass `quotedMessageId` to `sendMessage`
- `components/inbox/conversation-thread.tsx` — Pass `onReply` handler down to each `MessageBubble`; pass `replyTo` state to `MessageInput`
- `convex/http.ts` — Handle incoming `reaction` webhook events (customer reacts to agent message)

---

## Task 1: Schema — add new fields to `messages` table

**Files:**
- Modify: `convex/schema.ts:160-192`

- [ ] **Step 1: Add three optional fields to the `messages` table definition**

Open `convex/schema.ts`. Inside the `messages` table definition (currently ends at line ~192), add these three fields **before** the closing `)`  of `defineTable({...})`:

```typescript
// Quoted reply — ID of the Convex message being replied to (for UI preview)
quotedMessageId: v.optional(v.id("messages")),
// Soft-delete — timestamp when the message was deleted via Meta API
deletedAt: v.optional(v.number()),
// Reactions — array of { emoji, reactorId } objects
reactions: v.optional(v.array(v.object({
  emoji: v.string(),
  reactorId: v.string(), // Convex userId (agent) or phone number (customer)
}))),
```

The full `messages` table block should now look like:

```typescript
messages: defineTable({
  conversationId: v.id("conversations"),
  tenantId: v.string(),
  direction: v.union(v.literal("inbound"), v.literal("outbound")),
  content: v.string(),
  contentType: v.union(
    v.literal("text"),
    v.literal("image"),
    v.literal("document"),
    v.literal("unsupported"),
    v.literal("audio"),
    v.literal("video"),
    v.literal("sticker"),
    v.literal("location"),
    v.literal("template"),
  ),
  isInternalNote: v.boolean(),
  authorId: v.optional(v.string()),
  mediaUrl: v.optional(v.string()),
  metaMessageId: v.optional(v.string()),
  status: v.union(
    v.literal("sending"),
    v.literal("sent"),
    v.literal("delivered"),
    v.literal("read"),
    v.literal("failed"),
  ),
  timestamp: v.number(),
  createdAt: v.number(),
  // New fields:
  quotedMessageId: v.optional(v.id("messages")),
  deletedAt: v.optional(v.number()),
  reactions: v.optional(v.array(v.object({
    emoji: v.string(),
    reactorId: v.string(),
  }))),
})
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_tenant", ["tenantId"])
  .index("by_meta_message_id", ["metaMessageId"]),
```

- [ ] **Step 2: Push schema changes**

```bash
npx convex dev --once
```

Expected: Convex prints "Schema updated" with no errors.

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add quotedMessageId, deletedAt, reactions to messages table"
```

---

## Task 2: Convex action — `sendQuotedMessage` (Meta API call)

**Files:**
- Modify: `convex/actions/sendWhatsAppMessage.ts`

- [ ] **Step 1: Add `sendQuotedMessage` internalAction**

At the bottom of `convex/actions/sendWhatsAppMessage.ts`, append:

```typescript
export const sendQuotedMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    content: v.string(),
    quotedMetaMessageId: v.string(), // the wamid of the message being quoted
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `${BASE}/${args.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: args.contactPhone,
            context: { message_id: args.quotedMetaMessageId },
            type: "text",
            text: { body: args.content },
          }),
        },
      );

      if (!response.ok) {
        await markFailed(ctx, args.messageId, args.tenantId);
        return;
      }

      const data = (await response.json()) as { messages?: { id: string }[] };
      const metaId = data.messages?.[0]?.id;
      if (metaId) {
        await ctx.runMutation(internal.messages.setMetaMessageId, {
          messageId: args.messageId,
          metaMessageId: metaId,
          tenantId: args.tenantId,
        });
      }

      await ctx.runMutation(internal.messages.updateStatus, {
        messageId: args.messageId,
        status: "delivered",
        tenantId: args.tenantId,
      });
    } catch {
      await markFailed(ctx, args.messageId, args.tenantId);
    }
  },
});
```

- [ ] **Step 2: Add `deleteWhatsAppMessage` internalAction**

Still in `convex/actions/sendWhatsAppMessage.ts`, append:

```typescript
export const deleteWhatsAppMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    metaMessageId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const response = await fetch(
        `${BASE}/${args.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: "status",
            type: "request_welcome",
            // Meta delete API uses this structure:
          }),
        },
      );
      // Note: Meta Cloud API delete is a DELETE request to a different endpoint:
      // DELETE https://graph.facebook.com/v21.0/{phone-number-id}/messages/{message-id}
      // Re-implement using the correct DELETE verb:
      const deleteResponse = await fetch(
        `${BASE}/${args.phoneNumberId}/messages/${args.metaMessageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
          },
        },
      );

      if (deleteResponse.ok) {
        await ctx.runMutation(internal.messages.markDeletedInDb, {
          messageId: args.messageId,
          tenantId: args.tenantId,
        });
      }
      // If it fails (outside window), we silently ignore — message stays in DB
    } catch {
      // Silently ignore — deletion window may have passed
    }
  },
});
```

> **Note:** Replace the duplicate fetch block above — the final implementation should only have the `DELETE` fetch, not the first `POST` fetch (that was a placeholder). The correct code for `deleteWhatsAppMessage` is:

```typescript
export const deleteWhatsAppMessage = internalAction({
  args: {
    messageId: v.id("messages"),
    phoneNumberId: v.string(),
    metaMessageId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const deleteResponse = await fetch(
        `${BASE}/${args.phoneNumberId}/messages/${args.metaMessageId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
          },
        },
      );
      if (deleteResponse.ok) {
        await ctx.runMutation(internal.messages.markDeletedInDb, {
          messageId: args.messageId,
          tenantId: args.tenantId,
        });
      }
    } catch {
      // Silent — deletion window may have passed
    }
  },
});
```

- [ ] **Step 3: Add `sendReaction` internalAction**

```typescript
export const sendReaction = internalAction({
  args: {
    phoneNumberId: v.string(),
    contactPhone: v.string(),
    metaMessageId: v.string(), // wamid of the message being reacted to
    emoji: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      await fetch(
        `${BASE}/${args.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.META_SYSTEM_USER_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: args.contactPhone,
            type: "reaction",
            reaction: {
              message_id: args.metaMessageId,
              emoji: args.emoji,
            },
          }),
        },
      );
      // Reactions don't have a delivery callback — fire and forget
    } catch {
      // Silent
    }
  },
});
```

- [ ] **Step 4: Commit**

```bash
git add convex/actions/sendWhatsAppMessage.ts
git commit -m "feat(actions): add sendQuotedMessage, deleteWhatsAppMessage, sendReaction Meta API actions"
```

---

## Task 3: Convex mutations — `sendQuotedReply`, `deleteMessage`, `reactToMessage`

**Files:**
- Modify: `convex/messages.ts`

- [ ] **Step 1: Add `setMetaMessageId` internalMutation** (needed by `sendQuotedMessage` action above)

At the bottom of `convex/messages.ts`, append:

```typescript
export const setMetaMessageId = internalMutation({
  args: {
    messageId: v.id("messages"),
    metaMessageId: v.string(),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.messageId, { metaMessageId: args.metaMessageId });
  },
});
```

- [ ] **Step 2: Add `markDeletedInDb` internalMutation**

```typescript
export const markDeletedInDb = internalMutation({
  args: {
    messageId: v.id("messages"),
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== args.tenantId) return;
    await ctx.db.patch(args.messageId, { deletedAt: Date.now() });
  },
});
```

- [ ] **Step 3: Add `sendQuotedReply` mutation**

```typescript
export const sendQuotedReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    quotedMessageId: v.id("messages"), // Convex ID of the message being replied to
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new Error("NOT_FOUND");
    }

    const isAdminOrSupervisor =
      orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (
      !isAdminOrSupervisor &&
      conversation.assignedAgentId !== callerId &&
      conversation.assignedAgentId !== undefined
    ) {
      throw new Error("FORBIDDEN");
    }

    // Validate the quoted message belongs to this conversation
    const quotedMsg = await ctx.db.get(args.quotedMessageId);
    if (!quotedMsg || quotedMsg.conversationId !== args.conversationId) {
      throw new Error("QUOTED_MESSAGE_NOT_FOUND");
    }

    // The quoted message must have a metaMessageId so Meta can show the context
    if (!quotedMsg.metaMessageId) {
      throw new Error("QUOTED_MESSAGE_HAS_NO_META_ID");
    }

    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      tenantId,
      direction: "outbound",
      content: args.content,
      contentType: "text",
      isInternalNote: false,
      authorId: callerId,
      status: "sending",
      timestamp: now,
      createdAt: now,
      quotedMessageId: args.quotedMessageId,
    });

    const channel = await ctx.db.get(conversation.channelId);
    const contact = await ctx.db.get(conversation.contactId);
    if (!channel || !contact) throw new Error("CHANNEL_OR_CONTACT_NOT_FOUND");

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessagePreview: args.content.slice(0, 100),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.actions.sendWhatsAppMessage.sendQuotedMessage,
      {
        messageId,
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        content: args.content,
        quotedMetaMessageId: quotedMsg.metaMessageId,
        tenantId,
      },
    );

    return messageId;
  },
});
```

- [ ] **Step 4: Add `deleteMessage` mutation**

```typescript
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId, orgRole } = await getCallerIdentity(ctx);

    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== tenantId) throw new Error("NOT_FOUND");

    // Only the author can delete their own message; admins/supervisors can delete any
    const isAdminOrSupervisor =
      orgRole === "org:admin" || orgRole === "admin" || orgRole === "org:supervisor";
    if (!isAdminOrSupervisor && msg.authorId !== callerId) {
      throw new Error("FORBIDDEN");
    }

    // Can only delete outbound, non-internal-note messages
    if (msg.direction !== "outbound" || msg.isInternalNote) {
      throw new Error("CANNOT_DELETE_THIS_MESSAGE");
    }

    // Must have a metaMessageId to delete on Meta
    if (!msg.metaMessageId) {
      throw new Error("NO_META_MESSAGE_ID");
    }

    const conversation = await ctx.db.get(msg.conversationId);
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    const channel = await ctx.db.get(conversation.channelId);
    if (!channel) throw new Error("CHANNEL_NOT_FOUND");

    // Optimistically mark deleted in DB immediately
    await ctx.db.patch(args.messageId, { deletedAt: Date.now() });

    // Fire Meta delete API (best-effort — silent failure if past window)
    await ctx.scheduler.runAfter(
      0,
      internal.actions.sendWhatsAppMessage.deleteWhatsAppMessage,
      {
        messageId: args.messageId,
        phoneNumberId: channel.phoneNumberId,
        metaMessageId: msg.metaMessageId,
        tenantId,
      },
    );
  },
});
```

- [ ] **Step 5: Add `reactToMessage` mutation**

```typescript
export const reactToMessage = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId, callerId } = await getCallerIdentity(ctx);

    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.tenantId !== tenantId) throw new Error("NOT_FOUND");

    if (!msg.metaMessageId) throw new Error("NO_META_MESSAGE_ID");

    const conversation = await ctx.db.get(msg.conversationId);
    if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");
    const channel = await ctx.db.get(conversation.channelId);
    const contact = await ctx.db.get(conversation.contactId);
    if (!channel || !contact) throw new Error("CHANNEL_OR_CONTACT_NOT_FOUND");

    // Update reactions array in DB — one reaction per reactorId per message
    const existing = msg.reactions ?? [];
    const alreadyReacted = existing.findIndex((r) => r.reactorId === callerId);

    let updatedReactions;
    if (alreadyReacted !== -1 && existing[alreadyReacted].emoji === args.emoji) {
      // Same emoji clicked again = remove reaction (toggle off)
      updatedReactions = existing.filter((r) => r.reactorId !== callerId);
    } else if (alreadyReacted !== -1) {
      // Different emoji = replace
      updatedReactions = existing.map((r) =>
        r.reactorId === callerId ? { emoji: args.emoji, reactorId: callerId } : r,
      );
    } else {
      // New reaction
      updatedReactions = [...existing, { emoji: args.emoji, reactorId: callerId }];
    }

    await ctx.db.patch(args.messageId, { reactions: updatedReactions });

    // Fire Meta reaction API
    await ctx.scheduler.runAfter(
      0,
      internal.actions.sendWhatsAppMessage.sendReaction,
      {
        phoneNumberId: channel.phoneNumberId,
        contactPhone: contact.phone,
        metaMessageId: msg.metaMessageId,
        emoji: args.emoji,
        tenantId,
      },
    );
  },
});
```

- [ ] **Step 6: Run type-check and push**

```bash
npx tsc --noEmit
npx convex dev --once
```

Expected: No TypeScript errors; Convex deploys successfully.

- [ ] **Step 7: Commit**

```bash
git add convex/messages.ts
git commit -m "feat(messages): add sendQuotedReply, deleteMessage, reactToMessage mutations"
```

---

## Task 4: Handle incoming reaction webhooks from customers

When a customer reacts to a message in WhatsApp, Meta sends a webhook event. WaDesk must store that reaction in the DB.

**Files:**
- Modify: `convex/http.ts` (find the webhook message handler section)

- [ ] **Step 1: Understand the webhook payload shape**

Meta sends this JSON inside the webhook for a reaction:
```json
{
  "type": "reaction",
  "reaction": {
    "message_id": "wamid.xxx",
    "emoji": "👍"
  }
}
```

When `emoji` is empty string `""`, the customer removed their reaction.

- [ ] **Step 2: Add `handleIncomingReaction` internalMutation to `convex/messages.ts`**

```typescript
export const handleIncomingReaction = internalMutation({
  args: {
    tenantId: v.string(),
    metaMessageId: v.string(), // the message being reacted to
    reactorPhone: v.string(),
    emoji: v.string(), // empty string = remove reaction
  },
  handler: async (ctx, args) => {
    const msg = await ctx.db
      .query("messages")
      .withIndex("by_meta_message_id", (q) =>
        q.eq("metaMessageId", args.metaMessageId),
      )
      .first();
    if (!msg || msg.tenantId !== args.tenantId) return;

    const existing = msg.reactions ?? [];

    let updatedReactions;
    if (args.emoji === "") {
      // Remove reaction
      updatedReactions = existing.filter((r) => r.reactorId !== args.reactorPhone);
    } else {
      const alreadyReacted = existing.findIndex(
        (r) => r.reactorId === args.reactorPhone,
      );
      if (alreadyReacted !== -1) {
        updatedReactions = existing.map((r) =>
          r.reactorId === args.reactorPhone
            ? { emoji: args.emoji, reactorId: args.reactorPhone }
            : r,
        );
      } else {
        updatedReactions = [
          ...existing,
          { emoji: args.emoji, reactorId: args.reactorPhone },
        ];
      }
    }

    await ctx.db.patch(msg._id, { reactions: updatedReactions });
  },
});
```

- [ ] **Step 3: Wire it into `convex/http.ts`**

In `convex/http.ts`, find the section where incoming webhook messages are processed (look for the call to `internal.messages.createInbound`). In the same block that checks `message.type`, add a branch for `"reaction"`:

```typescript
// Inside the webhook handler, after existing message type checks:
if (message.type === "reaction") {
  const reaction = message.reaction as { message_id: string; emoji: string } | undefined;
  if (reaction) {
    await ctx.runMutation(internal.messages.handleIncomingReaction, {
      tenantId,
      metaMessageId: reaction.message_id,
      reactorPhone: from, // the customer's phone number
      emoji: reaction.emoji ?? "",
    });
  }
  return; // Don't create a new message document for reactions
}
```

Place this **before** the existing `createInbound` call so reactions short-circuit early.

- [ ] **Step 4: Commit**

```bash
git add convex/messages.ts convex/http.ts
git commit -m "feat(webhook): handle incoming customer reactions from Meta webhook"
```

---

## Task 5: UI — `MessageActionMenu` component

This is the hover menu that appears on each message bubble to expose Reply, React, and Delete actions.

**Files:**
- Create: `components/inbox/message-action-menu.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState, useRef } from "react";
import { ReplyIcon, SmileIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/context";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

interface MessageActionMenuProps {
  messageId: string;
  isOutbound: boolean;
  canDelete: boolean; // true only if outbound + has metaMessageId + within 60s
  onReply: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
}

export function MessageActionMenu({
  isOutbound,
  canDelete,
  onReply,
  onDelete,
  onReact,
}: MessageActionMenuProps) {
  const t = useT();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`absolute top-1 flex items-center gap-0.5 bg-background border rounded-lg shadow-sm px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
        isOutbound ? "end-full me-1" : "start-full ms-1"
      }`}
    >
      {/* Reply */}
      <Button
        variant="ghost"
        size="icon"
        className="size-6"
        title={t("Reply", "رد")}
        onClick={onReply}
      >
        <ReplyIcon className="size-3.5" />
      </Button>

      {/* React */}
      <div className="relative" ref={pickerRef}>
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          title={t("React", "تفاعل")}
          onClick={() => setShowEmojiPicker((v) => !v)}
        >
          <SmileIcon className="size-3.5" />
        </Button>
        {showEmojiPicker && (
          <div
            className={`absolute bottom-full mb-1 flex gap-1 bg-background border rounded-lg shadow-md p-1.5 ${
              isOutbound ? "end-0" : "start-0"
            }`}
          >
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="text-base hover:scale-125 transition-transform"
                onClick={() => {
                  onReact(emoji);
                  setShowEmojiPicker(false);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Delete — only for deletable outbound messages */}
      {canDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="size-6 text-destructive hover:text-destructive"
          title={t("Delete", "حذف")}
          onClick={onDelete}
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/inbox/message-action-menu.tsx
git commit -m "feat(ui): add MessageActionMenu hover component for reply/react/delete"
```

---

## Task 6: UI — `ReplyContextBanner` component

Shown inside `MessageInput` above the textarea when replying to a specific message.

**Files:**
- Create: `components/inbox/reply-context-banner.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { XIcon } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ReplyContextBannerProps {
  quotedContent: string;         // preview text of the quoted message
  quotedAuthor: string;          // "You" or customer name
  onClear: () => void;
}

export function ReplyContextBanner({
  quotedContent,
  quotedAuthor,
  onClear,
}: ReplyContextBannerProps) {
  const t = useT();

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-muted border-s-4 border-primary rounded-e-lg text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary text-xs mb-0.5">
          {t("Replying to", "رد على")} {quotedAuthor}
        </p>
        <p className="text-muted-foreground truncate">{quotedContent}</p>
      </div>
      <button
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
        aria-label={t("Cancel reply", "إلغاء الرد")}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/inbox/reply-context-banner.tsx
git commit -m "feat(ui): add ReplyContextBanner component for quoted reply preview"
```

---

## Task 7: Update `MessageBubble` — add quoted preview, deleted state, reaction badges, hover menu

**Files:**
- Modify: `components/inbox/message-bubble.tsx`

- [ ] **Step 1: Update the `Message` type and imports**

Replace the existing `Message` type definition (lines 49–59) with:

```typescript
type Reaction = {
  emoji: string;
  reactorId: string;
};

type Message = {
  _id: string;
  direction: "inbound" | "outbound";
  content: string;
  contentType: "text" | "image" | "document" | "unsupported" | "audio" | "video" | "sticker" | "location" | "template";
  isInternalNote: boolean;
  authorId: string | undefined;
  mediaUrl?: string;
  status: "sent" | "delivered" | "read" | "failed" | "sending";
  timestamp: number;
  metaMessageId?: string;
  quotedMessageId?: string;
  deletedAt?: number;
  reactions?: Reaction[];
};
```

Add these imports to the top of the file (alongside existing ones):

```typescript
import { MessageActionMenu } from "./message-action-menu";
import { ReplyIcon } from "lucide-react";
```

- [ ] **Step 2: Update `MessageBubble` props**

Change the component signature from:

```typescript
export function MessageBubble({ message }: { message: Message }) {
```

to:

```typescript
export function MessageBubble({
  message,
  quotedMessage,
  onReply,
  onDelete,
  onReact,
  currentUserId,
}: {
  message: Message;
  quotedMessage?: Message | null;
  onReply: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  currentUserId?: string;
}) {
```

- [ ] **Step 3: Add `canDelete` calculation and deleted state inside the component body**

After the `timeStr` calculation, add:

```typescript
// Delete is available for outbound messages that have a metaMessageId and were sent within ~55 seconds
const canDelete =
  !message.isInternalNote &&
  message.direction === "outbound" &&
  !!message.metaMessageId &&
  Date.now() - message.timestamp < 55_000;

// Soft-deleted message
if (message.deletedAt) {
  return (
    <div className={message.direction === "inbound" ? "flex justify-start" : "flex justify-end"}>
      <div className={`max-w-[75%] rounded-lg p-3 ${message.direction === "inbound" ? "bg-muted" : "bg-green-100 dark:bg-green-900"} opacity-50 italic`}>
        <div className="text-sm text-muted-foreground flex items-center gap-1">
          <Trash2Icon className="size-3" />
          {t(message.direction === "outbound" ? "You deleted this message" : "This message was deleted", message.direction === "outbound" ? "حذفت هذه الرسالة" : "تم حذف هذه الرسالة")}
        </div>
        <div className="text-xs text-muted-foreground mt-1 text-start">{timeStr}</div>
      </div>
    </div>
  );
}
```

Also add `Trash2Icon` to the lucide-react imports at the top.

- [ ] **Step 4: Add a `QuotedMessagePreview` sub-component**

Add this function inside the file, before `MessageBubble`:

```typescript
function QuotedMessagePreview({ quoted, isOutbound }: { quoted: Message; isOutbound: boolean }) {
  const t = useT();
  const preview = quoted.deletedAt
    ? t("Deleted message", "رسالة محذوفة")
    : quoted.contentType === "image"
    ? t("📷 Photo", "📷 صورة")
    : quoted.contentType === "audio"
    ? t("🎵 Audio", "🎵 صوت")
    : quoted.contentType === "document"
    ? t("📄 Document", "📄 مستند")
    : quoted.content.slice(0, 80);

  return (
    <div
      className={`rounded px-2 py-1 mb-1 text-xs border-s-2 ${
        isOutbound
          ? "bg-green-50 dark:bg-green-950 border-green-400"
          : "bg-gray-100 dark:bg-gray-800 border-gray-400"
      }`}
    >
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        <ReplyIcon className="size-3" />
        <span>{quoted.direction === "outbound" ? t("You", "أنت") : t("Customer", "العميل")}</span>
      </div>
      <p className="truncate text-muted-foreground">{preview}</p>
    </div>
  );
}
```

- [ ] **Step 5: Add `ReactionBadges` sub-component**

```typescript
function ReactionBadges({
  reactions,
  messageId,
  onReact,
}: {
  reactions: Reaction[];
  messageId: string;
  onReact: (messageId: string, emoji: string) => void;
}) {
  // Group by emoji
  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <button
          key={emoji}
          onClick={() => onReact(messageId, emoji)}
          className="flex items-center gap-0.5 text-xs bg-muted hover:bg-muted/80 rounded-full px-1.5 py-0.5 border"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground">{count}</span>}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Wrap the default text bubble with group hover + action menu + quoted preview + reactions**

Find the final `return` block in `MessageBubble` (the `// Default: text / template` section at line ~241). Replace it with:

```tsx
// Default: text / template
return (
  <div className={`relative group ${isInbound ? "flex justify-start" : "flex justify-end"}`}>
    <MessageActionMenu
      messageId={message._id}
      isOutbound={!isInbound}
      canDelete={canDelete}
      onReply={() => onReply(message)}
      onDelete={() => onDelete(message._id)}
      onReact={(emoji) => onReact(message._id, emoji)}
    />
    <div className={bubbleBase}>
      {/* Quoted message preview */}
      {quotedMessage && (
        <QuotedMessagePreview quoted={quotedMessage} isOutbound={!isInbound} />
      )}
      <div className="text-sm whitespace-pre-wrap">{message.content}</div>
      {timeRow}
      {/* Reaction badges */}
      {message.reactions && message.reactions.length > 0 && (
        <ReactionBadges
          reactions={message.reactions}
          messageId={message._id}
          onReact={onReact}
        />
      )}
    </div>
  </div>
);
```

> **Important:** The `MessageActionMenu` hover menu needs the parent div to have `position: relative` and the `group` class — that's already in the replacement above.

Do the same wrapping for the other content-type renders (image, video, audio, document, location) — add the `relative group` wrapper, `MessageActionMenu`, and `ReactionBadges` to each. The pattern is identical; just wrap the existing return JSX.

- [ ] **Step 7: Commit**

```bash
git add components/inbox/message-bubble.tsx
git commit -m "feat(ui): update MessageBubble with hover menu, quoted preview, deleted state, reaction badges"
```

---

## Task 8: Update `MessageInput` — accept and pass `replyTo` state

**Files:**
- Modify: `components/inbox/message-input.tsx`

- [ ] **Step 1: Add `replyTo` prop and import `ReplyContextBanner`**

Add import at top:
```typescript
import { ReplyContextBanner } from "./reply-context-banner";
```

Add `replyTo` and `onClearReply` to the props interface:

```typescript
export function MessageInput({
  conversationId,
  onQuickReplyOpen,
  quickReplyContent,
  onQuickReplyConsumed,
  replyTo,
  onClearReply,
}: {
  conversationId: string;
  onQuickReplyOpen?: () => void;
  quickReplyContent?: string;
  onQuickReplyConsumed?: () => void;
  replyTo?: { messageId: string; content: string; authorLabel: string } | null;
  onClearReply?: () => void;
}) {
```

- [ ] **Step 2: Add `sendQuotedReply` mutation**

```typescript
const sendQuotedReply = useMutation(api.messages.sendQuotedReply);
```

- [ ] **Step 3: Update `handleSubmit` to use quoted reply when `replyTo` is set**

Replace the `sendMessage` call inside `handleSubmit`:

```typescript
try {
  if (replyTo) {
    await sendQuotedReply({
      conversationId: conversationId as Id<"conversations">,
      content: trimmed,
      quotedMessageId: replyTo.messageId as Id<"messages">,
    });
    onClearReply?.();
  } else {
    await sendMessage({
      conversationId: conversationId as Id<"conversations">,
      content: trimmed,
      type: isNote ? "note" : "reply",
    });
  }
} catch {
  setContent(trimmed);
  toast.error(
    isNote
      ? t("Failed to add note", "فشل إضافة الملاحظة")
      : t("Failed to send message", "فشل إرسال الرسالة"),
  );
}
```

- [ ] **Step 4: Render `ReplyContextBanner` above the textarea**

Inside the returned JSX, right before the `<Textarea>` element, add:

```tsx
{/* Reply context banner */}
{replyTo && (
  <ReplyContextBanner
    quotedContent={replyTo.content}
    quotedAuthor={replyTo.authorLabel}
    onClear={() => onClearReply?.()}
  />
)}
```

- [ ] **Step 5: Commit**

```bash
git add components/inbox/message-input.tsx
git commit -m "feat(ui): wire replyTo prop into MessageInput with ReplyContextBanner and sendQuotedReply"
```

---

## Task 9: Update `ConversationThread` — wire everything together

**Files:**
- Modify: `components/inbox/conversation-thread.tsx`

- [ ] **Step 1: Add state and mutations for reply/delete/react**

Add imports at top:
```typescript
import { useMutation } from "convex/react";
import { useState } from "react";
```

Inside the `ConversationThread` component body, add:

```typescript
const deleteMessage = useMutation(api.messages.deleteMessage);
const reactToMessage = useMutation(api.messages.reactToMessage);

type ReplyTo = {
  messageId: string;
  content: string;
  authorLabel: string;
} | null;

const [replyTo, setReplyTo] = useState<ReplyTo>(null);
```

- [ ] **Step 2: Build a `messagesById` lookup for quoted message previews**

After `rawMessages` is fetched:

```typescript
const messagesById = new Map(
  (rawMessages ?? []).map((m) => [m._id, m]),
);
```

- [ ] **Step 3: Pass handlers to `MessageBubble`**

In the JSX where `MessageBubble` is rendered, update it:

```tsx
<MessageBubble
  key={msg._id}
  message={msg as any}
  quotedMessage={msg.quotedMessageId ? (messagesById.get(msg.quotedMessageId) as any ?? null) : null}
  onReply={(m) =>
    setReplyTo({
      messageId: m._id,
      content: m.content.slice(0, 100),
      authorLabel: m.direction === "outbound" ? t("You", "أنت") : t("Customer", "العميل"),
    })
  }
  onDelete={async (messageId) => {
    try {
      await deleteMessage({ messageId: messageId as Id<"messages"> });
    } catch {
      toast.error(t("Failed to delete message", "فشل حذف الرسالة"));
    }
  }}
  onReact={async (messageId, emoji) => {
    try {
      await reactToMessage({ messageId: messageId as Id<"messages">, emoji });
    } catch {
      toast.error(t("Failed to react", "فشل التفاعل"));
    }
  }}
/>
```

You'll need `toast` from `"sonner"` and `useT` — add to imports if not already present.

- [ ] **Step 4: Pass `replyTo` to `MessageInput`**

Find where `MessageInput` is rendered in `ConversationThread` (or in the parent page — trace from `conversation-thread.tsx`). Pass:

```tsx
<MessageInput
  conversationId={conversationId}
  // ...existing props...
  replyTo={replyTo}
  onClearReply={() => setReplyTo(null)}
/>
```

- [ ] **Step 5: Run type-check**

```bash
npx tsc --noEmit
```

Fix any TypeScript errors (most likely around the `message as any` casts — ideally replace with proper typed queries that include the new fields).

- [ ] **Step 6: Commit**

```bash
git add components/inbox/conversation-thread.tsx
git commit -m "feat(ui): wire reply/delete/react handlers in ConversationThread"
```

---

## Task 10: Expose new mutations via `convex/inbox.ts` (or api surface)

The `sendQuotedReply`, `deleteMessage`, `reactToMessage` mutations were added directly to `convex/messages.ts`. Verify they are accessible from the client via `api.messages.*`. If the project uses a `convex/inbox.ts` wrapper, also re-export or add thin wrappers there.

**Files:**
- Check: `convex/inbox.ts` (if it exists — run `ls convex/inbox.ts`)

- [ ] **Step 1: Check if `convex/inbox.ts` re-exports messages functions**

```bash
grep -n "sendReply\|sendQuotedReply" convex/inbox.ts
```

If `inbox.ts` wraps `messages.ts` functions (it currently wraps `sendReply` as `sendMessage`), add equivalent wrappers:

```typescript
// In convex/inbox.ts, add alongside existing sendMessage:
export const sendQuotedReply = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    quotedMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation(internal.messages.sendQuotedReply, args);
  },
});
```

Or simply import directly in the UI from `api.messages.sendQuotedReply` — whichever matches the existing pattern in the codebase.

- [ ] **Step 2: Verify `api.messages.deleteMessage` and `api.messages.reactToMessage` are accessible**

```bash
grep -r "api.messages\." components/inbox/ | head -20
```

Ensure the UI components reference the correct API paths.

- [ ] **Step 3: Final type-check and dev run**

```bash
npx tsc --noEmit
npx convex dev --once
```

Expected: Zero errors.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: complete WhatsApp message interactions — quoted reply, delete, emoji reactions"
```

---

## Known Limitations & Notes for the Implementer

| Concern | Detail |
|---|---|
| Delete window | Meta only allows deletion within ~60 seconds of sending. The UI hides the Delete button after this window. Because `canDelete` is computed client-side from `message.timestamp`, there's a race between the UI rendering and the actual window closing — this is acceptable UX. |
| `metaMessageId` on quoted messages | Only messages that have been sent to Meta and received back a `wamid` can be quoted. Optimistic messages (with `status: "sending"`) won't have a `metaMessageId` yet — the Reply button should be disabled or not shown for messages in `"sending"` status. |
| Quoted replies for inbound messages | Customers' inbound messages always have `metaMessageId` (set during `createInbound`). Quoting them works immediately. |
| Reactions on internal notes | Internal notes never leave WaDesk and have no `metaMessageId`. The React button should be hidden for `isInternalNote: true` messages. |
| Action menu on all content types | Task 7 Step 6 says to apply the same wrapper to image/video/audio/document/location bubbles. Don't skip this — agents will want to reply to image messages too. |
| RTL layout | The `MessageActionMenu` uses `end-full me-1` / `start-full ms-1` for RTL-safe positioning. Do not use `left-`/`right-` — follow the project's RTL rules. |
