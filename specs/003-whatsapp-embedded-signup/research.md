# Research: WhatsApp Embedded Signup

**Feature**: `003-whatsapp-embedded-signup` | **Date**: 2026-04-02

---

## 1. Meta Embedded Signup JavaScript Flow

**Decision**: Load the Facebook JS SDK and call `FB.login()` with `config_id`, `response_type: "code"`, `override_default_response_type: true`. Listen for the `waba_id` and `phone_number_id` via a `window.postMessage` event listener simultaneously.

**Rationale**: The popup flow requires two separate callbacks — the OAuth code comes from `FB.login`'s callback, while the WABA/phone IDs come from a `postMessage` event fired when the user completes selection inside the Meta popup. Both are needed to complete channel setup.

**Pattern**:
```typescript
// In a "use client" Next.js component
useEffect(() => {
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === 'WA_EMBEDDED_SIGNUP' && event.data?.event === 'FINISH') {
      const { waba_id, phone_number_id } = event.data.data;
      // store temporarily alongside OAuth code
    }
  };
  window.addEventListener('message', handleMessage);
  return () => window.removeEventListener('message', handleMessage);
}, []);

const launchSignup = () => {
  FB.login((response) => {
    if (response.authResponse?.code) {
      // send { code, waba_id, phone_number_id } to server action
    }
  }, {
    config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID,
    response_type: 'code',
    override_default_response_type: true,
  });
};
```

**Required scopes** (set in Facebook Login for Business config): `whatsapp_business_management`, `whatsapp_business_messaging`, `public_profile`.

**Alternatives considered**:
- Redirect-based OAuth (no popup): Disrupts the onboarding flow with a full page redirect. Rejected for UX.

---

## 2. Token Exchange: Code → Long-Lived System User Token

**Decision**: Exchange the short-lived `code` server-side via `GET https://graph.facebook.com/v21.0/oauth/access_token?client_id=...&client_secret=...&code=...`. The result is a **Business Integration System User token** that does not expire unless manually revoked.

**Rationale**: This token type (unique to Embedded Signup's code exchange) is permanent and tied to the specific business integration. Regular user access tokens expire in 60 days — system user tokens do not. Performing this exchange in a Convex action keeps `META_APP_SECRET` server-side only.

**Pattern**:
```typescript
// convex/actions/completeChannelSetup.ts
const tokenRes = await fetch(
  `https://graph.facebook.com/v21.0/oauth/access_token` +
  `?client_id=${process.env.META_APP_ID}` +
  `&client_secret=${process.env.META_APP_SECRET}` +
  `&code=${code}`
);
const { access_token } = await tokenRes.json();
```

**Alternatives considered**:
- Re-using the platform's `META_SYSTEM_USER_TOKEN` env var for all tenants: One token cannot represent multiple WABAs independently. Rejected.

---

## 3. Webhook Subscription After Signup

**Decision**: After token exchange, immediately call `POST https://graph.facebook.com/v21.0/{WABA_ID}/subscribed_apps` with the new system user token. This registers WABDesk's global webhook to receive messages for this WABA.

**Rationale**: Embedded Signup does NOT automatically subscribe the app to webhooks — this is a critical footgun. Messages will silently not arrive if this step is skipped. It must be called in the same Convex action as the token exchange, before returning success to the client.

**Pattern**:
```typescript
const webhookRes = await fetch(
  `https://graph.facebook.com/v21.0/${wabaId}/subscribed_apps`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}` },
  }
);
// { "success": true } on success
```

**Failure handling**: If webhook subscription fails, set channel `status: "connecting"` and schedule a Convex scheduled function to retry every 60 seconds up to 5 times. Do not surface as a hard error to the user.

**Alternatives considered**:
- Per-tenant webhook URLs: More complex routing not needed — single webhook URL handles all tenants via `phoneNumberId` lookup. Rejected.

---

## 4. Secure Per-Tenant Token Storage

**Decision**: Store per-tenant access tokens in the Convex `channels` table, AES-256 encrypted using a `ENCRYPTION_SECRET` Convex environment variable. Decrypt only inside Convex actions when calling Meta APIs. Never return raw tokens to the client.

**Rationale**: Env vars are global — they cannot store per-tenant secrets. Convex is the single source of truth for tenant data. Encrypting at the application layer provides defense-in-depth beyond Convex's own at-rest encryption. The master `ENCRYPTION_SECRET` is a single Convex env var managed via `npx convex env set`.

**Token storage fields on `channels` table**:
- `accessToken`: `string` — AES-256 encrypted ciphertext
- `tokenEncryptedAt`: `number` — Unix timestamp of last encryption (for rotation tracking)

**Alternatives considered**:
- Plain text in Convex DB: Convex encrypts at rest, but application-layer encryption adds a layer. Rejected for MVP simplicity — decided to use encryption since tokens grant full WABA access.
- External secret manager (Vault, AWS Secrets Manager): Overkill for an MVP. Rejected.

---

## 5. Token Expiry & Revocation Detection

**Decision**: In every Convex action that calls Meta API, check for `error.code === 190` (OAuthException). On detection, patch the channel's `status` to `"reconnect_required"` and surface a banner in the admin dashboard prompting re-authentication.

**Rationale**: System user tokens from code exchange don't expire naturally. `code 190` in production means the business owner manually revoked the app's permissions in Meta Business Suite, or the WABA was transferred. The inbox must detect this gracefully and guide the admin to reconnect.

**Pattern**:
```typescript
const metaResponse = await fetch(metaApiUrl, { headers: { Authorization: `Bearer ${token}` } });
const data = await metaResponse.json();

if (data.error?.code === 190) {
  await ctx.runMutation(api.channels.setStatus, { channelId, status: "reconnect_required" });
  throw new ConvexError("TOKEN_REVOKED");
}
```

**Channel status values**: `"connecting"` | `"active"` | `"disconnected"` | `"reconnect_required"`

**Alternatives considered**:
- Proactive token validation via a scheduled job: Unnecessary churn on Meta's API. Reactive detection on actual API calls is sufficient. Rejected.

---

## 6. Plan Limit Enforcement for Channel Count

**Decision**: Before initiating Embedded Signup, check the tenant's current active channel count against their plan limit in a Convex query. Show an upgrade prompt if at limit; prevent the flow from launching.

**Plan limits** (from CLAUDE.md):
| Plan | Max Channels |
|------|-------------|
| Free | 1 |
| Starter | 1 |
| Growth | 3 |
| Business | Unlimited |

**Enforcement**: Check at two points — (1) client-side before launching the popup (UX), and (2) server-side in the Convex action before persisting the new channel (security). Constitution Principle II requires server-side enforcement.

---

## 7. Reconnection: Reusing Existing Channel Document

**Decision**: When an admin reconnects a previously disconnected number, match by `(tenantId, phoneNumberId)` in the `channels` table and update the existing document (`accessToken`, `status: "active"`) rather than creating a new one.

**Rationale**: Reusing the channel document preserves the `channelId` referenced by all historical conversations. Creating a new document would orphan all past conversations. The `phoneNumberId` from Meta uniquely identifies the number within a WABA.

**Alternatives considered**:
- Match by phone display number: Meta's `phoneNumberId` (not the display E.164 number) is the stable identifier. Display numbers can be reassigned. Use `phoneNumberId`. Rejected.
