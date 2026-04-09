import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCallerIdentity } from "./lib/auth";

export const populateMocks = internalMutation({
  args: {
    tenantId: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Attempt to resolve context auth if tenantId isn't passed explicitly
    let finalTenantId = args.tenantId;

    if (!finalTenantId) {
      try {
        const { tenantId } = await getCallerIdentity(ctx);
        finalTenantId = tenantId;
      } catch {
        const anyTenant = await ctx.db.query("tenants").first();
        const fallbackTenant = anyTenant ? anyTenant.tenantId : "org_2dfUXYW3x2Xv2qX2323"; 
        
        finalTenantId = fallbackTenant;
      }
    }

    // 1. Create a Fake Channel
    const channelId = await ctx.db.insert("channels", {
      tenantId: finalTenantId,
      phoneNumberId: "100" + Math.floor(Math.random() * 1000000).toString(),
      displayPhone: "+10000000000",
      displayName: "Mock Meta Business Channel",
      wabaId: "mock-waba-" + Math.random().toString(),
      assignmentMode: "manual",
      roundRobinIndex: 0,
      isActive: true,
      status: "active",
      createdAt: Date.now(),
    });

    const stages = ["lead", "prospect", "customer", "retained", "churned"] as const;
    const names = ["Ahmed Hassan", "Omar Fathi", "Youssef Zaki", "Sarah Kareem", "Ali Hosni"];

    // 2. Create Fake Contacts & Conversations
    for (let i = 0; i < names.length; i++) {
      const contactId = await ctx.db.insert("contacts", {
        tenantId: finalTenantId,
        phone: "+2010" + Math.floor(1000000 + Math.random() * 9000000).toString(),
        displayName: names[i],
        customName: names[i],
        tags: ["mock", "demo"],
        source: "auto",
        isArchived: false,
        firstSeenAt: Date.now() - Math.random() * 86400000 * 10,
        lastSeenAt: Date.now(),
        stage: stages[i],
        totalConversations: 1,
        createdAt: Date.now(),
      });

      const conversationId = await ctx.db.insert("conversations", {
        tenantId: finalTenantId,
        channelId: channelId,
        contactId: contactId,
        status: i % 2 === 0 ? "open" : "resolved",
        labels: [],
        lastMessageAt: Date.now() - Math.random() * 3600000,
        lastMessagePreview: "Hello! This is a mock message.",
        unreadCount: i === 0 ? 1 : 0,
        createdAt: Date.now() - Math.random() * 86400000,
      });

      // 3. Fake Messages
      await ctx.db.insert("messages", {
        conversationId,
        tenantId: finalTenantId,
        direction: "inbound",
        content: "Hello! This is a mock message.",
        contentType: "text",
        isInternalNote: false,
        status: "delivered",
        timestamp: Date.now() - Math.random() * 3600000,
        createdAt: Date.now() - Math.random() * 3600000,
      });
    }

    return {
      channelId,
      message: "Mock data generated! (5 contacts, 1 channel)",
    };
  },
});
