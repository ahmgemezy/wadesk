import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tenants: defineTable({
    tenantId: v.string(),
    plan: v.union(
      v.literal("free"),
      v.literal("starter"),
      v.literal("growth"),
      v.literal("business"),
    ),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"]),

  channels: defineTable({
    tenantId: v.string(),
    phoneNumberId: v.string(),
    displayName: v.string(),
    wabaId: v.string(),
    assignmentMode: v.union(
      v.literal("first_reply"),
      v.literal("manual"),
      v.literal("round_robin"),
    ),
    roundRobinIndex: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_phone", ["tenantId", "phoneNumberId"])
    .index("by_phone_number_id", ["phoneNumberId"]),

  contacts: defineTable({
    tenantId: v.string(),
    phone: v.string(),
    displayName: v.string(),
    customName: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    source: v.union(v.literal("auto"), v.literal("manual"), v.literal("import")),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    assignedAgentId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_phone", ["tenantId", "phone"]),

  conversations: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),
    contactId: v.id("contacts"),
    assignedAgentId: v.optional(v.string()),
    status: v.union(
      v.literal("open"),
      v.literal("pending"),
      v.literal("resolved"),
    ),
    labels: v.array(v.string()),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    unreadCount: v.number(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_tenant_agent", ["tenantId", "assignedAgentId"])
    .index("by_tenant_channel", ["tenantId", "channelId"])
    .index("by_last_message", ["tenantId", "lastMessageAt"]),

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
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    timestamp: v.number(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_tenant", ["tenantId"])
    .index("by_meta_message_id", ["metaMessageId"]),

  quickReplies: defineTable({
    tenantId: v.string(),
    title: v.string(),
    content: v.string(),
    usageCount: v.number(),
    category: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_category", ["tenantId", "category"]),

  inviteLinks: defineTable({
    tenantId: v.string(),
    token: v.string(),
    createdBy: v.string(),
    expiresAt: v.number(),
    revoked: v.boolean(),
    defaultRole: v.literal("org:agent"),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_token", ["token"]),
});
