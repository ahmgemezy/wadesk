# Notification Prefs — Stage 5: Email Templates

> Implementer: GLM 5.1.
> Reviewer: Claude Code.
> Approver: Ahmed.
>
> Apply Stage 5 AFTER Stages 1–4 are landed and `npx tsc --noEmit` is clean.
> Stage 5 produces 3 React Email templates and updates `sendEmail.ts` (imports,
> SUBJECTS, buildElement) plus `notifyEmail.ts` (mapEventToTemplateKey null returns
> replaced, dead guard removed, return type narrowed). After Stage 5, every
> toggleable event has a working email channel.
> Stage 6 (final integration) follows.

---

## Pre-flight checklist

Verify the following before applying any edit. Stage 1 touched both action files;
these counts reflect the post-Stage-1 state. Use `wc -l` to confirm.

| File | Expected lines (post-Stage-1) | Touched in Stage 5 |
| ---- | ----------------------------- | ------------------- |
| `convex/actions/sendEmail.ts` | 157 (Stage 1 does NOT touch this file) | Yes — imports, SUBJECTS, buildElement |
| `convex/actions/notifyEmail.ts` | ~270 (Stage 1 appended ~70 lines) | Yes — mapEventToTemplateKey + notifySend |
| `convex/emails/templates/conversationTransferred.tsx` | does not exist | NEW |
| `convex/emails/templates/conversationReopened.tsx` | does not exist | NEW |
| `convex/emails/templates/csatReceived.tsx` | does not exist | NEW |

Confirmation commands before starting:

```bash
wc -l convex/actions/sendEmail.ts convex/actions/notifyEmail.ts
ls convex/emails/templates/
```

Expected `ls` output (no `conversationTransferred`, `conversationReopened`, or `csatReceived` yet):

```
agentWelcome.tsx           billingSubscriptionExpired.tsx  channelExpiringSoon.tsx
newAssignment.tsx          billingPaymentFailed.tsx        channelDeleted.tsx
followupDue.tsx            slaBreach.tsx
```

**Stop and report** if `sendEmail.ts` is not 157 lines — another stage touched it unexpectedly.

---

## Section 1 — Canonical template structure (Task A)

Reference template: `convex/emails/templates/newAssignment.tsx` (51 lines).
`slaBreach.tsx` and `followupDue.tsx` were also read for cross-verification.

### Imports pattern

```ts
import * as React from "react";
import { Text } from "@react-email/components";      // ONLY Text — not Html/Head/Body/Container
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";  // omit if template has no highlight box
```

**Critical observation:** Templates import ONLY `Text` from `@react-email/components`. The
`Html`, `Head`, `Body`, `Container`, `Section`, and `Preview` elements live inside
`WaEmailLayout` (`convex/emails/base.tsx`). Do NOT import them in template files.

### Component signature

```ts
interface Props { locale: "ar" | "en"; variables: Record<string, string>; }
```

This is the uniform type across ALL existing templates. Variables are not typed individually
per template — they use `Record<string, string>` and destructure by key in the component body.
This is required because `sendEmail.ts` calls `React.createElement(Template, { locale, variables })`
where `variables` is `Record<string, string>`.

### Export style

**Named exports** — not default exports. Every existing template uses
`export function TemplateName(...)`. Stage 5 templates MUST follow this pattern.

`sendEmail.ts`'s `buildElement` calls `React.createElement(TemplateName, props)` using
the named export. A default export would still work at runtime but breaks the naming
convention and creates a TypeScript mismatch with how the other imports are typed.

### Locale handling pattern

Two fully separate JSX return blocks — not a single tree with ternaries:

```ts
if (locale === "ar") {
  return ( <WaEmailLayout locale="ar" ...>{/* Arabic body */}</WaEmailLayout> );
}
return ( <WaEmailLayout locale="en" ...>{/* English body */}</WaEmailLayout> );
```

Inside each block, inline shared values like `inboxUrl`, `font`, and `textStyle` are
computed once in the component body and reused across both branches.

### Subject line source

Subjects live in `sendEmail.ts`'s `SUBJECTS` map (`Record<string, Record<"ar" | "en", string>>`).
Templates do NOT define or render their own subject lines. The `resolveSubject` function
in `sendEmail.ts` performs `{{variable}}` interpolation — e.g., `{{contactName}}` is
replaced at send time using the same `variables` object passed to the template.

Verified entry example (line 37–40 of `sendEmail.ts`):
```ts
new_assignment: {
  ar: "إشعار: محادثة جديدة تم تعيينها إليك",
  en: "Notification: New Conversation Assigned to You",
},
```

### `WaEmailLayout` props (the shared base)

