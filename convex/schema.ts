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
    orgName: v.optional(v.string()),
    createdAt: v.number(),
    paddle_customer_id: v.optional(v.string()),
    paddle_subscription_id: v.optional(v.string()),
    plan_activated_at: v.optional(v.number()),
  })
    .index("by_tenantId", ["tenantId"]),

  channels: defineTable({
    tenantId: v.string(),
    phoneNumberId: v.string(),
    displayPhone: v.optional(v.string()),      // E.164 display number
    displayName: v.string(),
    wabaId: v.string(),
    accessToken: v.optional(v.string()),       // AES-256-GCM encrypted
    tokenEncryptedAt: v.optional(v.number()),
    assignmentMode: v.union(
      v.literal("first_reply"),
      v.literal("manual"),
      v.literal("round_robin"),
    ),
    roundRobinIndex: v.number(),
    // isActive kept optional for backward compat with existing docs
    isActive: v.optional(v.boolean()),
    status: v.optional(v.union(
      v.literal("connecting"),
      v.literal("active"),
      v.literal("disconnected"),
      v.literal("reconnect_required"),
    )),
    connectedAt: v.optional(v.number()),
    disconnectedAt: v.optional(v.number()),
    deactivationWarningsSent: v.optional(v.array(v.number())),
    slaThresholdMinutes: v.optional(v.number()),
    slaEnabled: v.optional(v.boolean()),
    pendingDisplayName: v.optional(v.string()),
    displayNameStatus: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    displayNameSubmittedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_phone", ["tenantId", "phoneNumberId"])
    .index("by_phone_number_id", ["phoneNumberId"])
    .index("by_waba_id", ["wabaId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_sla_configured", ["slaEnabled"]),

  contacts: defineTable({
    tenantId: v.string(),
    phone: v.string(),
    displayName: v.string(),
    customName: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    source: v.union(v.literal("auto"), v.literal("manual"), v.literal("import")),
    isArchived: v.boolean(),
    firstSeenAt: v.number(),
    lastSeenAt: v.number(),
    assignedAgentId: v.optional(v.string()),
    country: v.optional(v.string()),
    city: v.optional(v.string()),
    spent: v.optional(v.number()),
    spentCurrency: v.optional(v.string()),
    category: v.optional(v.string()),
    createdAt: v.number(),
    stage: v.optional(v.union(
      v.literal("lead"),
      v.literal("prospect"),
      v.literal("customer"),
      v.literal("retained"),
      v.literal("churned"),
    )),
    stageUpdatedAt: v.optional(v.number()),
    stageUpdatedBy: v.optional(v.string()),
    totalConversations: v.optional(v.number()),
    wabaId: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_phone", ["tenantId", "phone"])
    .index("by_tenant_archived", ["tenantId", "isArchived"])
    .index("by_tenant_stage", ["tenantId", "stage"])
    .index("by_tenant_assigned", ["tenantId", "assignedAgentId"])
    .index("by_org_department", ["tenantId", "departmentId"])
    .searchIndex("search_by_name", {
      searchField: "displayName",
      filterFields: ["tenantId"],
    }),

  contactLists: defineTable({
    tenantId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    filters: v.object({
      countries: v.optional(v.array(v.string())),
      cities: v.optional(v.array(v.string())),
      stages: v.optional(v.array(v.union(
        v.literal("lead"),
        v.literal("prospect"),
        v.literal("customer"),
        v.literal("retained"),
        v.literal("churned"),
      ))),
      tags: v.optional(v.array(v.string())),
    }),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),

  broadcasts: defineTable({
    tenantId: v.string(),
    name: v.string(),
    listId: v.id("contactLists"),
    channelId: v.id("channels"),
    templateName: v.string(),
    templateLanguage: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("failed"),
    ),
    recipientSnapshot: v.array(v.object({
      contactId: v.id("contacts"),
      phone: v.string(),
      name: v.optional(v.string()),
    })),
    recipientCount: v.number(),
    sentCount: v.optional(v.number()),
    failedCount: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    retryMap: v.optional(v.record(v.string(), v.number())),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"]),

  conversations: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),
    contactId: v.id("contacts"),
    assignedAgentId: v.optional(v.string()),
    assignedAt: v.optional(v.number()),
    assignmentType: v.optional(v.union(
      v.literal("round_robin"),
      v.literal("manual"),
      v.literal("unassigned"),
    )),
    previousAgentId: v.optional(v.string()),
    departmentId: v.optional(v.id("departments")),
    departmentAssignedAt: v.optional(v.number()),
    departmentAssignedBy: v.optional(v.string()),
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
    lastInboundAt: v.optional(v.number()),
    slaBreachedAt: v.optional(v.number()),
    mergedInto: v.optional(v.id("conversations")),
    mergedAt: v.optional(v.number()),
    totalMergedCount: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_tenant_agent", ["tenantId", "assignedAgentId"])
    .index("by_tenant_channel", ["tenantId", "channelId"])
    .index("by_last_message", ["tenantId", "lastMessageAt"])
    .index("by_contact", ["contactId"])
    .index("by_tenant_department", ["tenantId", "departmentId"])
    .searchIndex("search_preview", {
      searchField: "lastMessagePreview",
      filterFields: ["tenantId"],
    }),

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
    failureReason: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("sending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("read"),
      v.literal("failed"),
    ),
    scheduledAt: v.optional(v.number()),
    timestamp: v.number(),
    createdAt: v.number(),
    quotedMessageId: v.optional(v.id("messages")),
    deletedAt: v.optional(v.number()),
    reactions: v.optional(v.array(v.object({
      emoji: v.string(),
      reactorId: v.string(),
    }))),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_tenant", ["tenantId"])
    .index("by_meta_message_id", ["metaMessageId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["tenantId"],
    }),

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
    label: v.optional(v.string()),
    createdBy: v.string(),
    expiresAt: v.number(),
    revoked: v.boolean(),
    defaultRole: v.union(v.literal("org:agent"), v.literal("org:supervisor")),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_token", ["token"]),

  customFields: defineTable({
    tenantId: v.string(),
    contactId: v.id("contacts"),
    key: v.string(),
    value: v.string(),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId"])
    .index("by_tenant", ["tenantId"]),

  followUps: defineTable({
    tenantId: v.string(),
    contactId: v.id("contacts"),
    channelId: v.id("channels"),
    phoneNumber: v.string(),
    scheduledAt: v.number(),
    note: v.optional(v.string()),
    whatsappMessage: v.string(),
    expectedRevenue: v.optional(v.number()),
    currency: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("failed"),
      v.literal("cancelled"),
    ),
    attemptCount: v.number(),
    createdBy: v.string(),
    assignedTo: v.optional(v.string()),
    notifiedAt: v.optional(v.number()),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_tenant_status", ["tenantId", "status"])
    .index("by_contact", ["contactId"])
    .index("by_scheduled", ["scheduledAt"]),

  contactEvents: defineTable({
    tenantId: v.string(),
    contactId: v.id("contacts"),
    type: v.union(
      v.literal("stage_changed"),
      v.literal("assigned"),
      v.literal("note_updated"),
      v.literal("tags_changed"),
      v.literal("followup_scheduled"),
      v.literal("followup_sent"),
      v.literal("followup_failed"),
      v.literal("conversation_started"),
      v.literal("conversation_resolved"),
      v.literal("lost"),
    ),
    actorId: v.optional(v.string()),
    metadata: v.any(),
    createdAt: v.number(),
  })
    .index("by_contact", ["contactId", "createdAt"])
    .index("by_tenant", ["tenantId"]),

  notifications: defineTable({
    tenantId: v.string(),
    userId: v.string(),
    type: v.union(
      v.literal("followup_due"),
      v.literal("sla_breach"),
      v.literal("template_approved"),
      v.literal("template_rejected"),
      v.literal("channel_expiring_soon"),
      v.literal("channel_deleted"),
      v.literal("agent_welcome"),
      v.literal("billing_payment_failed"),
      v.literal("billing_subscription_expired"),
    ),
    referenceId: v.string(),
    contactName: v.optional(v.string()),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["tenantId", "userId", "read"])
    .index("by_user_type", ["tenantId", "userId", "type"]),

  metaTemplates: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),
    wabaId: v.string(),
    name: v.string(),
    language: v.string(),
    status: v.string(), // "APPROVED" | "PENDING" | "REJECTED" | "PAUSED"
    category: v.optional(v.string()),
    components: v.any(),
    lastSyncedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_channel", ["channelId"])
    .index("by_waba_name_lang", ["wabaId", "name", "language"]),

  onboardingState: defineTable({
    tenantId: v.string(),
    completedSteps: v.array(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"]),

  conversationMetrics: defineTable({
    tenantId: v.string(),
    conversationId: v.id("conversations"),
    channelId: v.id("channels"),
    assignedAgentId: v.optional(v.string()),
    agentName: v.optional(v.string()),
    createdAt: v.number(),
    firstResponseAt: v.optional(v.number()),
    firstResponseTimeSeconds: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
    messageCount: v.number(),
    csatSentAt: v.optional(v.number()),         // timestamp when CSAT message was sent
    csatScore: v.optional(v.number()),           // 1–5, set when customer replies
    csatRespondedAt: v.optional(v.number()),     // timestamp of customer reply
  })
    .index("by_tenant_created", ["tenantId", "createdAt"])
    .index("by_tenant_agent", ["tenantId", "assignedAgentId"])
    .index("by_conversation", ["conversationId"]),

  automationRules: defineTable({
    tenantId: v.string(),
    name: v.string(),
    enabled: v.boolean(),
    priority: v.number(),
    triggerType: v.union(
      v.literal("keyword"),
      v.literal("outside_hours"),
      v.literal("first_message"),
      v.literal("no_reply_timeout"),
    ),
    keywordList: v.optional(v.array(v.string())),
    timeoutMinutes: v.optional(v.number()),
    responseTemplate: v.string(),
    senderName: v.optional(v.string()),
    mediaUrl: v.optional(v.string()),
    mediaType: v.optional(v.union(
      v.literal("image"),
      v.literal("video"),
      v.literal("document"),
    )),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_enabled", ["tenantId", "enabled"])
    .index("by_tenant_priority", ["tenantId", "priority"]),

  businessHours: defineTable({
    tenantId: v.string(),
    timezone: v.string(),
    schedule: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),

  ruleFireLog: defineTable({
    tenantId: v.string(),
    ruleId: v.id("automationRules"),
    conversationId: v.id("conversations"),
    firedAt: v.number(),
    triggerType: v.string(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_rule_conversation", ["ruleId", "conversationId"])
    .index("by_conversation", ["conversationId"]),

  conversationLabels: defineTable({
    tenantId: v.string(),
    name: v.string(),
    color: v.string(),
    emoji: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),

  channelMembers: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),
    userId: v.string(),
    userName: v.string(),
    userEmail: v.string(),
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
    addedBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_channel", ["channelId"])
    .index("by_tenant", ["tenantId"])
    .index("by_channel_user", ["channelId", "userId"])
    .index("by_tenant_user", ["tenantId", "userId"]),

  csatSettings: defineTable({
    tenantId: v.string(),
    enabled: v.boolean(),
    delayMinutes: v.number(),          // how many minutes after resolve to send (default: 5)
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"]),

  messageTemplates: defineTable({
    tenantId: v.string(),
    title: v.string(),
    body: v.string(),
    category: v.optional(v.string()),
    language: v.union(v.literal("ar"), v.literal("en")),
    variables: v.array(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_category", ["tenantId", "category"]),

  broadcastTemplates: defineTable({
    tenantId: v.string(),
    channelId: v.id("channels"),

    // Meta identity
    name: v.string(),
    title: v.string(),
    language: v.string(),
    category: v.union(v.literal("MARKETING"), v.literal("UTILITY")),

    // Header
    headerType: v.union(
      v.literal("NONE"),
      v.literal("TEXT"),
      v.literal("IMAGE"),
      v.literal("VIDEO"),
      v.literal("DOCUMENT"),
    ),
    headerText: v.optional(v.string()),
    headerMediaUrl: v.optional(v.string()),

    // Body
    body: v.string(),
    variables: v.array(v.string()),

    // Footer
    footer: v.optional(v.string()),

    // Buttons
    buttons: v.optional(v.array(v.object({
      type: v.union(v.literal("URL"), v.literal("PHONE_NUMBER"), v.literal("QUICK_REPLY")),
      text: v.string(),
      value: v.string(),
      isDynamic: v.optional(v.boolean()),
    }))),

    // Meta approval lifecycle
    metaStatus: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("paused"),
    ),
    metaTemplateId: v.optional(v.string()),
    metaRejectionReason: v.optional(v.string()),
    metaSubmittedAt: v.optional(v.number()),

    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_channel", ["channelId"])
    .index("by_tenant_status", ["tenantId", "metaStatus"]),

  departments: defineTable({
    tenantId: v.string(),
    channelId: v.optional(v.id("channels")),
    name: v.string(),
    description: v.optional(v.string()),
    supervisors: v.optional(v.array(v.string())),
    createdBy: v.string(),
    createdAt: v.number(),
    nameAr: v.optional(v.string()),
    color: v.optional(v.string()),
    slug: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
    isArchived: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    assignmentMode: v.optional(v.union(
      v.literal("first_reply"),
      v.literal("manual"),
      v.literal("round_robin"),
    )),
    roundRobinIndex: v.optional(v.number()),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_channel", ["channelId"])
    .index("by_channel_default", ["channelId", "isDefault"])
    .index("by_tenant_channel", ["tenantId", "channelId"]),

  departmentMembers: defineTable({
    tenantId: v.string(),
    departmentId: v.id("departments"),
    userId: v.string(),
    userName: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userImageUrl: v.optional(v.string()),
    role: v.union(v.literal("org:supervisor"), v.literal("org:agent")),
    addedBy: v.string(),
    addedAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index("by_department", ["departmentId"])
    .index("by_tenant", ["tenantId"])
    .index("by_department_user", ["departmentId", "userId"])
    .index("by_tenant_user", ["tenantId", "userId"]),

  webhook_events: defineTable({
    tenantId: v.optional(v.string()),
    wabaId: v.string(),
    eventType: v.string(),
    payload: v.any(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_waba_id", ["wabaId"])
    .index("by_tenant", ["tenantId"]),

  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    windowStart: v.number(),
  })
    .index("by_key", ["key"]),

  presence: defineTable({
    userId: v.string(),
    tenantId: v.string(),
    status: v.union(v.literal("online"), v.literal("away"), v.literal("offline")),
    lastSeenAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_tenant_user", ["tenantId", "userId"]),

  memberActionLog: defineTable({
    tenantId: v.string(),
    memberId: v.string(),
    action: v.string(),
    details: v.object({
      conversationId: v.optional(v.string()),
      contactPhone: v.optional(v.string()),
      targetMemberId: v.optional(v.string()),
      targetRole: v.optional(v.string()),
      changedFields: v.optional(v.object({
        email: v.optional(v.boolean()),
        phone: v.optional(v.boolean()),
        jobTitle: v.optional(v.boolean()),
        channel: v.optional(v.object({ added: v.array(v.string()), removed: v.array(v.string()) })),
        department: v.optional(v.object({ added: v.array(v.string()), removed: v.array(v.string()) })),
      })),
      metadata: v.optional(v.any()),
    }),
    timestamp: v.number(),
  })
    .index("by_tenant", ["tenantId"])
    .index("by_tenant_member", ["tenantId", "memberId"])
    .index("by_tenant_timestamp", ["tenantId", "timestamp"]),

  notificationPreferences: defineTable({
    userId: v.string(),
    tenantId: v.string(),
    emailEnabled: v.boolean(),
    emailSlabreach: v.boolean(),
    emailFollowup: v.boolean(),
    emailNewAssignment: v.boolean(),
    emailCsatAlert: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_tenant_user", ["tenantId", "userId"]),

  memberProfiles: defineTable({
    tenantId: v.string(),
    userId: v.string(),
    phone: v.optional(v.string()),
    jobTitle: v.optional(v.string()),
    bio: v.optional(v.string()),
    customFields: v.optional(v.object({})),
    updatedAt: v.number(),
  })
    .index("by_tenant_user", ["tenantId", "userId"]),
});
