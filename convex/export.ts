import { v, ConvexError } from "convex/values";
import { action, internalQuery, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { getCallerRole, assertAdminOrSupervisor, type OrgRole } from "./lib/auth";

export const listAllContactsForExport = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const listCustomFieldsForContact = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customFields")
      .withIndex("by_contact", (q) => q.eq("contactId", args.contactId))
      .collect();
  },
});

export const listAllConversationsForExport = internalQuery({
  args: { tenantId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("conversations")
      .withIndex("by_tenant", (q) => q.eq("tenantId", args.tenantId))
      .collect();
  },
});

export const listMessagesForConversation = internalQuery({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect();
  },
});

export const getContactForExport = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.contactId);
  },
});

export const getChannelForExport = internalQuery({
  args: { channelId: v.id("channels") },
  handler: async (ctx, args) => {
    const channel = await ctx.db.get(args.channelId);
    return channel ? { name: channel.displayName, phone: channel.displayPhone ?? channel.phoneNumberId } : null;
  },
});

const LABEL_AR_TO_EN: Record<string, string> = {
  "شكوى": "Complaint",
  "استفسار": "Inquiry",
  "مبيعات": "Sales",
  "دعم فني": "Tech Support",
  "طلب إلغاء": "Cancellation Request",
  "VIP": "VIP",
};

function translateLabel(label: string, locale: "en" | "ar"): string {
  if (locale === "ar") return label;
  return LABEL_AR_TO_EN[label] ?? label;
}

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export const generateContactsExport = action({
  args: {},
  handler: async (ctx) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role as OrgRole);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("NO_ORG");
    const tenantId = identity.orgId as string;

    const contacts: Array<Record<string, unknown>> = await ctx.runQuery(
      internal.export.listAllContactsForExport,
      { tenantId },
    );

    const header = "phone,name,tags,stage,notes,customFields,firstSeen,lastSeen,source";
    const rows = await Promise.all(
      contacts.map(async (contact) => {
        const customFields: Array<{ key: string; value: string }> = await ctx.runQuery(
          internal.export.listCustomFieldsForContact,
          { contactId: contact._id as Id<"contacts"> },
        );

        const cfJson = JSON.stringify(
          Object.fromEntries(customFields.map((f) => [f.key, f.value])),
        );

        return [
          escapeCsvField(contact.phone as string),
          escapeCsvField((contact.customName as string) || (contact.displayName as string) || ""),
          escapeCsvField((contact.tags as string[]).join(";")),
          escapeCsvField((contact.stage as string) || ""),
          escapeCsvField((contact.notes as string) || ""),
          escapeCsvField(cfJson),
          escapeCsvField(new Date(contact.firstSeenAt as number).toISOString()),
          escapeCsvField(new Date(contact.lastSeenAt as number).toISOString()),
          escapeCsvField(contact.source as string),
        ].join(",");
      }),
    );

    const csv = [header, ...rows].join("\n");
    const storageId = await ctx.storage.store(
      new Blob([csv], { type: "text/csv" }),
    );
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});

async function buildConversationsExportData(
  ctx: ActionCtx,
  tenantId: string,
) {
  const conversations: Array<Record<string, unknown>> = await ctx.runQuery(
    internal.export.listAllConversationsForExport,
    { tenantId },
  );

  return Promise.all(
    conversations.map(async (conv) => {
      const [messages, contact, channel] = await Promise.all([
        ctx.runQuery(internal.export.listMessagesForConversation, {
          conversationId: conv._id as Id<"conversations">,
        }) as Promise<Array<Record<string, unknown>>>,
        ctx.runQuery(internal.export.getContactForExport, {
          contactId: conv.contactId as Id<"contacts">,
        }) as Promise<Record<string, unknown> | null>,
        ctx.runQuery(internal.export.getChannelForExport, {
          channelId: conv.channelId as Id<"channels">,
        }) as Promise<{ name: string; phone: string } | null>,
      ]);

      return {
        id: conv._id as string,
        contact: contact
          ? {
              phone: contact.phone as string,
              name: (contact.customName as string) || (contact.displayName as string) || "",
            }
          : null,
        channel: channel ?? null,
        status: conv.status as string,
        labels: (conv.labels as string[]) ?? [],
        assignedAgentId: (conv.assignedAgentId as string) ?? null,
        createdAt: new Date(conv.createdAt as number).toISOString(),
        resolvedAt: conv.status === "resolved" && conv.lastMessageAt
          ? new Date(conv.lastMessageAt as number).toISOString()
          : null,
        messages: messages.map((m) => ({
          from: m.direction === "inbound" ? "customer" : "agent",
          type: m.contentType as string,
          content: (m.content as string) ?? "",
          sentAt: new Date(m.timestamp as number).toISOString(),
          isInternal: (m.isInternalNote as boolean) ?? false,
        })),
      };
    }),
  );
}