```ts
<WaEmailLayout
  locale="ar"            // "ar" | "en" — drives dir="rtl/ltr" and font choice
  accentColor="#10B981"  // hex — header background colour
  icon="💬"             // emoji — displayed in header above "WABDesk"
  heading="..."          // string — large bold heading inside white body section
  previewText="..."      // optional string — invisible preview for email client pane
>
  {children}             // body content: Text elements, WaSection, WaButton
</WaEmailLayout>
```

RTL is fully handled by `WaEmailLayout` (`dir="rtl"` on `<Html>`, Cairo font in `<Head>`).
Templates do NOT add their own `dir` attributes — that would be redundant.

### `textStyle` pattern (copy verbatim per template)

```ts
const isRtl = locale === "ar";
const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
const textStyle = {
  color: "#334155",
  fontSize: 15,
  lineHeight: "1.7",
  margin: "0 0 12px",
  textAlign: (isRtl ? "right" : "left") as "right" | "left",
  direction: (isRtl ? "rtl" : "ltr") as "rtl" | "ltr",
  fontFamily: font,
};
```

### `WaButton` href URL pattern

```ts
const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
```

`appUrl` is **not** `process.env.NEXT_PUBLIC_APP_URL` inside templates. It comes from
`variables.appUrl` — injected by `sendEmail.ts`'s handler (lines 111–114):

```ts
const enrichedVariables: Record<string, string> = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://wabdesk.com",
  ...args.variables,
};
```

Templates read `variables.appUrl`. They never touch `process.env` directly.

### `WaSection` constraints

`WaSection` wraps its `children` in a `<Text>` element internally. Pass only plain strings
(or simple string template literals) as children — never nested JSX elements like `<strong>`,
`<Text>`, or `<span>`. Those are valid in the body `<Text style={textStyle}>` blocks, not
inside `<WaSection>`.

### No unsubscribe footer in existing templates

None of the 8 existing templates include an unsubscribe link. The footer in `WaEmailLayout`
reads: "هذه رسالة تشغيلية تلقائية" / "This is an automated transactional email". Stage 5
templates match this — no unsubscribe link added.

### No `"use node"` in template files

`"use node"` appears only in `convex/actions/sendEmail.ts` and `convex/actions/notifyEmail.ts`.
Template files are pure React components rendered server-side by `sendEmail.ts`; they do not
need the directive.

---

## Section 2 — Variables types (Task B)

These types document what the template receives. They are NOT declared as TypeScript types
in the template files (which use `Record<string, string>` uniformly). They exist here as
a contract between Stage 2 call sites and Stage 5 templates.

### 2a — ConversationTransferred (Stage 2 site M4)

```ts
// Variables available in conversationTransferred.tsx (all strings):
// contactName    — customer display name
// targetDept     — target department or team name (toName in M4)
// actorName      — agent who performed the transfer
// conversationId — Convex conversation _id
// appUrl         — injected by sendEmail.ts; DO NOT pass from call site
```

Stage 2 M4 emailVariables:
```ts
emailVariables: {
  contactName,
  targetDept: toName,   // renamed to targetDept in the template destructure
  actorName,
  conversationId: args.conversationId,
}
```

### 2b — ConversationReopened (Stage 2 site M6)

```ts
// Variables available in conversationReopened.tsx (all strings):
// contactName    — customer display name
// channelName    — WhatsApp channel display name
// conversationId — Convex conversation _id
// appUrl         — injected by sendEmail.ts; DO NOT pass from call site
```

Stage 2 M6 emailVariables:
```ts
emailVariables: {
  contactName,
  channelName,
  conversationId: conversation._id,
}
```

### 2c — CsatReceived (Stage 2 site A3)

```ts
// Variables available in csatReceived.tsx (all strings):
// contactName    — customer display name
// score          — "1" | "2" | "3" | "4" | "5" (String(score) from A3)
// conversationId — Convex conversation _id
// appUrl         — injected by sendEmail.ts; DO NOT pass from call site
```

Stage 2 A3 emailVariables:
```ts
emailVariables: {
  contactName: csatContactName,
  score: String(score),          // always a string — explicit cast in A3
  conversationId: conversation._id,
}
```

**Score rendering:** convert to number via `Number(score)` in the template body.
Clamp with `Math.min(5, Math.max(1, Number(score) || 1))` to guard against
malformed values. Render as `"★".repeat(scoreNum) + "☆".repeat(5 - scoreNum)`.

---

## Section 3 — SUBJECTS additions (Task C)

### 3a — BEFORE block (current `sendEmail.ts` SUBJECTS map, lines 16–53)

