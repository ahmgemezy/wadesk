# Implementation Plan: WhatsApp Embedded Signup

**Branch**: `003-whatsapp-embedded-signup` | **Date**: 2026-04-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-whatsapp-embedded-signup/spec.md`

---

## Summary

Enable admins to connect their WhatsApp Business Account (WABA) to WaDesk in under 5 minutes using Meta's Embedded Signup JavaScript popup. After completing the OAuth flow, WaDesk exchanges the code for a long-lived system user token (server-side), registers the webhook subscription, and activates the channel — all without the admin touching any Meta developer settings. This feature extends the `channels` table from `001-multi-agent-inbox` with token storage and connection status fields, and introduces the `onboardingStates` table used by `004-multi-tenant-onboarding`.

---

## Technical Context

**Language/Version**: TypeScript (strict, no `any`)
**Primary Dependencies**: Next.js 15 (App Router), Convex, Clerk, Meta Graph API v21.0, Facebook JS SDK v21.0, Node.js `crypto` (AES-256 encryption)
**Storage**: Convex — `channels` table extended; `onboardingStates` table new
**Testing**: E2E with real Meta test WABA + test phone number (Meta provides sandbox numbers in developer mode)
**Target Platform**: Web (Vercel + Convex cloud)
**Project Type**: Web application feature (extends `001-multi-agent-inbox`)
**Performance Goals**: Channel active within 10 seconds of completing Meta popup (SC-002); full flow under 5 minutes (SC-001)
**Constraints**: `accessToken` never returned to client; AES-256 encrypted at rest; `META_APP_SECRET` server-side only; webhook must be registered before channel marked active
**Scale/Scope**: One channel connection per admin action; tenants have 1–unlimited channels depending on plan

---

## Constitution Check

| Gate | Applies? | Status | Notes |
|------|----------|--------|-------|
| **1. RTL Gate** | ✅ Yes | ✅ PASS | Embedded Signup button, channel settings page, and status badges use RTL-first layout with Cairo font |
| **2. Tenant Scope Gate** | ✅ Yes | ✅ PASS | `channels` and `onboardingStates` both have `tenantId`; all queries filtered by tenant |
| **3. Real-Time Gate** | ✅ Yes | ✅ PASS | `channels.listForTenant` and `onboardingStates.getForTenant` are live queries — channel status updates push to all admin clients instantly |
| **4. Security Gate** | ✅ Yes | ✅ PASS | Token exchange in Convex action (server-side); `accessToken` AES-256 encrypted; `META_APP_SECRET` never client-side; webhook signature verification already in `http.ts` from `001` |
| **5. Schema Gate** | ✅ Yes | ✅ PASS | `channels` extended with `tenantId` already present; `onboardingStates` new table includes `tenantId` |
| **6. Simplicity Gate** | ✅ Yes | ✅ PASS | This IS the onboarding step — it reduces steps by automating webhook registration. Sub-5-min KPI is directly served |

---

## Project Structure

### Documentation

```text
specs/003-whatsapp-embedded-signup/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── convex-api.md    ← Phase 1 output
└── tasks.md             ← Phase 2 output (not yet created)
```

### Source Code (additions to repository root)

```text
convex/
├── schema.ts                    # UPDATE: extend channels table, add onboardingStates
├── channels.ts                  # UPDATE: add completeEmbeddedSignup action, disconnect, rename, setStatus
├── onboardingStates.ts          # NEW: getForTenant query, markStep mutation
└── lib/
    └── encryption.ts            # NEW: AES-256 encrypt/decrypt helpers using ENCRYPTION_SECRET

app/
├── (dashboard)/
│   └── settings/
│       └── channels/
│           └── page.tsx         # NEW: channel management page (Admin only)
└── onboarding/
    └── page.tsx                 # NEW: step-by-step guided flow (used by 004)

components/
└── onboarding/
    ├── embedded-signup-button.tsx    # NEW: Facebook SDK popup + Convex action trigger
    └── channel-status-badge.tsx      # NEW: Active/Connecting/Disconnected/Reconnect badges
```

---

## Phase 0: Research Summary

See [research.md](research.md) for full decision log. Key decisions:

| Topic | Decision |
|-------|----------|
| Embedded Signup flow | `FB.login` with `config_id` + `postMessage` listener for WABA/phone IDs |
| Token exchange | Server-side `GET /oauth/access_token` → Business Integration System User token (no expiry) |
| Webhook registration | `POST /{wabaId}/subscribed_apps` immediately after token exchange — NOT automatic |
| Token storage | AES-256 encrypted in Convex `channels.accessToken`; `ENCRYPTION_SECRET` in Convex env |
| Token expiry detection | Check `error.code === 190` on every Meta API call → set status `"reconnect_required"` |
| Reconnection | Match by `(tenantId, phoneNumberId)` → update existing channel doc, preserve `channelId` |
| Plan limits | Enforced server-side in action before channel creation |

---

## Phase 1: Design Summary

### Data Model

`channels` table extended (no breaking changes — new fields added):
- `accessToken` (encrypted string), `tokenEncryptedAt`, `status` enum (replaces `isActive` bool), `displayPhone`, `connectedAt`, `disconnectedAt`

New `onboardingStates` table — one doc per tenant tracking 4 step booleans.

See [data-model.md](data-model.md) for full schema.

### API Contracts

| Function | Type | Auth | Key Behavior |
|----------|------|------|-------------|
| `channels.completeEmbeddedSignup` | action | Admin | Exchange code → encrypt token → register webhook → upsert channel |
| `channels.disconnect` | mutation | Admin | Set status `"disconnected"`, preserve history |
| `channels.rename` | mutation | Admin | Update display name |
| `channels.setStatus` | internal mutation | Internal | Used by actions to update status |
| `channels.listForTenant` | query (live) | Any member | Returns channels without token |
| `onboardingStates.getForTenant` | query (live) | Any member | Returns step completion state |
| `onboardingStates.markStep` | mutation | Admin | Mark workspace_named / team_invited / inbox_visited |

See [contracts/convex-api.md](contracts/convex-api.md) for full signatures.
