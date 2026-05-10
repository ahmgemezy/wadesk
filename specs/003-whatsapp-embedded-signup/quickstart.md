# Quickstart: WhatsApp Embedded Signup

**Feature**: `003-whatsapp-embedded-signup` | **Date**: 2026-04-02

**Prerequisites**: `001-multi-agent-inbox` project scaffold must exist. Convex dev server running.

---

## 1. Create a Meta App for Embedded Signup

1. Go to [developers.facebook.com](https://developers.facebook.com) → Create App → Business type
2. Add **WhatsApp** product to the app
3. Add **Facebook Login for Business** product
4. In Facebook Login for Business → Settings: create a **Configuration** with:
   - Allowed domains: `https://localhost:3000`, `https://your-vercel-domain.vercel.app`
   - Scopes: `whatsapp_business_management`, `whatsapp_business_messaging`
5. Note the **Config ID** from this configuration

---

## 2. Add Environment Variables

```env
# .env.local (additions to existing vars)
NEXT_PUBLIC_META_APP_ID=your_meta_app_id
NEXT_PUBLIC_META_CONFIG_ID=your_facebook_login_for_business_config_id
META_APP_SECRET=your_meta_app_secret     # already set from 001
META_WEBHOOK_VERIFY_TOKEN=your_token     # already set from 001
ENCRYPTION_SECRET=32-char-random-hex     # NEW: for AES-256 token encryption
```

Generate `ENCRYPTION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Set in Convex: `npx convex env set ENCRYPTION_SECRET your_value`

---

## 3. Update Convex Schema

Replace the `channels` table in `convex/schema.ts` with the updated definition from [data-model.md](data-model.md). Add the `onboardingStates` table.

```bash
npx convex dev
# Verify new indexes appear in Convex dashboard
```

---

## 4. Register Webhook in Meta App Dashboard

In Meta App Dashboard → WhatsApp → Configuration:
- Callback URL: `https://your-tunnel-url/meta/webhook` (use `npx convex dev --tunnel`)
- Verify Token: value from `META_WEBHOOK_VERIFY_TOKEN`
- Subscribe to fields: `messages`

---

## 5. Create Convex Functions

- `convex/channels.ts` — add `completeEmbeddedSignup` action, `disconnect` mutation, `rename` mutation, `setStatus` internal mutation, update `listForTenant`
- `convex/onboardingStates.ts` — new file: `getForTenant` query, `markStep` mutation

---

## 6. Create UI Components

- `components/onboarding/embedded-signup-button.tsx` — Facebook SDK + popup flow
- `app/(dashboard)/settings/channels/page.tsx` — channel management page
- `app/onboarding/page.tsx` — step-by-step guided flow (for 004)

---

## End-to-End Test Checklist

### First-Time Connection (US1)
- [ ] Click "Connect WhatsApp" → Meta popup opens with Facebook login
- [ ] Complete Facebook auth → WABA selection screen appears
- [ ] Select WABA and phone number → popup closes
- [ ] Channel appears in Settings → Channels with status "Active" within 10 seconds
- [ ] Send WhatsApp message to connected number → appears in Unassigned queue within 3 seconds
- [ ] Channel shows correct display phone and WABA ID

### Second Channel / Plan Limits (US2)
- [ ] Free/Starter plan: clicking "Add Channel" shows upgrade prompt (not the Meta popup)
- [ ] Growth plan: connect a second number successfully → both appear independently in inbox channel tabs
- [ ] Two channels receiving messages independently (each in their own channel view)

### Disconnect and Reconnect (US3)
- [ ] Admin clicks "Disconnect" on a channel → status changes to "Disconnected"
- [ ] New messages to disconnected number do NOT appear in inbox
- [ ] All past conversations remain visible and accessible
- [ ] Admin reconnects via "Connect WhatsApp" → existing channel document updated (same channelId)
- [ ] Messages resume after reconnection

### Token Revocation (Edge Case)
- [ ] Simulate token revocation by revoking app permissions in Meta Business Suite
- [ ] Next API call from WABDesk triggers error code 190
- [ ] Channel status changes to "Reconnect required" in Settings
- [ ] Admin banner shown prompting re-authentication