```ts
const SUBJECTS: Record<string, Record<"ar" | "en", string>> = {
  channel_expiring_soon: {
    ar: "إجراء مطلوب: سيُحذف رقم واتساب خلال {{daysLeft}} أيام",
    en: "Action Required: WhatsApp Number Deletes in {{daysLeft}} Days",
  },
  channel_deleted: {
    ar: "تم حذف رقم واتساب نهائياً",
    en: "WhatsApp Number Permanently Deleted",
  },
  sla_breach: {
    ar: "تنبيه: تجاوز وقت الاستجابة المسموح به",
    en: "Alert: SLA Response Time Exceeded",
  },
  followup_due_sent: {
    ar: "تم إرسال متابعة {{contactName}} بنجاح",
    en: "Follow-up sent to {{contactName}}",
  },
  followup_due_failed: {
    ar: "فشل إرسال متابعة {{contactName}}",
    en: "Follow-up to {{contactName}} failed",
  },
  new_assignment: {
    ar: "إشعار: محادثة جديدة تم تعيينها إليك",
    en: "Notification: New Conversation Assigned to You",
  },
  agent_welcome: {
    ar: "مرحباً بك في WABDesk",
    en: "Welcome to WABDesk",
  },
  billing_payment_failed: {
    ar: "فشل تجديد الاشتراك — يرجى تحديث بيانات الدفع",
    en: "Subscription Payment Failed — Action Required",
  },
  billing_subscription_expired: {
    ar: "انتهت صلاحية الاشتراك",
    en: "Your Subscription Has Expired",
  },
};
```

### 3b — AFTER block (add 3 entries before the closing `};`)

```ts
const SUBJECTS: Record<string, Record<"ar" | "en", string>> = {
  channel_expiring_soon: {
    ar: "إجراء مطلوب: سيُحذف رقم واتساب خلال {{daysLeft}} أيام",
    en: "Action Required: WhatsApp Number Deletes in {{daysLeft}} Days",
  },
  channel_deleted: {
    ar: "تم حذف رقم واتساب نهائياً",
    en: "WhatsApp Number Permanently Deleted",
  },
  sla_breach: {
    ar: "تنبيه: تجاوز وقت الاستجابة المسموح به",
    en: "Alert: SLA Response Time Exceeded",
  },
  followup_due_sent: {
    ar: "تم إرسال متابعة {{contactName}} بنجاح",
    en: "Follow-up sent to {{contactName}}",
  },
  followup_due_failed: {
    ar: "فشل إرسال متابعة {{contactName}}",
    en: "Follow-up to {{contactName}} failed",
  },
  new_assignment: {
    ar: "إشعار: محادثة جديدة تم تعيينها إليك",
    en: "Notification: New Conversation Assigned to You",
  },
  agent_welcome: {
    ar: "مرحباً بك في WABDesk",
    en: "Welcome to WABDesk",
  },
  billing_payment_failed: {
    ar: "فشل تجديد الاشتراك — يرجى تحديث بيانات الدفع",
    en: "Subscription Payment Failed — Action Required",
  },
  billing_subscription_expired: {
    ar: "انتهت صلاحية الاشتراك",
    en: "Your Subscription Has Expired",
  },
  conversation_transferred: {
    ar: "تم تحويل محادثة مع {{contactName}} إلى فريقك",
    en: "A conversation with {{contactName}} was transferred to your team",
  },
  conversation_reopened: {
    ar: "{{contactName}} أرسل رسالة جديدة في محادثة محسومة",
    en: "{{contactName}} replied to a resolved conversation",
  },
  csat_received: {
    ar: "تم استلام تقييم العميل",
    en: "Customer rating received",
  },
};
```

### 3c — Subject content rationale

| templateKey | English subject | Arabic subject |
| --- | --- | --- |
| `conversation_transferred` | A conversation with `{{contactName}}` was transferred to your team | تم تحويل محادثة مع `{{contactName}}` إلى فريقك |
| `conversation_reopened` | `{{contactName}}` replied to a resolved conversation | `{{contactName}}` أرسل رسالة جديدة في محادثة محسومة |
| `csat_received` | Customer rating received | تم استلام تقييم العميل |

- `{{contactName}}` is used in `conversation_transferred` and `conversation_reopened`
  because the agent needs to identify *whose* conversation this is from the subject alone.
- `csat_received` uses a static subject — the score detail is in the email body; the
  subject is intentionally neutral and non-alarming regardless of score value.
- The `resolveSubject` function in `sendEmail.ts` will substitute `{{contactName}}`
  automatically since `contactName` is in the variables payload for both events.

---

## Section 4 — `mapEventToTemplateKey` update (Task D)

Both the `mapEventToTemplateKey` function and the dead `if (!templateKey)` guard in
`notifySend` must be updated together.

**Naming note:** Stage 1's inline comments say "Stage 6 — template TBD" for the three
null cases. The planning document numbering shifted — Stage 5 is where templates land,
and Stage 6 is the final integration pass. Remove those stale comments when applying
the AFTER block.

### 4a — BEFORE block (post-Stage-1 state of the relevant portion of `notifyEmail.ts`)

