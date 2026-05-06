# Stage 2c.2 — Path B Implementation Plan (Deterministic Invitation Email)

**Produced:** 2026-05-06  
**Locked base:** `STAGE_2C1_GAP_CLOSER.md` + `STAGE_2C_CLERK_CLIENT_SITES.md` + `STAGE_2A_FOUNDATION.md`  
**Scope:** Planning only — no installs, no source file modifications. All diffs applied in Stage 3.

**Status:** Supersedes Stage 2c §8.1 and Stage 2c.1 §4.1, §4.4. Path B is locked.

---

## §0. Why Path B

Stage 2c.1 §4.0.2 documented three candidates for calling `auth.api.inviteMember` from inside a Convex action without a real HTTP session:

1. `identity.tokenIdentifier` as Bearer token → "almost certainly incorrect" (tokenIdentifier is Convex's internal `<issuer>|<subject>` format, not a raw JWT)
2. `@convex-dev/better-auth@0.12.2` helper function → "may exist; requires checking node_modules at Stage 3"
3. `trustedOrigins` bypass → "unknown"

Rather than gamble on Stage 3 resolving this at apply time, Path B sidesteps the synthetic-headers question entirely:

- Invitation record created via `adapter.create` (raw CRUD, no hooks, no API auth)
- Invitation email dispatched by the calling action via WabDesk's existing React Email scheduler
- `sendInvitationEmail` callback in `convex/auth.ts` reverted to documented no-op stub

**Trade-off acknowledged:** Path B doesn't use Better Auth's "intended" hook pattern. If Better Auth ever adds invitation-tied features that depend on the hook firing, Phase 2 work will need to revisit. For v1, the hook system buys nothing concrete and costs a Stage 3 debug session.

---

## §1. Discovery Output

### §1.1 Directory listings (verbatim)

```
$ ls convex/actions/
channelRetentionAction.ts
notifyEmail.ts
processBroadcastBatch.ts
resolveMedia.ts
roundRobin.ts
sendEmail.ts
sendInviteWhatsApp.ts
sendWhatsAppMessage.ts
validateInvite.ts

$ ls convex/emails/
base.tsx
components
templates

$ ls convex/lib/ | grep -i email
emailHelpers.ts

$ find convex -name "*.ts" -path "*email*"
/Users/ahmedgemmezy/Documents/WABDesk/convex/lib/emailHelpers.ts

$ find convex -name "*.tsx"
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/base.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/components/waSection.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/components/waButton.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/channelDeleted.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/slaBreach.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/billingPaymentFailed.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/billingRenewalReceipt.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/conversationReopened.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/billingSubscriptionExpired.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/agentWelcome.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/conversationTransferred.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/channelExpiringSoon.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/newAssignment.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/followupDue.tsx
/Users/ahmedgemmezy/Documents/WABDesk/convex/emails/templates/csatReceived.tsx

$ ls -la convex/emails/templates/
total 96
drwxr-xr-x  14 ahmedgemmezy  staff   448 May  5 08:57 .
drwxr-xr-x   5 ahmedgemmezy  staff   160 May  2 19:50 ..
-rw-r--r--   1 ahmedgemmezy  staff  2317 May  2 19:47 agentWelcome.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2387 May  2 19:47 billingPaymentFailed.tsx
-rw-r--r--   1 ahmedgemmezy  staff  1991 May  5 08:57 billingRenewalReceipt.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2238 May  2 19:47 billingSubscriptionExpired.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2109 May  2 19:47 channelDeleted.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2400 May  2 19:47 channelExpiringSoon.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2485 May  4 18:16 conversationReopened.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2336 May  4 18:16 conversationTransferred.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2229 May  4 18:17 csatReceived.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2286 May  2 19:38 followupDue.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2383 May  2 19:47 newAssignment.tsx
-rw-r--r--   1 ahmedgemmezy  staff  2452 May  2 19:47 slaBreach.tsx
```

### §1.2 Existing send-action — `convex/actions/sendEmail.ts` (full content, verbatim)

```typescript
  1  "use node";
  2
  3  import * as React from "react";
  4  import { render } from "@react-email/render";
  5  import { internalAction } from "../_generated/server";
  6  import { v, ConvexError } from "convex/values";
  7  import { ChannelExpiringSoon } from "../emails/templates/channelExpiringSoon";
  8  import { ChannelDeleted } from "../emails/templates/channelDeleted";
  9  import { SlaBreach } from "../emails/templates/slaBreach";
 10  import { FollowupDue } from "../emails/templates/followupDue";
 11  import { NewAssignment } from "../emails/templates/newAssignment";
 12  import { AgentWelcome } from "../emails/templates/agentWelcome";
 13  import { BillingPaymentFailed } from "../emails/templates/billingPaymentFailed";
 14  import { BillingSubscriptionExpired } from "../emails/templates/billingSubscriptionExpired";
 15  import { BillingRenewalReceipt } from "../emails/templates/billingRenewalReceipt";
 16  import { ConversationTransferred } from "../emails/templates/conversationTransferred";
 17  import { ConversationReopened } from "../emails/templates/conversationReopened";
 18  import { CsatReceived } from "../emails/templates/csatReceived";
 19
 20  const SUBJECTS: Record<string, Record<"ar" | "en", string>> = {
 21    channel_expiring_soon: {
 22      ar: "إجراء مطلوب: سيُحذف رقم واتساب خلال {{daysLeft}} أيام",
 23      en: "Action Required: WhatsApp Number Deletes in {{daysLeft}} Days",
 24    },
 25    channel_deleted: {
 26      ar: "تم حذف رقم واتساب نهائياً",
 27      en: "WhatsApp Number Permanently Deleted",
 28    },
 29    sla_breach: {
 30      ar: "تنبيه: تجاوز وقت الاستجابة المسموح به",
 31      en: "Alert: SLA Response Time Exceeded",
 32    },
 33    followup_due_sent: {
 34      ar: "تم إرسال متابعة {{contactName}} بنجاح",
 35      en: "Follow-up sent to {{contactName}}",
 36    },
 37    followup_due_failed: {
 38      ar: "فشل إرسال متابعة {{contactName}}",
 39      en: "Follow-up to {{contactName}} failed",
 40    },
 41    new_assignment: {
 42      ar: "إشعار: محادثة جديدة تم تعيينها إليك",
 43      en: "Notification: New Conversation Assigned to You",
 44    },
 45    agent_welcome: {
 46      ar: "مرحباً بك في WABDesk",
 47      en: "Welcome to WABDesk",
 48    },
 49    billing_payment_failed: {
 50      ar: "فشل تجديد الاشتراك — يرجى تحديث بيانات الدفع",
 51      en: "Subscription Payment Failed — Action Required",
 52    },
 53    billing_subscription_expired: {
 54      ar: "انتهت صلاحية الاشتراك",
 55      en: "Your Subscription Has Expired",
 56    },
 57    billing_renewal_receipt: {
 58      ar: "تم تجديد اشتراكك بنجاح",
 59      en: "Your Subscription Has Been Renewed",
 60    },
 61    conversation_transferred: {
 62      ar: "تم تحويل محادثة مع {{contactName}} إلى فريقك",
 63      en: "A conversation with {{contactName}} was transferred to your team",
 64    },
 65    conversation_reopened: {
 66      ar: "{{contactName}} أرسل رسالة جديدة في محادثة محسومة",
 67      en: "{{contactName}} replied to a resolved conversation",
 68    },
 69    csat_received: {
 70      ar: "تم استلام تقييم العميل",
 71      en: "Customer rating received",
 72    },
 73  };
 74
 75  function resolveSubject(
 76    templateKey: string,
 77    locale: "ar" | "en",
 78    variables: Record<string, string>,
 79  ): string {
 80    let subject = SUBJECTS[templateKey]?.[locale] ?? templateKey;
 81    for (const [key, value] of Object.entries(variables)) {
 82      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
 83    }
 84    return subject;
 85  }
 86
 87  function buildElement(
 88    templateKey: string,
 89    locale: "ar" | "en",
 90    variables: Record<string, string>,
 91  ): React.ReactElement {
 92    const props = { locale, variables };
 93    switch (templateKey) {
 94      case "channel_expiring_soon":
 95        return React.createElement(ChannelExpiringSoon, props);
 96      case "channel_deleted":
 97        return React.createElement(ChannelDeleted, props);
 98      case "sla_breach":
 99        return React.createElement(SlaBreach, props);
100      case "followup_due":
101      case "followup_due_sent":
102      case "followup_due_failed":
103        return React.createElement(FollowupDue, props);
104      case "new_assignment":
105        return React.createElement(NewAssignment, props);
106      case "agent_welcome":
107        return React.createElement(AgentWelcome, props);
108      case "billing_payment_failed":
109        return React.createElement(BillingPaymentFailed, props);
110      case "billing_subscription_expired":
111        return React.createElement(BillingSubscriptionExpired, props);
112      case "billing_renewal_receipt":
113        return React.createElement(BillingRenewalReceipt, props);
114      case "conversation_transferred":
115        return React.createElement(ConversationTransferred, props);
116      case "conversation_reopened":
117        return React.createElement(ConversationReopened, props);
118      case "csat_received":
119        return React.createElement(CsatReceived, props);
120      default:
121        throw new ConvexError(`TEMPLATE_NOT_FOUND: ${templateKey}`);
122    }
123  }
124
125  export const sendEmail = internalAction({
126    args: {
127      to: v.string(),
128      templateKey: v.string(),
129      locale: v.union(v.literal("ar"), v.literal("en")),
130      variables: v.record(v.string(), v.string()),
131    },
132    handler: async (_ctx, args) => {
133      const apiKey = process.env.RESEND_API_KEY;
134      if (!apiKey) {
135        console.log("[EMAIL_SKIP] RESEND_API_KEY not configured");
136        return { ok: false, reason: "RESEND_NOT_CONFIGURED" };
137      }
138
139      const enrichedVariables: Record<string, string> = {
140        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://wabdesk.com",
141        ...args.variables,
142      };
143
144      const element = buildElement(args.templateKey, args.locale, enrichedVariables);
145      const html = await render(element);
146      const subject = resolveSubject(args.templateKey, args.locale, enrichedVariables);
147
148      const BILLING_TEMPLATES = new Set([
149        "billing_payment_failed",
150        "billing_subscription_expired",
151        "billing_renewal_receipt",
152      ]);
153      const ALERT_TEMPLATES = new Set([
154        "channel_expiring_soon",
155        "channel_deleted",
156        "sla_breach",
157      ]);
158      const fromAddress = BILLING_TEMPLATES.has(args.templateKey)
159        ? "WABDesk Billing <billing@wabdesk.com>"
160        : ALERT_TEMPLATES.has(args.templateKey)
161          ? "WABDesk Alerts <alerts@wabdesk.com>"
162          : "WABDesk <noreply@wabdesk.com>";
163
164      const res = await fetch("https://api.resend.com/emails", {
165        method: "POST",
166        headers: {
167          Authorization: `Bearer ${apiKey}`,
168          "Content-Type": "application/json",
169        },
170        body: JSON.stringify({
171          from: fromAddress,
172          to: args.to,
173          subject,
174          html,
175        }),
176      });
177
178      if (!res.ok) {
179        const err = await res.text();
180        console.error("[EMAIL_ERROR]", err);
181        throw new ConvexError(`EMAIL_SEND_FAILED: ${err}`);
182      }
183
184      return { ok: true };
185    },
186  });
```

### §1.3 Templates directory listing + representative template (agentWelcome.tsx, full content)

Templates directory: 12 files, all using the same convention. Newest: billingRenewalReceipt.tsx (May 5), conversationReopened.tsx / conversationTransferred.tsx / csatReceived.tsx (May 4).

Representative template — `convex/emails/templates/agentWelcome.tsx` (full content, verbatim):

```typescript
 1  import * as React from "react";
 2  import { Text } from "@react-email/components";
 3  import { WaEmailLayout } from "../base";
 4  import { WaButton } from "../components/waButton";
 5  import { WaSection } from "../components/waSection";
 6
 7  interface Props { locale: "ar" | "en"; variables: Record<string, string>; }
 8
 8  export function AgentWelcome({ locale, variables }: Props) {
 9    const { agentName, orgName, appUrl } = variables;
10    const isRtl = locale === "ar";
11    const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
12    const textStyle = {
13      color: "#334155",
14      fontSize: 15,
15      lineHeight: "1.7",
16      margin: "0 0 12px",
17      textAlign: (isRtl ? "right" : "left") as "right" | "left",
18      direction: (isRtl ? "rtl" : "ltr") as "rtl" | "ltr",
19      fontFamily: font,
20    };
21
22    if (locale === "ar") {
23      return (
24        <WaEmailLayout locale="ar" accentColor="#10B981" icon="👋"
25          heading={`أهلاً ${agentName}، مرحباً بك في ${orgName}`}
26          previewText={`تم إضافتك إلى فريق ${orgName} على WABDesk`}>
27          <Text style={textStyle}>أهلاً {agentName}،</Text>
28          <Text style={textStyle}>
29            تم إضافتك بنجاح إلى فريق <strong>{orgName}</strong> على WABDesk. يمكنك الآن الرد على محادثات العملاء والتعاون مع فريقك.
30          </Text>
31          <WaSection locale="ar">ابدأ بتسجيل الدخول وإلقاء نظرة على الصندوق الوارد.</WaSection>
32          <WaButton href={`${appUrl}/inbox`} locale="ar">الذهاب إلى الصندوق الوارد</WaButton>
33        </WaEmailLayout>
34      );
35    }
36    return (
37      <WaEmailLayout locale="en" accentColor="#10B981" icon="👋"
38        heading={`Welcome ${agentName} to ${orgName}`}
39        previewText={`You've been added to ${orgName}'s team on WABDesk`}>
40        <Text style={textStyle}>Hi {agentName},</Text>
41        <Text style={textStyle}>
42          You've been successfully added to <strong>{orgName}</strong>'s team on WABDesk. You can now reply to customer conversations and collaborate with your team.
43        </Text>
44        <WaSection locale="en">Get started by logging in and checking your inbox.</WaSection>
45        <WaButton href={`${appUrl}/inbox`} locale="en">Go to Inbox</WaButton>
46      </WaEmailLayout>
47    );
48  }
```

Supporting files read (not shown in full — read during discovery):

`convex/emails/base.tsx` — `WaEmailLayout` component: uses `@react-email/components` (`Html`, `Head`, `Body`, `Container`, `Section`, `Text`, `Font`); inline styles throughout; Cairo font loaded via `<Font>` for RTL; accent-colored header section; dark footer section.

`convex/emails/components/waButton.tsx` — `WaButton`: wraps `Button` from `@react-email/components`; hardcoded `backgroundColor: "#10B981"` (green); no color prop. **Invitation template must use `Button` directly with `#0071E3` blue.**

`convex/emails/components/waSection.tsx` — `WaSection`: wraps `Section` + `Text` from `@react-email/components`; RTL/LTR-aware inline styles.

### §1.4 `convex/lib/emailHelpers.ts` current content (verbatim — pre-Stage-2c state on disk)

```typescript
 1  "use node";
 2
 3  import { clerkClient } from "@clerk/nextjs/server";
 4
 5  export async function getAdminEmails(
 6    orgId: string,
 7  ): Promise<Array<{ userId: string; email: string }>> {
 8    try {
 9      const client = await clerkClient();
10      const memberships = await client.organizations.getOrganizationMembershipList({
11        organizationId: orgId,
12        limit: 100,
13      });
14      return memberships.data
15        .filter((m) => m.role === "org:admin")
16        .filter((m) => m.publicUserData?.userId)
17        .map((m) => ({
18          userId: m.publicUserData!.userId!,
19          email: (m.publicUserData?.identifier ?? "") as string,
20        }))
21        .filter((m) => m.email.length > 0);
22    } catch {
23      return [];
24    }
25  }
26
27  export async function resolveUserEmail(userId: string): Promise<string | null> {
28    try {
29      const client = await clerkClient();
30      const user = await client.users.getUser(userId);
31      return user.emailAddresses[0]?.emailAddress ?? null;
32    } catch {
33      return null;
34    }
35  }
36
37  export async function resolveOrgName(orgId: string): Promise<string> {
38    try {
39      const client = await clerkClient();
40      const org = await client.organizations.getOrganization({ organizationId: orgId });
41      return org.name ?? orgId;
42    } catch {
43      return orgId;
44    }
45  }
46
```

Note: This is the pre-migration Clerk version on disk today. Stage 2c §5 plans the AFTER that changes all three signatures to add `ctx` as first param. Stage 2c.2 §5 (`inviteByEmail`) calls `resolveOrgName(ctx, tenantId)` per the Stage-2c-planned AFTER signature — this is correct.

### §1.5 Branch decision

**Branch A — Existing send action found, mirror its pattern.**

`convex/actions/sendEmail.ts` exists and has exactly the pattern needed. Stage 2c.2 adds `"invitation"` to SUBJECTS and `buildElement`, imports the new template, and creates the template file. The `inviteByEmail` function calls `internal.actions.sendEmail.sendEmail` via `ctx.scheduler.runAfter`.

### §1.6 Existing send-action signature table

| Property | Value (from §1.2 verbatim) |
|---|---|
| Internal function path | `internal.actions.sendEmail.sendEmail` |
| Required arg: `to` | `v.string()` |
| Required arg: `templateKey` | `v.string()` (open string — no discriminated union; no validator update needed) |
| Required arg: `locale` | `v.union(v.literal("ar"), v.literal("en"))` |
| Required arg: `variables` | `v.record(v.string(), v.string())` |
| Optional arg fields | None |
| Locale routing mechanism | Caller passes locale directly; template renders AR or EN (or both) based on it |
| Resend `from` address (default) | `"WABDesk <noreply@wabdesk.com>"` (file lines 158–162) |
| Resend `from` address (billing) | `"WABDesk Billing <billing@wabdesk.com>"` |
| Resend `from` address (alerts) | `"WABDesk Alerts <alerts@wabdesk.com>"` |
| Template-key extension point | (1) `SUBJECTS` map — add entry before `};` at line 73; (2) `buildElement` switch — add `case "invitation":` before `default:` at line 120 |
| React Email render call | `const element = buildElement(...); const html = await render(element);` — `render` from `@react-email/render` (line 4, line 145) |
| Args validator constraints | `templateKey` is `v.string()` — no union to extend; invitation key will pass validation without validator change |
| `fromAddress` for invitation | Default branch applies: `"WABDesk <noreply@wabdesk.com>"` — invitation is neither billing nor alert template |

---

## §2. `convex/auth.ts:sendInvitationEmail` — revert to no-op stub

### BEFORE — Stage 2c.1 §4.1 wired version (the version being superseded)

Stage 2c.1 §4.1 planned TWO changes to `convex/auth.ts`. Both are superseded by Stage 2c.2.

**Change 1 (superseded) — `buildInvitationEmailHtml` module-scope helper (Stage 2c.1 §4.1 planned addition before `export const createAuth`):**

```typescript
function buildInvitationEmailHtml(args: {
  orgName: string;
  inviterName: string;
  acceptUrl: string;
}): string {
  const { orgName, inviterName, acceptUrl } = args;
  return [
    '<!DOCTYPE html><html dir="rtl" lang="ar">',
    '<head><meta charset="UTF-8"><style>',
    'body{font-family:"Cairo",Arial,sans-serif;direction:rtl;text-align:right;',
    'color:#334155;background:#f8fafc;margin:0;padding:20px}',
    '.card{background:#fff;border-radius:8px;padding:32px;max-width:480px;',
    'margin:0 auto;border:1px solid #e2e8f0}',
    'h1{color:#111827;font-size:20px;margin-bottom:16px}',
    'p{font-size:15px;line-height:1.7;margin-bottom:12px}',
    '.btn{display:inline-block;background:#0071E3;color:#fff;text-decoration:none;',
    'padding:12px 24px;border-radius:6px;font-size:15px;font-weight:600}',
    '.en{margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;',
    'direction:ltr;text-align:left;font-size:13px;color:#64748b}',
    '.footer{margin-top:16px;font-size:12px;color:#94a3b8;direction:ltr;text-align:left}',
    '</style></head><body><div class="card">',
    `<h1>دعوة للانضمام إلى ${orgName}</h1>`,
    `<p>قام <strong>${inviterName}</strong> بدعوتك للانضمام إلى فريق `,
    `<strong>${orgName}</strong> على WABDesk.</p>`,
    `<p><a href="${acceptUrl}" class="btn">قبول الدعوة</a></p>`,
    '<div class="en">',
    `<strong>Invitation to join ${orgName}</strong><br>`,
    `${inviterName} invited you to join <strong>${orgName}</strong> on WABDesk.<br><br>`,
    `<a href="${acceptUrl}">Accept Invitation</a>`,
    '</div>',
    '<div class="footer">WABDesk &middot; ',
    'إذا لم تطلب هذه الدعوة يمكنك تجاهل هذا الإيميل.</div>',
    '</div></body></html>',
  ].join("");
}
```

**Stage 2c.2 action:** This function is **DELETED** from the Stage 3 application. It must NOT appear in `convex/auth.ts`.

**Change 2 (superseded) — `sendInvitationEmail` callback body (Stage 2c.1 §4.1 planned AFTER):**

```typescript
// SUPERSEDED — DO NOT APPLY
          sendInvitationEmail: async (data) => {
            const apiKey = process.env.RESEND_API_KEY;
            if (!apiKey) {
              console.log("[INVITATION_EMAIL] RESEND_API_KEY not configured — skipping");
              return;
            }

            const d = data as {
              email: string;
              organization: { name: string };
              inviter: { user: { name: string } };
              inviteUrl?: string;
            };

            const acceptUrl = d.inviteUrl ?? `${process.env.SITE_URL ?? ""}/accept-invite`;
            const orgName = d.organization.name;
            const inviterName = d.inviter.user.name;

            const html = buildInvitationEmailHtml({ orgName, inviterName, acceptUrl });

            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "WABDesk <noreply@wabdesk.com>",
                to: d.email,
                subject: `دعوة للانضمام إلى ${orgName} على WABDesk`,
                html,
              }),
            });

            if (!res.ok) {
              console.error("[INVITATION_EMAIL]", await res.text());
            }
          },
```

### AFTER — no-op stub with explanatory comment

```typescript
          sendInvitationEmail: async (_data) => {
            // Path B: WabDesk dispatches invitation emails from the calling action
            // (convex/orgMembers.ts:inviteByEmail) via internal.actions.sendEmail.sendEmail.
            // This hook is a no-op for v1 because:
            //   1. auth.api.inviteMember requires synthetic headers from Convex actions —
            //      pattern not available in @convex-dev/better-auth@0.12.2 docs (OQ-C3.2).
            //   2. WabDesk's invite flow uses adapter.create({ model: "invitation" }) which
            //      bypasses Better Auth's API layer (and therefore this hook) by design.
            // If Better Auth ever invokes this hook from an internal flow we depend on
            // (e.g., a future resend mechanism), wire here. See STAGE_2C2_PATH_B.md §2.
            void _data;
          },
```

### Diff summary

| Change | Stage 2c.1 §4.1 plan | Stage 2c.2 action |
|---|---|---|
| `buildInvitationEmailHtml` helper | Add at module scope | **DELETE — do not add** |
| `sendInvitationEmail` body | Wired Resend `fetch` call | **REVERT to documented no-op stub** |

Net result for Stage 3 apply: `convex/auth.ts` callback looks exactly like Stage 2a §5.1's original stub, but with an explanatory comment block replacing the `void _data;` one-liner. One line (`void _data;`) becomes seven lines (the comment block + `void _data;`).

---

## §3. `convex/actions/sendEmail.ts` — add `"invitation"` template key

Three additive regions. No other lines change.

### Region 1 — import block

**BEFORE (lines 7–18):**
```typescript
  7  import { ChannelExpiringSoon } from "../emails/templates/channelExpiringSoon";
  8  import { ChannelDeleted } from "../emails/templates/channelDeleted";
  9  import { SlaBreach } from "../emails/templates/slaBreach";
 10  import { FollowupDue } from "../emails/templates/followupDue";
 11  import { NewAssignment } from "../emails/templates/newAssignment";
 12  import { AgentWelcome } from "../emails/templates/agentWelcome";
 13  import { BillingPaymentFailed } from "../emails/templates/billingPaymentFailed";
 14  import { BillingSubscriptionExpired } from "../emails/templates/billingSubscriptionExpired";
 15  import { BillingRenewalReceipt } from "../emails/templates/billingRenewalReceipt";
 16  import { ConversationTransferred } from "../emails/templates/conversationTransferred";
 17  import { ConversationReopened } from "../emails/templates/conversationReopened";
 18  import { CsatReceived } from "../emails/templates/csatReceived";
```

**AFTER (lines 7–19 — one line added):**
```typescript
  7  import { ChannelExpiringSoon } from "../emails/templates/channelExpiringSoon";
  8  import { ChannelDeleted } from "../emails/templates/channelDeleted";
  9  import { SlaBreach } from "../emails/templates/slaBreach";
 10  import { FollowupDue } from "../emails/templates/followupDue";
 11  import { NewAssignment } from "../emails/templates/newAssignment";
 12  import { AgentWelcome } from "../emails/templates/agentWelcome";
 13  import { BillingPaymentFailed } from "../emails/templates/billingPaymentFailed";
 14  import { BillingSubscriptionExpired } from "../emails/templates/billingSubscriptionExpired";
 15  import { BillingRenewalReceipt } from "../emails/templates/billingRenewalReceipt";
 16  import { ConversationTransferred } from "../emails/templates/conversationTransferred";
 17  import { ConversationReopened } from "../emails/templates/conversationReopened";
 18  import { CsatReceived } from "../emails/templates/csatReceived";
 19  import { InvitationEmail } from "../emails/templates/invitation";
```

### Region 2 — SUBJECTS map (add entry before closing `}`)

**BEFORE (lines 69–73):**
```typescript
 69    csat_received: {
 70      ar: "تم استلام تقييم العميل",
 71      en: "Customer rating received",
 72    },
 73  };
```

**AFTER (lines 69–77 — four lines added):**
```typescript
 69    csat_received: {
 70      ar: "تم استلام تقييم العميل",
 71      en: "Customer rating received",
 72    },
 73    invitation: {
 74      ar: "دعوة للانضمام إلى {{orgName}} على WABDesk",
 75      en: "Invitation to join {{orgName}} on WABDesk",
 76    },
 77  };
```

Note: `{{orgName}}` in the subject is resolved by `resolveSubject` (line 80–85) which replaces `{{key}}` with values from the `variables` map. The caller passes `orgName` in `variables`, so the subject resolves correctly.

### Region 3 — `buildElement` switch (add case before `default`)

**BEFORE (lines 118–122):**
```typescript
118      case "csat_received":
119        return React.createElement(CsatReceived, props);
120      default:
121        throw new ConvexError(`TEMPLATE_NOT_FOUND: ${templateKey}`);
122    }
```

**AFTER (lines 118–124 — two lines added):**
```typescript
118      case "csat_received":
119        return React.createElement(CsatReceived, props);
120      case "invitation":
121        return React.createElement(InvitationEmail, props);
122      default:
123        throw new ConvexError(`TEMPLATE_NOT_FOUND: ${templateKey}`);
124    }
```

### Args validator note

`templateKey` is `v.string()` (line 128 of the file). There is **no discriminated union** to extend — the key is open-ended. No validator change needed for this region.

`variables` is `v.record(v.string(), v.string())` (line 130). The invitation variables (`orgName`, `inviterName`, `inviteUrl`) are all strings. No change needed.

### `fromAddress` routing note

`invitation` is not in `BILLING_TEMPLATES` or `ALERT_TEMPLATES`. It routes to the default `"WABDesk <noreply@wabdesk.com>"` branch — no change needed to lines 148–162.

---

## §4. `convex/emails/templates/invitation.tsx` — NEW file (full content)

Key design decisions from §1 discovery:
- Props convention: `interface Props { locale: "ar" | "en"; variables: Record<string, string>; }` (matches all existing templates)
- Named export: `export function InvitationEmail(...)` (matches naming convention)
- Imports: `@react-email/components` primitives + `WaEmailLayout` + `WaSection` (same as agentWelcome.tsx)
- Styling: inline styles only (matches all existing templates — no Tailwind)
- CTA button: `Button` directly from `@react-email/components` with `backgroundColor: "#0071E3"` (Apple-blue per spec; `WaButton` is hardcoded green and has no color prop)
- Bilingual rendering: ALWAYS renders both AR and EN in one email, regardless of locale param. `locale` controls the outer HTML direction via `WaEmailLayout`. This departs from agentWelcome's if/else pattern — intentional per Stage 2c.2 §5 spec ("bilingual AR/EN in a single email")
- Font: Cairo for AR section, system font for EN section (inline style per region)

```typescript
  1  import * as React from "react";
  2  import { Text, Button, Hr } from "@react-email/components";
  3  import { WaEmailLayout } from "../base";
  4  import { WaSection } from "../components/waSection";
  5
  6  interface Props { locale: "ar" | "en"; variables: Record<string, string>; }
  7
  8  export function InvitationEmail({ locale, variables }: Props) {
  9    const { orgName, inviterName, inviteUrl } = variables;
 10
 11    const arTextStyle = {
 12      color: "#334155",
 13      fontSize: 15,
 14      lineHeight: "1.7",
 15      margin: "0 0 12px",
 16      textAlign: "right" as const,
 17      direction: "rtl" as const,
 18      fontFamily: "'Cairo', Arial, sans-serif",
 19    };
 20
 21    const enTextStyle = {
 22      color: "#334155",
 23      fontSize: 15,
 24      lineHeight: "1.7",
 25      margin: "0 0 12px",
 26      textAlign: "left" as const,
 27      direction: "ltr" as const,
 28      fontFamily: "Arial, Helvetica, sans-serif",
 29    };
 30
 31    const ctaStyle = {
 32      backgroundColor: "#0071E3",
 33      color: "#fff",
 34      padding: "12px 28px",
 35      borderRadius: 8,
 36      fontSize: 15,
 37      fontWeight: 600,
 38      textDecoration: "none",
 39      display: "inline-block",
 40      margin: "20px 0 8px",
 41    };
 42
 43    const arHeading =
 44      locale === "ar"
 45        ? `دعوة للانضمام إلى ${orgName ?? ""}`
 46        : `Invitation to join ${orgName ?? ""}`;
 47
 48    const previewText =
 49      locale === "ar"
 50        ? `${inviterName ?? ""} دعاك للانضمام إلى ${orgName ?? ""} على WABDesk`
 51        : `${inviterName ?? ""} invited you to join ${orgName ?? ""} on WABDesk`;
 52
 53    return (
 54      <WaEmailLayout
 55        locale={locale}
 56        accentColor="#0071E3"
 57        icon="✉️"
 58        heading={arHeading}
 59        previewText={previewText}
 60      >
 61        {/* Arabic block — RTL */}
 62        <Text style={arTextStyle}>أهلاً،</Text>
 63        <Text style={arTextStyle}>
 64          قام <strong>{inviterName ?? ""}</strong> بدعوتك للانضمام إلى فريق{" "}
 65          <strong>{orgName ?? ""}</strong> على WABDesk.
 66        </Text>
 67        <WaSection locale="ar">
 68          سجّل دخولك بعد قبول الدعوة للبدء في الرد على محادثات العملاء.
 69        </WaSection>
 70        <Button
 71          href={inviteUrl ?? ""}
 72          style={{ ...ctaStyle, fontFamily: "'Cairo', Arial, sans-serif" }}
 73        >
 74          قبول الدعوة
 75        </Button>
 76
 77        <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />
 78
 79        {/* English block — LTR */}
 80        <Text style={enTextStyle}>Hi,</Text>
 81        <Text style={enTextStyle}>
 81          <strong>{inviterName ?? ""}</strong> invited you to join the{" "}
 82          <strong>{orgName ?? ""}</strong> team on WABDesk.
 83        </Text>
 84        <WaSection locale="en">
 85          Log in after accepting the invitation to start handling customer conversations.
 86        </WaSection>
 87        <Button
 88          href={inviteUrl ?? ""}
 89          style={{ ...ctaStyle, fontFamily: "Arial, Helvetica, sans-serif" }}
 90        >
 91          Accept Invitation
 92        </Button>
 93      </WaEmailLayout>
 94    );
 95  }
```

### Test render check (structural trace — not a runtime test)

`render(<InvitationEmail locale="ar" variables={{ orgName: "Test Org", inviterName: "Ahmed", inviteUrl: "https://wabdesk.com/accept-invite/abc123" }} />)` would produce HTML starting approximately:

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="rtl" lang="ar">
  <head>
    <!-- Cairo font woff2 link from WaEmailLayout -->
    <!-- react-email head styles -->
  </head>
  <body style="background-color: #F8FAFC; margin: 0; padding: 0; font-family: 'Cairo', Arial, sans-serif;">
    <!-- preview text div (hidden) -->
    <!-- container with max-width: 600 -->
      <!-- accent header section (background: #0071E3) with ✉️ icon and "WABDesk" text -->
      <!-- main content section with heading "دعوة للانضمام إلى Test Org" -->
```

Runtime verification required at Stage 3: run `npx email preview` or render in test to confirm Cairo font loads and HR separator renders between sections.

---

## §5. `convex/orgMembers.ts:inviteByEmail` — THIRD revision (deterministic)

### Revision history

| Revision | Source | Approach | Status |
|---|---|---|---|
| 1st | Stage 2c §8.1 | `adapter.create` + no email | SUPERSEDED — no email sent |
| 2nd | Stage 2c.1 §4.4 | `auth.api.inviteMember` + synthetic headers | SUPERSEDED — headers approach gamble |
| **3rd** | **Stage 2c.2 §5** | **`adapter.create` + `ctx.scheduler.runAfter`** | **THIS IS THE FINAL VERSION** |

### BEFORE — Stage 2c.1 §4.4 (SUPERSEDED — DO NOT APPLY)

```typescript
// SUPERSEDED — DO NOT APPLY — Stage 2c.1 §4.4
const adapter = authComponent.adapter(ctx);
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(members.length, plan);
if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

const existingInvites = await adapter.findMany({
  model: "invitation",
  where: [
    { field: "organizationId", value: tenantId },
    { field: "email", value: args.email },
    { field: "status", value: "pending" },
  ],
});
if (existingInvites.length > 0) {
  throw new ConvexError("ALREADY_MEMBER");
}

// SUPERSEDED — auth.api.inviteMember with synthetic headers (gamble on OQ-C3.2):
const auth = createAuth(ctx);
const identity = await ctx.auth.getUserIdentity();
const headers = new Headers({
  Authorization: `Bearer ${identity?.tokenIdentifier ?? ""}`,
  "Content-Type": "application/json",
});
try {
  await auth.api.inviteMember({
    body: { organizationId: tenantId, email: args.email, role: args.role },
    headers,
  });
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("already") || msg.includes("member") || msg.includes("MEMBER_EXISTS")) {
    throw new ConvexError("ALREADY_MEMBER");
  }
  throw e;
}
```

### AFTER — Stage 2c.2 §5 (FINAL — deterministic Path B)

```typescript
// === Read portion (UNCHANGED from Stage 2c §8.1) ===
const adapter = authComponent.adapter(ctx);
const members = await adapter.findMany({
  model: "member",
  where: [{ field: "organizationId", value: tenantId }],
});
const plan = await ctx.runQuery(internal.lib.tenants.getPlan, { tenantId });
assertAgentLimitNotReached(members.length, plan);
if (args.role === "org:supervisor") assertSupervisorRoleAllowed(plan);

const existingInvites = await adapter.findMany({
  model: "invitation",
  where: [
    { field: "organizationId", value: tenantId },
    { field: "email", value: args.email },
    { field: "status", value: "pending" },
  ],
});
if (existingInvites.length > 0) {
  throw new ConvexError("ALREADY_MEMBER");
}

// === Path B: adapter.create + scheduled email (Stage 2c.2) ===
const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
const invitation = await adapter.create({
  model: "invitation",
  data: {
    organizationId: tenantId,
    email: args.email,
    role: args.role,
    status: "pending",
    inviterId: callerId,
    expiresAt,
  },
});

const inviter = await adapter.findOne({
  model: "user",
  where: [{ field: "id", value: callerId }],
});
const inviterName = (inviter?.name as string | null) ?? "WABDesk";
const orgName = await resolveOrgName(ctx, tenantId);

// See OQ-2c2-A: adapter.create return shape — id field name to verify at Stage 3.
const invitationId = (invitation as { id?: string }).id ?? "";
const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/accept-invite/${invitationId}`;

await ctx.scheduler.runAfter(0, internal.actions.sendEmail.sendEmail, {
  to: args.email,
  templateKey: "invitation",
  locale: "ar",
  variables: {
    orgName,
    inviterName,
    inviteUrl,
  },
});
```

### Import changes for `convex/orgMembers.ts`

The file currently imports `clerkClient`. Stage 2c §13 already planned the import replacement. Stage 2c.2 confirms what's needed:

```typescript
// BEFORE
import { clerkClient } from "@clerk/nextjs/server";

// AFTER — per Stage 2c §13 + Stage 2c.2 additions
import { authComponent } from "../auth";
// internal is already imported in orgMembers.ts (used by ctx.runQuery)
// resolveOrgName import:
import { resolveOrgName } from "../lib/emailHelpers";
```

Note: `createAuth` is NOT imported — Stage 2c.2 does not use `auth.api.inviteMember`. If it was added by Stage 2c.1, it must be removed.

### Trade-off documentation (for future reference)

If the invitation row insertion succeeds but `ctx.scheduler.runAfter` throws (extremely rare — the scheduler is in-process and Convex rolls back the action on throw), the row will exist without an email being sent. In practice, the scheduler call is synchronous registration (not dispatch) and cannot fail independently of the action itself. If the action throws at any point, Convex rolls back the entire action including the `adapter.create` call — so there is no orphaned-row risk.

If the user wants to "resend" an invitation: calling `inviteByEmail` again for the same email will hit the `existingInvites.length > 0` check and throw `ALREADY_MEMBER`. A resend flow requires either: (a) canceling the pending invite first, or (b) a dedicated `resendInvitation` action. This is Phase 2 scope.

---

## §6. Stage 2c + 2c.1 supersession map (updated)

| Doc | Section | Status |
|---|---|---|
| Stage 2c | §8.1 `inviteByEmail` — `adapter.create`, no email | **SUPERSEDED — apply Stage 2c.2 §5** |
| Stage 2c | §8.4 `inviteByWhatsApp` — invitation creation concern | **CORRECTED (Stage 2c.1 §4.5) — no invitation creation; only member-count check** |
| Stage 2c.1 | §4.1 `sendInvitationEmail` wired callback + `buildInvitationEmailHtml` helper | **SUPERSEDED — apply Stage 2c.2 §2 (revert to no-op stub; delete helper)** |
| Stage 2c.1 | §4.4 `inviteByEmail` with `auth.api.inviteMember` | **SUPERSEDED — apply Stage 2c.2 §5** |
| Stage 2c.1 | §4.5 `inviteByWhatsApp` member-count change | **STANDS — apply as Stage 2c.1 §4.5** |
| Stage 2c.1 | §4.6 `validateAndJoin` verdict (`adapter.create` for member is correct) | **STANDS — confirmed** |
| Stage 2c.1 | §4.7 OQ-C3 closure (adapter bypasses hooks by design) | **STANDS — closed** |
| Stage 2c.1 | §3 `lib/utils.ts:slugify` | **STANDS — apply as Stage 2c.1 §3.3** |
| Stage 2c.1 | §2 `convex/onboarding.ts` zero-line diff | **STANDS — no change needed** |

---

## §7. New open questions

**OQ-2c2-A — `adapter.create` return shape (invitation id field)**

The invitation creation code uses `(invitation as { id?: string }).id` to construct the accept URL. This assumes `adapter.create` returns the created record with an `id` field. Two sub-questions:

1. Does `adapter.create` return the created row, or just `{ success: true }`? If the latter, the `invitationId` will be `""` and the invite URL will be malformed.
2. Is the id field named `id` or `_id`? Better Auth uses `id` in its TypeScript types; Convex native tables use `_id`. The Better Auth adapter normalizes this — but the exact shape returned by `adapter.create` must be verified at Stage 3.

**Stage 3 resolution**: `console.log("[INVITATION_CREATE]", JSON.stringify(invitation))` on first call in dev environment. Verify field name and presence before proceeding.

**OQ-2c2-B — Accept-invite route path format**

The invite URL is constructed as `/accept-invite/${invitationId}`. This assumes:
- A Next.js route exists at `app/accept-invite/[token]/page.tsx` (or similar)
- The `[token]` param is the Better Auth invitation record's `id`
- Better Auth's `acceptInvitation` API accepts this id directly

Stage 2c §16 listed `app/accept-invite/` as Stage 2d scope. Stage 2d must verify that the route reads `params.token` and calls `authClient.organization.acceptInvitation({ invitationId: params.token })` (or whatever the actual Better Auth client API is).

If Better Auth uses a different token format for invitation acceptance (e.g., a signed JWT, not the raw id), the URL construction here must change. Stage 3 checks Better Auth docs for `acceptInvitation` parameter shape.

**OQ-2c2-C — `inviter.name` reliability**

`inviterName` falls back to `"WABDesk"` if `inviter?.name` is null. The `user.name` field in Better Auth is populated during signup. For users who signed up via Google/Facebook OAuth, `name` is typically populated from the OAuth profile. For email/password signup, `name` depends on whether the signup form collects it. If the signup form (Stage 2d scope) doesn't collect a name, `inviter.name` may be null for all users until they set it manually.

This is a UX note only — the fallback `"WABDesk"` is safe. No code change needed.

**OQ-2c2-D — `locale: "ar"` hardcoded for invitation email**

The `inviteByEmail` action always sends `locale: "ar"` to the send action. The invitation template renders both AR and EN sections regardless of locale. The `locale` prop affects the outer HTML `dir` attribute (RTL for "ar", LTR for "en") and the heading/previewText language.

Consequence: English invitees will receive an email with the heading in Arabic and `dir="rtl"` at the HTML level. Both language sections are present so they can read the English block. This is acceptable for v1 (Arabic-first product). Phase 2 improvement: derive locale from organization metadata or invitee preference.

---

## §8. Stage 3 application order update

```
[Stage 2c.2] convex/emails/templates/invitation.tsx   (NEW — no dependencies)
    ↓
[Stage 2c.2] convex/actions/sendEmail.ts              (add import + SUBJECTS entry + buildElement case)
    ↓
[Stage 2c.2] convex/orgMembers.ts:inviteByEmail       (calls internal.actions.sendEmail.sendEmail)

[Stage 2c.2] convex/auth.ts:sendInvitationEmail       (no-op stub — independent; can apply first or last in Stage 3)
```

The `lib/utils.ts:slugify` (Stage 2c.1 §3) and `convex/onboarding.ts` (Stage 2c.1 §2, zero-line diff) are independent of the above chain and can apply at any point.

Full Stage 3 dependency graph (all sub-stages combined):

```
1. npx auth generate                               → produces convex/betterAuth/schema.ts
2. package.json deps                               → Stage 2a §4.1
3. convex/convex.config.ts                         → Stage 2a §4.2
4. convex/betterAuth/auth.ts + convex.config.ts    → Stage 2a (local install files)
5. convex/auth.config.ts                           → Stage 2a §4.3
6. convex/auth.ts (full new file)                  → Stage 2a §5.1
   — sendInvitationEmail = no-op stub with comment (Stage 2c.2 §2)
   — buildInvitationEmailHtml = NOT added (Stage 2c.1 §4.1 superseded)
7. convex/http.ts                                  → Stage 2a §4.4
8. lib/auth-client.ts                              → Stage 2a
9. lib/auth-server.ts                              → Stage 2a
10. app/api/auth/[...all]/route.ts                 → Stage 2a
11. lib/utils.ts:slugify                           → Stage 2c.1 §3
12. convex/lib/auth.ts                             → Stage 2b
13. middleware.ts deletion                         → Stage 2b (coordinate with Stage 2d)
14. convex/lib/planLimits.ts                       → Stage 2c §3 (D1 approved)
15. convex/lib/lastAdmin.ts                        → Stage 2c §4
16. convex/lib/emailHelpers.ts                     → Stage 2c §5
17. convex/actions/notifyEmail.ts                  → Stage 2c §6
18. convex/actions/channelRetentionAction.ts       → Stage 2c §7
19. convex/orgMembers.ts (all mutations)           → Stage 2c §8, 2c.1 §4.5, 2c.2 §5
20. convex/members.ts (all mutations)              → Stage 2c §9
21. convex/teamPresence.ts                         → Stage 2c §10
22. convex/actions/validateInvite.ts               → Stage 2c §11
23. convex/actions/roundRobin.ts                   → Stage 2c §12
24. convex/emails/templates/invitation.tsx         → Stage 2c.2 §4 (NEW)
25. convex/actions/sendEmail.ts                    → Stage 2c.2 §3
26. All Stage 2d frontend files                    → Stage 2d
```

---

## §9. Out of scope

The following files are NOT modified by Stage 2c.2:

| File | Owner stage |
|---|---|
| `convex/orgMembers.ts:inviteByWhatsApp` | Stage 2c.1 §4.5 (stands) |
| `convex/actions/validateInvite.ts:validateAndJoin` | Stage 2c §11 (stands) |
| `convex/members.ts` | Stage 2c §9 |
| `convex/teamPresence.ts` | Stage 2c §10 |
| `convex/lib/emailHelpers.ts` | Stage 2c §5 |
| `convex/actions/notifyEmail.ts` | Stage 2c §6 |
| `convex/actions/channelRetentionAction.ts` | Stage 2c §7 |
| `convex/lib/planLimits.ts` | Stage 2c §3 (D1 approved) |
| `convex/lib/lastAdmin.ts` | Stage 2c §4 |
| `convex/actions/roundRobin.ts` | Stage 2c §12 |
| `convex/lib/utils.ts:slugify` | Stage 2c.1 §3 (stands) |
| `convex/onboarding.ts` | Stage 2c.1 §2 (zero-line diff) |
| All Stage 2a/2b files | Already planned |
| All Stage 2d frontend files | Stage 2d |
| Avatar functions (9.6/9.7/9.8) | D2 = Option B; Stage 2c §9 (stands) |

---

*End of Stage 2c.2 — Path B Implementation Plan.*
