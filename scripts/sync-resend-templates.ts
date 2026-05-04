/**
 * Syncs all React Email templates to the Resend dashboard.
 *
 * - Renders each template with {{{placeholder}}} variables (Resend's triple-brace syntax)
 * - Creates or updates each template by alias (idempotent)
 * - Publishes every template so it's usable
 * - Writes scripts/resend-template-ids.json with the resulting ID map
 *
 * Usage:
 *   npx tsx scripts/sync-resend-templates.ts
 */

import * as React from "react";
import { render } from "@react-email/render";
import { config } from "dotenv";
import { resolve } from "path";
import { writeFileSync } from "fs";

config({ path: resolve(process.cwd(), ".env.local") });

// ── Template imports ─────────────────────────────────────────────────────────

import { AgentWelcome } from "../convex/emails/templates/agentWelcome";
import { BillingPaymentFailed } from "../convex/emails/templates/billingPaymentFailed";
import { BillingSubscriptionExpired } from "../convex/emails/templates/billingSubscriptionExpired";
import { ChannelDeleted } from "../convex/emails/templates/channelDeleted";
import { ChannelExpiringSoon } from "../convex/emails/templates/channelExpiringSoon";
import { FollowupDue } from "../convex/emails/templates/followupDue";
import { NewAssignment } from "../convex/emails/templates/newAssignment";
import { SlaBreach } from "../convex/emails/templates/slaBreach";

// ── Config ────────────────────────────────────────────────────────────────────

const API_KEY = process.env.RESEND_API_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.wabdesk.com";

if (!API_KEY) {
  console.error("RESEND_API_KEY not found in .env.local");
  process.exit(1);
}

type Locale = "ar" | "en";
type TemplateComponent = React.ComponentType<{
  locale: Locale;
  variables: Record<string, string>;
}>;

interface TemplateDef {
  component: TemplateComponent;
  vars: string[];
  from: string;
  subjects: Record<Locale, string>;
}

const TEMPLATES: Record<string, TemplateDef> = {
  agent_welcome: {
    component: AgentWelcome,
    vars: ["agentName", "orgName"],
    from: "WABDesk <noreply@wabdesk.com>",
    subjects: {
      ar: "مرحباً بك في WABDesk",
      en: "Welcome to WABDesk",
    },
  },
  billing_payment_failed: {
    component: BillingPaymentFailed,
    vars: ["orgName", "planName"],
    from: "WABDesk Billing <billing@wabdesk.com>",
    subjects: {
      ar: "فشل تجديد الاشتراك — يرجى تحديث بيانات الدفع",
      en: "Subscription Payment Failed — Action Required",
    },
  },
  billing_subscription_expired: {
    component: BillingSubscriptionExpired,
    vars: ["orgName", "planName"],
    from: "WABDesk Billing <billing@wabdesk.com>",
    subjects: {
      ar: "انتهت صلاحية الاشتراك",
      en: "Your Subscription Has Expired",
    },
  },
  channel_deleted: {
    component: ChannelDeleted,
    vars: ["channelName"],
    from: "WABDesk Alerts <alerts@wabdesk.com>",
    subjects: {
      ar: "تم حذف رقم واتساب نهائياً",
      en: "WhatsApp Number Permanently Deleted",
    },
  },
  channel_expiring_soon: {
    component: ChannelExpiringSoon,
    vars: ["channelName", "daysLeft", "deleteDate"],
    from: "WABDesk Alerts <alerts@wabdesk.com>",
    subjects: {
      ar: "إجراء مطلوب: سيُحذف رقم واتساب قريباً",
      en: "Action Required: WhatsApp Number Expiring Soon",
    },
  },
  followup_due: {
    component: FollowupDue,
    vars: ["contactName", "status"],
    from: "WABDesk <noreply@wabdesk.com>",
    subjects: {
      ar: "تحديث: متابعة العميل",
      en: "Update: Customer Follow-up",
    },
  },
  new_assignment: {
    component: NewAssignment,
    vars: ["contactName", "channelName", "conversationId", "assignedByName"],
    from: "WABDesk <noreply@wabdesk.com>",
    subjects: {
      ar: "إشعار: محادثة جديدة تم تعيينها إليك",
      en: "Notification: New Conversation Assigned to You",
    },
  },
  sla_breach: {
    component: SlaBreach,
    vars: ["contactName", "channelName", "thresholdMinutes", "conversationId"],
    from: "WABDesk Alerts <alerts@wabdesk.com>",
    subjects: {
      ar: "تنبيه: تجاوز وقت الاستجابة المسموح به",
      en: "Alert: SLA Response Time Exceeded",
    },
  },
};