```ts
export const notifySend = internalAction({
  args: {
    userId: v.string(),
    tenantId: v.string(),
    eventType: toggleableEventTypeValidator,
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    const email = await resolveUserEmail(args.userId);
    if (!email) {
      console.warn("notifySend: user has no primary email", args.userId);
      return;
    }

    const locale = await ctx.runQuery(internal.lib.tenants.getEmailLocale, {
      tenantId: args.tenantId,
    });
    const templateKey = mapEventToTemplateKey(args.eventType);
    if (!templateKey) {
      // Event has no email template yet (e.g. csat_received before Stage 6).
      // Silent skip — in-app row already fired upstream.
      return;
    }

    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey,
      locale,
      variables: args.variables,
    });
  },
});

/**
 * Maps a toggleable eventType to the matching templateKey understood by
 * sendEmail. Templates that don't exist yet return null — Stage 6 fills these in.
 */
function mapEventToTemplateKey(eventType: ToggleableEventType): string | null {
  switch (eventType) {
    case "sla_breach":               return "sla_breach";
    case "followup_due":             return "followup_due_sent";
    case "conversation_assigned":    return "new_assignment";
    case "channel_expiring_soon":    return "channel_expiring_soon";
    case "conversation_transferred": return null; // Stage 6 — template TBD
    case "conversation_reopened":    return null; // Stage 6 — template TBD
    case "csat_received":            return null; // Stage 6 — template TBD
  }
}
```

### 4b — AFTER block (Stage 5 changes: dead guard removed, type narrowed, null returns replaced)

```ts
export const notifySend = internalAction({
  args: {
    userId: v.string(),
    tenantId: v.string(),
    eventType: toggleableEventTypeValidator,
    variables: v.any(),
  },
  handler: async (ctx, args) => {
    const email = await resolveUserEmail(args.userId);
    if (!email) {
      console.warn("notifySend: user has no primary email", args.userId);
      return;
    }

    const locale = await ctx.runQuery(internal.lib.tenants.getEmailLocale, {
      tenantId: args.tenantId,
    });
    const templateKey = mapEventToTemplateKey(args.eventType);

    await ctx.runAction(internal.actions.sendEmail.sendEmail, {
      to: email,
      templateKey,
      locale,
      variables: args.variables,
    });
  },
});

function mapEventToTemplateKey(eventType: ToggleableEventType): string {
  switch (eventType) {
    case "sla_breach":               return "sla_breach";
    case "followup_due":             return "followup_due_sent";
    case "conversation_assigned":    return "new_assignment";
    case "channel_expiring_soon":    return "channel_expiring_soon";
    case "conversation_transferred": return "conversation_transferred";
    case "conversation_reopened":    return "conversation_reopened";
    case "csat_received":            return "csat_received";
  }
}
```

### 4c — Return type discussion

**Verdict: narrow to `string`** and remove the dead guard.

After Stage 5, every `switch` branch returns a non-null string. The `string | null` return
type kept the `if (!templateKey)` guard in `notifySend` in sync, but that guard is now dead
code — every real path through the switch returns a non-empty string.

TypeScript will NOT independently flag the dead `if (!templateKey)` guard even after the
narrowing (because `if (!someString)` is valid TypeScript — empty strings are falsy). The
guard must be removed explicitly.

Removing the guard is safe because:
1. `mapEventToTemplateKey` now covers all 7 `ToggleableEventType` values with non-null returns.
2. The exhaustive switch (no `default:` branch) means TypeScript will catch any new
   `ToggleableEventType` added to `notificationEvents.ts` that isn't handled here — forcing
   a deliberate decision rather than a silent null.
3. `buildElement` in `sendEmail.ts` already throws `TEMPLATE_NOT_FOUND` if an unknown key
   reaches it — so there is a hard runtime safety net even without the soft guard in
   `notifySend`.

The JSDoc comment on `mapEventToTemplateKey` that said "Stage 6 fills these in" is now
stale — drop the entire JSDoc block (the function name is self-explanatory).

**Net line change in `notifyEmail.ts`:** `-5` lines (removing the 4-line `if (!templateKey)`
block and its preceding blank line, plus the JSDoc comment removal offset by the comment
rewrite — approximately -5 to -8 lines net depending on blank lines).

---

## Section 5 — Email template files (Task E)

Three new files. Each uses named exports, `Record<string, string>` props, two locale
branches, and the `WaEmailLayout` + `WaButton` + `WaSection` pattern.

**Apply order for `sendEmail.ts`:**
1. Add 3 import lines (after existing template imports, before the blank line at line 15).
2. Add 3 SUBJECTS entries (inside the SUBJECTS `const`, before the closing `};`).
3. Add 3 `buildElement` cases (before the `default:` throw).

The 3 new template files can be created in any order. Create them first, then update
`sendEmail.ts`, then `notifyEmail.ts`.

---

### 5a — `convex/emails/templates/conversationTransferred.tsx` (full file)

Accent colour: `#8B5CF6` (purple — visually distinct from green assignments and red alerts).
Icon: `🔀` (shuffle — conveys routing/transfer).