function generateCsvFromExportData(
  data: Awaited<ReturnType<typeof buildConversationsExportData>>,
  locale: "en" | "ar" = "ar",
): string {
  const header = "conversationId,contactPhone,contactName,channel,status,labels,assignedAgentId,conversationCreatedAt,conversationResolvedAt,messageFrom,messageType,messageContent,messageSentAt,isInternal";
  const rows: string[] = [];
  for (const conv of data) {
    const convId = escapeCsvField(conv.id);
    const phone = escapeCsvField(conv.contact?.phone ?? "");
    const name = escapeCsvField(conv.contact?.name ?? "");
    const channelName = escapeCsvField(conv.channel?.name ?? "");
    const status = escapeCsvField(conv.status);
    const labels = escapeCsvField(conv.labels.map((l) => translateLabel(l, locale)).join(";"));
    const agentId = escapeCsvField(conv.assignedAgentId ?? "");
    const createdAt = escapeCsvField(conv.createdAt);
    const resolvedAt = escapeCsvField(conv.resolvedAt ?? "");
    for (const msg of conv.messages) {
      rows.push([
        convId,
        phone,
        name,
        channelName,
        status,
        labels,
        agentId,
        createdAt,
        resolvedAt,
        escapeCsvField(msg.from),
        escapeCsvField(msg.type),
        escapeCsvField(msg.content),
        escapeCsvField(msg.sentAt),
        escapeCsvField(String(msg.isInternal)),
      ].join(","));
    }
  }
  return "\uFEFF" + [header, ...rows].join("\n");
}