// ── Resend helpers ────────────────────────────────────────────────────────────

interface ResendTemplate {
  id: string;
  name: string;
  alias: string;
  status: string;
}

async function listTemplates(): Promise<ResendTemplate[]> {
  const res = await fetch("https://api.resend.com/templates", {
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`List failed: ${await res.text()}`);
  const body = await res.json() as { data: ResendTemplate[] };
  return body.data ?? [];
}

async function createTemplate(payload: object): Promise<string> {
  const res = await fetch("https://api.resend.com/templates", {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Create failed: ${await res.text()}`);
  const body = await res.json() as { id: string };
  return body.id;
}

async function updateTemplate(id: string, payload: object): Promise<void> {
  const res = await fetch(`https://api.resend.com/templates/${id}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Update failed: ${await res.text()}`);
}

async function publishTemplate(id: string): Promise<void> {
  const res = await fetch(`https://api.resend.com/templates/${id}/publish`, {
    method: "POST",
    headers: { Authorization: `Bearer ${API_KEY}` },
  });
  if (!res.ok) throw new Error(`Publish failed: ${await res.text()}`);
}

// ── Render helper ─────────────────────────────────────────────────────────────

function buildPlaceholders(vars: string[]): Record<string, string> {
  const placeholders: Record<string, string> = { appUrl: APP_URL };
  for (const v of vars) {
    // e.g. agentName → {{{agentName}}}
    placeholders[v] = `{{{${v}}}}`;
  }
  return placeholders;
}

async function renderTemplate(
  component: TemplateComponent,
  locale: Locale,
  vars: string[],
): Promise<string> {
  const element = React.createElement(component, {
    locale,
    variables: buildPlaceholders(vars),
  });
  return render(element);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Fetching existing Resend templates...");
  const existing = await listTemplates();
  const byAlias = new Map(existing.map((t) => [t.alias, t]));
  console.log(`Found ${existing.length} existing template(s).\n`);

  const idMap: Record<string, string> = {};
  const locales: Locale[] = ["en", "ar"];

  for (const [key, def] of Object.entries(TEMPLATES)) {
    for (const locale of locales) {
      const alias = `wabdesk-${key.replace(/_/g, "-")}-${locale}`;
      const name = `WABDesk / ${key.replace(/_/g, " ")} (${locale.toUpperCase()})`;

      process.stdout.write(`  ${alias.padEnd(48)}`);

      const html = await renderTemplate(def.component, locale, def.vars);
      const resendVars = def.vars.map((v) => ({ key: v, type: "string", fallback_value: v }));

      const payload = {
        name,
        alias,
        from: def.from,
        subject: def.subjects[locale],
        html,
        variables: resendVars,
      };

      let id: string;
      const found = byAlias.get(alias);

      if (found) {
        await updateTemplate(found.id, payload);
        id = found.id;
        process.stdout.write(`updated  ${id}\n`);
      } else {
        id = await createTemplate(payload);
        process.stdout.write(`created  ${id}\n`);
      }

      await publishTemplate(id);
      idMap[`${key}_${locale}`] = id;
    }
  }

  const outPath = resolve(process.cwd(), "scripts/resend-template-ids.json");
  writeFileSync(outPath, JSON.stringify(idMap, null, 2) + "\n");

  console.log(`\nDone. Template IDs written to scripts/resend-template-ids.json`);
  console.log("All templates are published and visible in the Resend dashboard.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
