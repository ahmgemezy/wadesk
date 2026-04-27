# Resend HTML Emails — Design Spec

**Date:** 2026-04-27  
**Status:** Approved  
**Scope:** Migrate all WaDesk transactional emails to React Email HTML templates and wire up 6 previously unwired/missing email types.

---

## 1. Goal

Replace the current plain-text email system in `convex/actions/sendEmail.ts` with a React Email–based HTML template system. All 8 email types will have bilingual (Arabic RTL + English LTR) branded HTML templates. The weekly digest email is explicitly deferred to a future milestone.

---

## 2. Email Inventory

| # | Key | Recipient | Trigger | Status |
|---|-----|-----------|---------|--------|
| 1 | `channel_expiring_soon` | Admin | Daily cron, days 25–29 | Exists — rewire to HTML |
| 2 | `channel_deleted` | Admin | Daily cron, day 30 | Exists — rewire to HTML |
| 3 | `sla_breach` | Agent / Supervisor | SLA threshold exceeded | Template only — wire up |
| 4 | `followup_due` | Agent | Follow-up due date fires | Template only — wire up |
| 5 | `new_assignment` | Agent | Conversation assigned | Template only — wire up |
| 6 | `agent_welcome` | Agent | Joins workspace first time | New — build + wire |
| 7 | `billing_payment_failed` | Admin | Paddle `transaction.payment_failed` webhook | New — build + wire |
| 8 | `billing_subscription_expired` | Admin | Paddle `subscription.canceled` webhook | New — build + wire |

---

## 3. Architecture

### Directory Structure

```
convex/
├── emails/
│   ├── base.tsx                          # Shared WaEmailLayout component
│   ├── components/
│   │   ├── wa-button.tsx                 # CTA button
│   │   └── wa-section.tsx               # Content block
│   └── templates/
│       ├── channel-expiring-soon.tsx
│       ├── channel-deleted.tsx
│       ├── sla-breach.tsx
│       ├── followup-due.tsx
│       ├── new-assignment.tsx
│       ├── agent-welcome.tsx
│       ├── billing-payment-failed.tsx
│       └── billing-subscription-expired.tsx
└── actions/
    └── sendEmail.ts                      # Refactored — render() → HTML → Resend
```

### `sendEmail.ts` Refactor

Remove the `TEMPLATES` record of plain-text strings. Instead:
1. Import each template component
2. Call `render(<TemplateComponent {...props} />)` from `@react-email/components`
3. Pass the resulting HTML string to the Resend API

The action signature stays the same (`to`, `templateKey`, `locale`, `variables`) so all existing callers require no changes.

### New Dependency

```
@react-email/components
```

Install in root `package.json`. No additional Convex config needed — Convex Node.js actions support React rendering.

---

## 4. Visual Design

### Base Layout (`WaEmailLayout`)

- **Header:** Emerald green (`#10B981`) background, WaDesk logo as styled text, white heading
- **Body:** White card centered on light gray (`#F8FAFC`), `max-width: 600px`, 16px body font
- **Icon block:** One large emoji per email type, centered above the heading
- **CTA Button:** Emerald green, rounded corners, full-width on mobile
- **Footer:** Dark navy (`#0F172A`) background, "WaDesk — واديسك", legal note

### Per-Email Identity

| Email | Emoji | Header Accent |
|---|---|---|
| `channel_expiring_soon` | ⚠️ | Amber `#F59E0B` |
| `channel_deleted` | 🗑️ | Red `#EF4444` |
| `sla_breach` | 🔴 | Red `#EF4444` |
| `followup_due` | 📅 | Amber `#F59E0B` |
| `new_assignment` | 💬 | Emerald `#10B981` |
| `agent_welcome` | 👋 | Emerald `#10B981` |
| `billing_payment_failed` | 💳 | Red `#EF4444` |
| `billing_subscription_expired` | 📦 | Amber `#F59E0B` |

> All colors, icons, and copy can be changed at any time by editing the relevant template component file.

### Bilingual Support

- Each template accepts a `locale: "ar" | "en"` prop
- Arabic variant: `dir="rtl"` on root element, Cairo font via Google Fonts `<link>` in `<head>`
- English variant: `dir="ltr"`, system sans-serif font stack
- Default locale: `"ar"` (Arabic-first product)

---

## 5. Trigger Wiring

### Already Wired (update HTML only)

- `channel_expiring_soon` → `convex/actions/channelRetentionAction.ts`
- `channel_deleted` → `convex/actions/channelRetentionAction.ts`

### Needs Wiring

**`sla_breach`** — `convex/sla.ts`  
When SLA threshold is exceeded, after creating the notification row, call `ctx.runAction(internal.actions.sendEmail.sendEmail, {...})` with the agent/supervisor email.

**`followup_due`** — `convex/followUps.ts`  
When the scheduled follow-up function fires, call `sendEmail` with the assigned agent's email.

**`new_assignment`** — `convex/conversations.ts` (assignment mutation)  
After updating `assignedAgentId`, call `sendEmail` if the assignee changed. Skip if reassigned to the same agent.

**`agent_welcome`** — `convex/http.ts` (Clerk webhook handler)  
On `organizationMembership.created` Clerk webhook event, call `sendEmail` with `agent_welcome`. Dedup: check for an existing `agent_welcome` notification row for that user+tenant before sending.

**`billing_payment_failed`** — `convex/http.ts` (Paddle webhook handler)  
On `transaction.payment_failed` Paddle webhook, resolve the tenant's Admin email and call `sendEmail`.

**`billing_subscription_expired`** — `convex/http.ts` (Paddle webhook handler)  
On `subscription.canceled` Paddle webhook, resolve the tenant's Admin email and call `sendEmail`.

### Agent Email Resolution

Agent email addresses are never stored in Convex. Resolve them at send time:

```ts
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const user = await clerk.users.getUser(userId);
const email = user.emailAddresses[0]?.emailAddress;
```

This runs inside a Convex Node.js action (`"use node"`).

---

## 6. Error Handling

| Scenario | Behavior |
|---|---|
| No email address on Clerk user | Log warning, skip silently — never block main operation |
| Resend API failure | Log `[EMAIL_ERROR]`, do not fail the triggering mutation |
| `RESEND_API_KEY` not set | Log `[EMAIL_SKIP]`, return early (existing behavior) |
| `new_assignment` to same agent | Skip — compare new vs. previous `assignedAgentId` |
| `sla_breach` duplicate | Skip — existing notification row prevents re-fire |
| `agent_welcome` duplicate | Skip — check for existing `agent_welcome` notification row |

Emails are **best-effort**. They must never block or fail the core business operation that triggers them.

---

## 7. Out of Scope

- Weekly analytics digest (deferred to future milestone)
- Email unsubscribe management (transactional emails are exempt)
- Email open/click tracking (can be added via Resend dashboard later)
- HTML email preview tooling / Storybook integration