```tsx
import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function ConversationTransferred({ locale, variables }: Props) {
  const { contactName, targetDept, actorName, conversationId, appUrl } = variables;
  const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = {
    color: "#334155",
    fontSize: 15,
    lineHeight: "1.7",
    margin: "0 0 12px",
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
    direction: (isRtl ? "rtl" : "ltr") as "rtl" | "ltr",
    fontFamily: font,
  };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#8B5CF6" icon="🔀"
        heading="تم تحويل محادثة إلى فريقك"
        previewText={`قام ${actorName} بتحويل محادثة مع ${contactName} إلى ${targetDept}`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          قام <strong>{actorName}</strong> بتحويل محادثة مع <strong>{contactName}</strong> إلى فريق <strong>{targetDept}</strong>.
        </Text>
        <WaSection locale="ar">سجّل دخولك إلى WABDesk للرد على العميل.</WaSection>
        <WaButton href={inboxUrl} locale="ar">فتح المحادثة</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#8B5CF6" icon="🔀"
      heading="A Conversation Was Transferred to Your Team"
      previewText={`${actorName} transferred a conversation with ${contactName} to ${targetDept}`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{actorName}</strong> transferred a conversation with <strong>{contactName}</strong> to <strong>{targetDept}</strong>.
      </Text>
      <WaSection locale="en">Log in to WABDesk to reply to the customer.</WaSection>
      <WaButton href={inboxUrl} locale="en">Open Conversation</WaButton>
    </WaEmailLayout>
  );
}
```

**`sendEmail.ts` additions for this template:**

Import (add after the `BillingSubscriptionExpired` import line):
```ts
import { ConversationTransferred } from "../emails/templates/conversationTransferred";
```

`buildElement` case (add before `default:`):
```ts
    case "conversation_transferred":
      return React.createElement(ConversationTransferred, props);
```

---

### 5b — `convex/emails/templates/conversationReopened.tsx` (full file)