function generateHtmlFromExportData(
  data: Awaited<ReturnType<typeof buildConversationsExportData>>,
  tenantId: string,
  locale: "en" | "ar",
): string {
  const date = new Date().toISOString().slice(0, 10);
  const escapedJson = JSON.stringify(data).replace(/<\/script>/gi, "<\\/script>");
  const isAr = locale === "ar";
  const L = {
    title: isAr ? "تصدير المحادثات" : "Conversations Export",
    heading: isAr ? "المحادثات" : "Conversations",
    searchPlaceholder: isAr ? "بحث..." : "Search...",
    selectPrompt: isAr ? "اختر محادثة" : "Select a conversation",
    agentLabel: isAr ? "وكيل" : "Agent",
    internalLabel: isAr ? "ملاحظة داخلية" : "Internal note",
  };
  const htmlLang = isAr ? "ar" : "en";
  const htmlDir = isAr ? "rtl" : "ltr";
  return `<!DOCTYPE html>
<html lang="${htmlLang}" dir="${htmlDir}">
<head>
<meta charset="UTF-8">
<title>WaDesk — ${L.title} — ${tenantId} — ${date}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:#f0f2f5;height:100vh;display:flex;direction:rtl}
#sidebar{width:320px;background:#fff;border-inline-end:1px solid #e0e0e0;display:flex;flex-direction:column;height:100vh}
#sidebar h2{padding:16px;font-size:16px;border-bottom:1px solid #e0e0e0;color:#111b21}
#search{margin:8px;padding:8px 12px;border:1px solid #e0e0e0;border-radius:8px;font-size:14px;outline:none;width:calc(100% - 16px)}
#conv-list{flex:1;overflow-y:auto}
.conv-item{padding:12px 16px;border-bottom:1px solid #f0f0f0;cursor:pointer;transition:background .15s}
.conv-item:hover{background:#f0f2f5}
.conv-item.active{background:#e8f5e9}
.conv-name{font-weight:600;font-size:14px;color:#111b21}
.conv-meta{font-size:12px;color:#667781;margin-top:2px}
.badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:11px;font-weight:600;margin-inline-start:4px}
.badge-open{background:#d1fae5;color:#065f46}
.badge-resolved{background:#e0e7ff;color:#3730a3}
.badge-pending{background:#fef3c7;color:#92400e}
.badge-label{background:#ede9fe;color:#5b21b6;margin-top:4px;font-size:10px}
#main{flex:1;display:flex;flex-direction:column;height:100vh}
#header{padding:16px 24px;background:#fff;border-bottom:1px solid #e0e0e0}
#header h3{font-size:16px;color:#111b21}
#header-info{font-size:13px;color:#667781;margin-top:4px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#messages{flex:1;overflow-y:auto;padding:16px 24px;display:flex;flex-direction:column;gap:6px}
.msg-row{display:flex;flex-direction:column;max-width:70%}
.msg-row.customer{align-self:flex-start}
.msg-row.agent{align-self:flex-end}
.msg-bubble{padding:8px 12px;border-radius:12px;font-size:14px;line-height:1.5;word-break:break-word;white-space:pre-wrap}
.msg-row.customer .msg-bubble{background:#f0f0f0;color:#111b21;border-bottom-start-radius:2px}
.msg-row.agent .msg-bubble{background:#d9fdd3;color:#111b21;border-bottom-end-radius:2px}
.msg-row.internal .msg-bubble{background:#fef3c7;color:#92400e;border-bottom-end-radius:2px}
.msg-meta{font-size:11px;color:#8696a0;margin-top:2px}
.msg-row.agent .msg-meta,.msg-row.internal .msg-meta{text-align:start}
#empty{flex:1;display:flex;align-items:center;justify-content:center;color:#8696a0;font-size:16px}
</style>
</head>
<body>
<div id="sidebar">
<h2>${L.heading}</h2>
<input type="text" id="search" placeholder="${L.searchPlaceholder}">
<div id="conv-list"></div>
</div>
<div id="main">
<div id="empty">${L.selectPrompt}</div>
</div>
<script>const DATA=${escapedJson};const L=${JSON.stringify(L)};</script>
<script>
(function(){
var list=document.getElementById("conv-list");
var main=document.getElementById("main");
var search=document.getElementById("search");
var activeIdx=null;
function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML}
function statusBadge(s){
var m={open:"badge-open",resolved:"badge-resolved",pending:"badge-pending"};
return '<span class="badge '+(m[s]||"badge-open")+'">'+esc(s)+'</span>'}
function renderList(filter){
filter=(filter||"").toLowerCase();
list.innerHTML="";
DATA.forEach(function(c,i){
var label=((c.contact&&c.contact.name)||c.contact&&c.contact.phone||"—").toLowerCase();
if(filter&&label.indexOf(filter)===-1)return;
var div=document.createElement("div");
div.className="conv-item"+(activeIdx===i?" active":"");
div.innerHTML='<div class="conv-name">'+esc((c.contact&&c.contact.name)||c.contact&&c.contact.phone||"—")+'</div>'
+'<div class="conv-meta">'+esc(c.createdAt.slice(0,16).replace("T"," "))+" "+statusBadge(c.status)+'</div>'
+(c.labels&&c.labels.length?'<div>'+c.labels.map(function(l){return'<span class="badge badge-label">'+esc(l)+'</span>'}).join(" ")+'</div>':"");
div.onclick=function(){activeIdx=i;showConversation(i)};
list.appendChild(div)
})}
function showConversation(idx){
var c=DATA[idx];
var hdr='<div id="header"><h3>'+esc((c.contact&&c.contact.name)||"—")+'</h3>'
+'<div id="header-info">'
+'<span>'+esc(c.contact&&c.contact.phone||"")+'</span>'
+'<span>'+esc(c.channel&&c.channel.name||"")+'</span>'
+statusBadge(c.status)
+(c.assignedAgentId?'<span>'+L.agentLabel+': '+esc(c.assignedAgentId)+'</span>':"")
+'</div></div>';
var msgs='<div id="messages">';
c.messages.forEach(function(m){
var cls=m.from==="customer"?"customer":m.isInternal?"internal":"agent";
var icon=m.isInternal?' 🔒':"";
msgs+='<div class="msg-row '+cls+'"><div class="msg-bubble" dir="auto">'+esc(m.content)+icon+'</div>'
+'<div class="msg-meta">'+esc(m.sentAt.slice(0,16).replace("T"," "))+" · "+esc(m.from)+(m.isInternal?" · "+L.internalLabel:"")+'</div></div>'});
msgs+='</div>';
main.innerHTML=hdr+msgs;
var el=document.getElementById("messages");
if(el)el.scrollTop=el.scrollHeight;
renderList(search.value)}
renderList("");
search.addEventListener("input",function(){renderList(this.value)});
})();
</script>
</body>
</html>`;
}

export const generateConversationsExport = action({
  args: {
    format: v.union(v.literal("json"), v.literal("csv"), v.literal("html")),
    locale: v.optional(v.union(v.literal("en"), v.literal("ar"))),
  },
  handler: async (ctx, args) => {
    const role = await getCallerRole(ctx);
    assertAdminOrSupervisor(role as OrgRole);

    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.orgId) throw new ConvexError("NO_ORG");
    const tenantId = identity.orgId as string;

    const data = await buildConversationsExportData(ctx, tenantId);

    let blob: Blob;
    if (args.format === "csv") {
      const csv = generateCsvFromExportData(data, args.locale ?? "ar");
      blob = new Blob([csv], { type: "text/csv" });
    } else if (args.format === "html") {
      const html = generateHtmlFromExportData(data, tenantId, args.locale ?? "ar");
      blob = new Blob([html], { type: "text/html" });
    } else {
      const json = JSON.stringify(data, null, 2);
      blob = new Blob([json], { type: "application/json" });
    }

    const storageId = await ctx.storage.store(blob);
    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});