Accent colour: `#F59E0B` (amber — signals a state change that needs attention, mirrors
`followupDue`'s amber-on-failure tone but for a different trigger).
Icon: `🔄` (loop/refresh — conveys re-opening).

```tsx
import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function ConversationReopened({ locale, variables }: Props) {
  const { contactName, channelName, conversationId, appUrl } = variables;
  const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = {
    color: "#334155",
    fontSize: 15,
    lineHeight: "1.7",
    margin: "0 0 12px",
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
    direction: (isRtl ? "rtl" : "ltr") as "rtl" | "ltr",
    fontFamily: font,
  };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#F59E0B" icon="🔄"
        heading="عاد العميل للرد على محادثة محسومة"
        previewText={`${contactName} أرسل رسالة جديدة في محادثة تم إغلاقها مسبقاً`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          أرسل <strong>{contactName}</strong> رسالة جديدة في محادثة محسومة سابقاً في قناة <strong>{channelName}</strong>. تم إعادة فتح المحادثة تلقائياً.
        </Text>
        <WaSection locale="ar">يرجى الرد في أقرب وقت لتقديم أفضل خدمة.</WaSection>
        <WaButton href={inboxUrl} locale="ar">فتح المحادثة</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#F59E0B" icon="🔄"
      heading="A Customer Replied to a Resolved Conversation"
      previewText={`${contactName} sent a new message in a previously resolved conversation`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{contactName}</strong> sent a new message in a previously resolved conversation
        in channel <strong>{channelName}</strong>. The conversation has been automatically reopened.
      </Text>
      <WaSection locale="en">Please reply soon to provide the best experience.</WaSection>
      <WaButton href={inboxUrl} locale="en">Open Conversation</WaButton>
    </WaEmailLayout>
  );
}
```

**`sendEmail.ts` additions for this template:**

Import (add after the `ConversationTransferred` import line):
```ts
import { ConversationReopened } from "../emails/templates/conversationReopened";
```

`buildElement` case (add before `default:`, after `conversation_transferred` case):
```ts
    case "conversation_reopened":
      return React.createElement(ConversationReopened, props);
```

---

### 5c — `convex/emails/templates/csatReceived.tsx` (full file)

Accent colour: `#10B981` (green — CSAT is informational, not an alert; green matches the
positive-framing requirement).
Icon: `⭐` (star — obvious CSAT signal).
Score rendering: Unicode filled/empty stars (`★` / `☆`) computed in the component body.
Low scores are presented neutrally — "rated 1/5" not "negative review".

```tsx
import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function CsatReceived({ locale, variables }: Props) {
  const { contactName, score, conversationId, appUrl } = variables;
  const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
  const scoreNum = Math.min(5, Math.max(1, Number(score) || 1));
  const stars = "★".repeat(scoreNum) + "☆".repeat(5 - scoreNum);
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = {
    color: "#334155",
    fontSize: 15,
    lineHeight: "1.7",
    margin: "0 0 12px",
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
    direction: (isRtl ? "rtl" : "ltr") as "rtl" | "ltr",
    fontFamily: font,
  };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#10B981" icon="⭐"
        heading="تم استلام تقييم العميل"
        previewText={`${contactName} قيّم المحادثة بـ ${score}/5`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          قيّم <strong>{contactName}</strong> تجربته مع المحادثة الأخيرة.
        </Text>
        <WaSection locale="ar">{`التقييم: ${score} / 5 — ${stars}`}</WaSection>
        <WaButton href={inboxUrl} locale="ar">عرض المحادثة</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#10B981" icon="⭐"
      heading="Customer Rating Received"
      previewText={`${contactName} rated the conversation ${score}/5`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{contactName}</strong> rated their recent conversation experience.
      </Text>
      <WaSection locale="en">{`Rating: ${score} / 5 — ${stars}`}</WaSection>
      <WaButton href={inboxUrl} locale="en">View Conversation</WaButton>
    </WaEmailLayout>
  );
}
```

**`sendEmail.ts` additions for this template:**

Import (add after the `ConversationReopened` import line):
```ts
import { CsatReceived } from "../emails/templates/csatReceived";
```

`buildElement` case (add before `default:`, after `conversation_reopened` case):
```ts
    case "csat_received":
      return React.createElement(CsatReceived, props);
```

---

### 5d — Complete `sendEmail.ts` BEFORE/AFTER for imports and buildElement

For clarity, here are the exact surgical BEFORE/AFTER blocks for `sendEmail.ts`.

**Imports BEFORE** (lines 1–14):
```ts
"use node";

import * as React from "react";
import { render } from "@react-email/render";
import { internalAction } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { ChannelExpiringSoon } from "../emails/templates/channelExpiringSoon";
import { ChannelDeleted } from "../emails/templates/channelDeleted";
import { SlaBreach } from "../emails/templates/slaBreach";
import { FollowupDue } from "../emails/templates/followupDue";
import { NewAssignment } from "../emails/templates/newAssignment";
import { AgentWelcome } from "../emails/templates/agentWelcome";
import { BillingPaymentFailed } from "../emails/templates/billingPaymentFailed";
import { BillingSubscriptionExpired } from "../emails/templates/billingSubscriptionExpired";
```

**Imports AFTER** (lines 1–17):
```ts
"use node";

import * as React from "react";
import { render } from "@react-email/render";
import { internalAction } from "../_generated/server";
import { v, ConvexError } from "convex/values";
import { ChannelExpiringSoon } from "../emails/templates/channelExpiringSoon";
import { ChannelDeleted } from "../emails/templates/channelDeleted";
import { SlaBreach } from "../emails/templates/slaBreach";
import { FollowupDue } from "../emails/templates/followupDue";
import { NewAssignment } from "../emails/templates/newAssignment";
import { AgentWelcome } from "../emails/templates/agentWelcome";
import { BillingPaymentFailed } from "../emails/templates/billingPaymentFailed";
import { BillingSubscriptionExpired } from "../emails/templates/billingSubscriptionExpired";
import { ConversationTransferred } from "../emails/templates/conversationTransferred";
import { ConversationReopened } from "../emails/templates/conversationReopened";
import { CsatReceived } from "../emails/templates/csatReceived";
```

**`buildElement` BEFORE** (lines 67–95):
```ts
function buildElement(
  templateKey: string,
  locale: "ar" | "en",
  variables: Record<string, string>,
): React.ReactElement {
  const props = { locale, variables };
  switch (templateKey) {
    case "channel_expiring_soon":
      return React.createElement(ChannelExpiringSoon, props);
    case "channel_deleted":
      return React.createElement(ChannelDeleted, props);
    case "sla_breach":
      return React.createElement(SlaBreach, props);
    case "followup_due":
    case "followup_due_sent":
    case "followup_due_failed":
      return React.createElement(FollowupDue, props);
    case "new_assignment":
      return React.createElement(NewAssignment, props);
    case "agent_welcome":
      return React.createElement(AgentWelcome, props);
    case "billing_payment_failed":
      return React.createElement(BillingPaymentFailed, props);
    case "billing_subscription_expired":
      return React.createElement(BillingSubscriptionExpired, props);
    default:
      throw new ConvexError(`TEMPLATE_NOT_FOUND: ${templateKey}`);
  }
}
```

**`buildElement` AFTER** (3 cases added before `default:`):
```ts
function buildElement(
  templateKey: string,
  locale: "ar" | "en",
  variables: Record<string, string>,
): React.ReactElement {
  const props = { locale, variables };
  switch (templateKey) {
    case "channel_expiring_soon":
      return React.createElement(ChannelExpiringSoon, props);
    case "channel_deleted":
      return React.createElement(ChannelDeleted, props);
    case "sla_breach":
      return React.createElement(SlaBreach, props);
    case "followup_due":
    case "followup_due_sent":
    case "followup_due_failed":
      return React.createElement(FollowupDue, props);
    case "new_assignment":
      return React.createElement(NewAssignment, props);
    case "agent_welcome":
      return React.createElement(AgentWelcome, props);
    case "billing_payment_failed":
      return React.createElement(BillingPaymentFailed, props);
    case "billing_subscription_expired":
      return React.createElement(BillingSubscriptionExpired, props);
    case "conversation_transferred":
      return React.createElement(ConversationTransferred, props);
    case "conversation_reopened":
      return React.createElement(ConversationReopened, props);
    case "csat_received":
      return React.createElement(CsatReceived, props);
    default:
      throw new ConvexError(`TEMPLATE_NOT_FOUND: ${templateKey}`);
  }
}
```

---

## Section 6 — Anti-instructions for GLM (Task F)

- **DO NOT use `useT()` inside templates.** `useT()` is a React client hook for browser DOM.
  React Email renders to HTML strings server-side inside `sendEmail.ts`'s `handler`; hooks
  do not work. Locale branching is done via the `locale` prop and inline ternaries.

- **DO NOT use default exports.** Every existing template uses named exports
  (`export function SlaBreach`, `export function NewAssignment`, etc.). Stage 5 templates
  MUST follow the same pattern. `buildElement` uses `React.createElement(NamedExport, props)`;
  a default export breaks the naming convention even if it compiles.

- **DO NOT use `Record<string, string>` alternatives.** The `Props` interface is
  `{ locale: "ar" | "en"; variables: Record<string, string>; }` for all templates — not
  a per-template typed Variables shape. This is required for `buildElement`'s
  `const props = { locale, variables }` to type-check across all template calls.

- **DO NOT read `process.env` inside templates.** `appUrl` comes from `variables.appUrl`
  (injected by `sendEmail.ts`'s handler). Templates are pure render functions — they receive
  everything through `variables`. Reading `process.env.NEXT_PUBLIC_APP_URL` in a template
  would work in some environments but breaks the rendering isolation contract.

- **DO NOT import `Html`, `Head`, `Body`, `Container`, `Section`, or `Preview` from
  `@react-email/components` in template files.** Those elements are encapsulated inside
  `WaEmailLayout`. Templates import only `Text` (and nothing else from `@react-email/components`
  unless a new element is genuinely needed and cross-verified against existing templates).

- **DO NOT add `"use node"` to template files.** The directive lives in `sendEmail.ts`
  and `notifyEmail.ts`. Template files are plain React components with no Convex or
  Node.js dependencies.

- **DO NOT put JSX elements inside `<WaSection>` children.** `WaSection` wraps its
  children in a `<Text>` internally — nesting another `<Text>` or `<strong>` produces
  invalid HTML (`<p>` inside `<p>`). Pass only plain strings or template literals as
  `WaSection` children.

- **DO NOT use Tailwind classes in templates.** React Email uses inline styles only.
  Match the `textStyle` object pattern from existing templates.

- **DO NOT reach for `process.env.RESEND_*` keys inside templates.** Resend API handling
  is in `sendEmail.ts` only. Templates only render content.

- **DO NOT add a 4th template.** Scope is locked at 3 events.

- **DO NOT introduce new email components.** Use existing `WaEmailLayout`, `WaButton`,
  `WaSection`. If you believe a new component is needed, stop and flag it — do not create
  one silently.

- **DO NOT import from `convex/_generated/` inside templates.** Templates are content
  renderers; their inputs arrive through the `variables` object.

- **DO NOT add unsubscribe links.** No existing template has one. User preferences (the
  UI from Stage 3/4) are the unsubscribe mechanism.

- **DO NOT alarm-frame the CSAT email for low scores.** The subject is "Customer rating
  received" regardless of score value. The score appears in the body as a neutral fact.
  Do not add conditional language like "Negative review" or "Dissatisfied customer" for
  low scores.

- **DO NOT remove the `if (!email)` guard in `notifySend`.** Only the `if (!templateKey)`
  guard is dead code and must be removed. The email-resolution guard is still live.

- **DO NOT add a JSDoc comment to `mapEventToTemplateKey` after Stage 5.** The old JSDoc
  mentioned "Stage 6 fills these in" — that is stale. The function name is self-explanatory
  and does not need a comment.

- **DO NOT modify the `fromAddress` routing in `sendEmail.ts`.** The 3 new templates fall
  into the default `"WABDesk <noreply@wabdesk.com>"` sender bucket (they are neither
  `BILLING_TEMPLATES` nor `ALERT_TEMPLATES`). No changes to that logic.

---

## Verification — what GLM must paste back after Stage 5 application

1. **Literal `npx tsc --noEmit` output.** Paste exactly what the terminal emits (empty
   stdout = success). Do not paraphrase. Exit code must be 0.

2. **Diff summary via `git diff --stat`** — expected output should show exactly:
   ```
    convex/actions/notifyEmail.ts     |  ~8 lines changed
    convex/actions/sendEmail.ts       | ~25 lines changed
    convex/emails/templates/conversationReopened.tsx   | 52 lines (new)
    convex/emails/templates/conversationTransferred.tsx | 52 lines (new)
    convex/emails/templates/csatReceived.tsx           | 56 lines (new)
    5 files changed, ~185 insertions(+), ~8 deletions(-)
   ```
   (Exact numbers will vary ±5 — the shape matters more than the exact count.)

3. **Email preview verification.** Check `package.json` for the preview script:
   ```bash
   grep '"email"' package.json
   ```
   The script likely reads `email dev --dir emails --port 3100`. The templates live in
   `convex/emails/templates/` — verify whether `--dir emails` resolves to the correct
   path before running. If the path is wrong, report it rather than fixing the script
   (fixing `package.json` is out of Stage 5 scope). If the path resolves correctly, run
   `npm run email` and confirm all 3 new templates appear in the browser preview at
   `http://localhost:3100` with both AR and EN variants rendering visually.

4. **Anti-instruction confirmation.** State explicitly which anti-instructions (if any)
   required judgment calls during application.

5. **`git status` output** — must show exactly 5 changed paths:
   `convex/actions/sendEmail.ts`,
   `convex/actions/notifyEmail.ts`,
   `convex/emails/templates/conversationTransferred.tsx` (new),
   `convex/emails/templates/conversationReopened.tsx` (new),
   `convex/emails/templates/csatReceived.tsx` (new).
   Anything else in `git status` is a violation — stop and report.

---

## Stage 5 — completion criteria

- [ ] 3 new files: `convex/emails/templates/{conversationTransferred,conversationReopened,csatReceived}.tsx`
- [ ] `convex/actions/sendEmail.ts` updated: 3 import lines, 3 SUBJECTS entries, 3 `buildElement` cases
- [ ] `convex/actions/notifyEmail.ts` updated: `mapEventToTemplateKey` null returns replaced, return type `string | null` → `string`, dead `if (!templateKey)` guard removed
- [ ] `npx tsc --noEmit` clean (empty stdout, exit 0)
- [ ] All 3 templates render in the email preview tool (or path discrepancy reported)
- [ ] No changes to `PROGRESS.md`, `CLAUDE.md`, `PROJECT_STATE.md`
- [ ] No changes to any file outside the 5 listed above
- [ ] Stage 6 (final integration) is the only stage remaining

---

## Stage 5 — risk flags

- **Email preview script path mismatch.** `package.json` runs `email dev --dir emails`.
  Templates live in `convex/emails/templates/`. Verify the `--dir` flag resolves before
  attempting preview. If it doesn't resolve, flag and skip preview verification — do not
  change `package.json` as a workaround.

- **`variables: v.any()` vs `v.record(v.string(), v.string())` mismatch.** `notifySend`
  declares `variables: v.any()` and passes it through to `sendEmail`'s `variables: v.record(v.string(), v.string())`.
  TypeScript won't complain (`any` is assignable to anything). Runtime safety depends on
  Stage 2 call sites passing only string values — which they do (`String(score)` is explicit
  in A3). Not a Stage 5 blocker, but flag if you see a runtime `ArgumentValidationError`
  on `variables` during integration testing.

- **`★` / `☆` Unicode in email clients.** Star characters are safe UTF-8 but may render
  as boxes in very old email clients (Outlook 2003-era). The codebase already uses emoji
  in template headings (🔴, 💬, 📅) which are higher risk than Unicode text characters —
  so star characters are acceptable by the existing bar. Flag if Ahmed wants a text
  alternative like `(4/5)`.

- **`WaSection` plain-string children constraint.** The `WaSection` component renders
  children inside a `<Text>` element. Passing anything other than a string (e.g., a JSX
  element) would produce invalid HTML. All 3 Stage 5 templates comply — verify during
  TSC run.

- **Stage 1 not yet applied.** Stage 5 depends on `notifySend` and `mapEventToTemplateKey`
  existing in `notifyEmail.ts`. Verify `wc -l convex/actions/notifyEmail.ts` shows ~270
  before applying. If it shows 199 (Stage 1 not applied), stop — Stage 1 must land first.

- **Named export mismatch in `buildElement`.** If a template file accidentally uses
  `export default function` instead of `export function`, TypeScript will still compile
  (because `React.createElement` accepts any component type), but the import would need
  to be `import ConversationTransferred from "..."` (default import) rather than
  `import { ConversationTransferred } from "..."` (named import). A named import of a
  default export produces `undefined`, which causes a silent render failure at runtime.
  The TSC run will NOT catch this. Verify all 3 template files use `export function` (named).

*If you disagree with any decision above, explain before complying with Stage 6.*
