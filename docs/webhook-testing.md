# Webhook Testing Guide

This guide covers how to test the Meta WhatsApp webhook locally and in production.

## Architecture

```
Meta → POST /api/webhook/whatsapp  (Next.js, Vercel)
         ↓ HMAC verified, 200 returned immediately
         ↓ fire-and-forget
       POST /meta-webhook           (Convex HTTP action)
         ↓ shared-secret verified
         ↓ DB: upsert contact, find/create conversation, insert message
       Convex subscription fires → Inbox UI updates in real-time
```

## Environment Variables

Add these to `.env.local`:

```env
# The token you set in Meta App Dashboard → Webhooks → Verify Token
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your-random-secret-here

# Random secret shared between Next.js route and Convex HTTP action
WHATSAPP_WEBHOOK_SECRET=another-random-secret-here

# Meta App Secret (from Meta App Dashboard → Settings → Basic)
WHATSAPP_APP_SECRET=your-meta-app-secret

# WhatsApp API token (System User token from Meta Business Manager)
WHATSAPP_API_TOKEN=your-permanent-token

# Meta API version
WHATSAPP_API_VERSION=v19.0

# Convex HTTP action base URL (e.g. https://happy-animal-123.convex.site)
# Find it in Convex dashboard → Settings → URL & Deploy Key
CONVEX_SITE_URL=https://your-deployment.convex.site
```

Also add to Convex environment (via `npx convex env set` or Convex dashboard):
```
META_APP_SECRET=your-meta-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-random-secret-here
WHATSAPP_WEBHOOK_SECRET=another-random-secret-here
```

## Local Testing with ngrok

### 1. Start the dev server

```bash
npm run dev
```

### 2. Start ngrok tunnel

```bash
npx ngrok http 3000
```

Copy the `https://xxxx.ngrok.io` URL from the output.

### 3. Configure Meta App Dashboard

1. Go to [Meta for Developers](https://developers.facebook.com) → your app
2. Navigate to **WhatsApp → Configuration**
3. Set **Callback URL**: `https://xxxx.ngrok.io/api/webhook/whatsapp`
4. Set **Verify Token**: same value as `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in `.env.local`
5. Click **Verify and Save**
6. Subscribe to the **messages** webhook field

### 4. Send a test message

Option A — Meta's Test button in the dashboard  
Option B — Use the test script (see below)  
Option C — Send a real WhatsApp message to the connected number

### 5. Verify it worked

Check terminal for `[WEBHOOK]` log lines:
```
{"tag":"[WEBHOOK]","event":"webhook_received","phoneNumberId":"...","messageCount":1}
{"tag":"[WEBHOOK]","event":"message_inserted","orgId":"...","conversationId":"..."}
```

Check Convex dashboard → Data → messages table for the inserted message.

The Inbox UI should update in real-time without a page refresh.

## Testing Without ngrok (Local Script)

The test script sends a fake Meta payload with a valid HMAC signature directly to your local server.

### Setup

Make sure `WHATSAPP_APP_SECRET` is set in `.env.local` (can be any string locally, just needs to match).

### Run

```bash
# Send a text message
npx tsx scripts/test-webhook.ts

# Send a status update (delivered)
npx tsx scripts/test-webhook.ts --type status

# Target a different URL
npx tsx scripts/test-webhook.ts --url http://localhost:3001/api/webhook/whatsapp

# Set the phone number ID to match an existing channel
TEST_PHONE_NUMBER_ID=123456789012345 npx tsx scripts/test-webhook.ts
```

### Expected output

```
Sending text webhook to http://localhost:3000/api/webhook/whatsapp
WAMID: wamid.test_1712345678901
Signature: sha256=abc123...

Response: 200 OK
Body: OK

✓ Webhook accepted. Check Convex dashboard for inserted message.
```

## Webhook Verification (GET)

Meta sends a GET request once during initial setup to verify the endpoint:

```
GET /api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=RANDOM_STRING
```

The route echoes back `hub.challenge` as plain text with status 200.

To test manually:
```bash
curl "http://localhost:3000/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
# → test123
```

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| 403 on POST | Wrong `WHATSAPP_APP_SECRET` or signature mismatch |
| 403 on GET | Wrong `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| Message not in DB | Check `CONVEX_SITE_URL` is correct + Convex action logs |
| "unknown_phone_number_id" in logs | The `phoneNumberId` doesn't match any channel in the DB |
| Duplicate message skipped | Expected — Meta sometimes sends duplicates, we dedup by `metaMessageId` |

## Production

In production (Vercel + Convex), set:
- Meta webhook URL: `https://your-app.vercel.app/api/webhook/whatsapp`
- All env vars in Vercel dashboard
- All Convex env vars via `npx convex env set KEY VALUE`

Logs are visible in:
- **Next.js route**: Vercel → Functions → `/api/webhook/whatsapp`
- **Convex action**: Convex dashboard → Logs (filter by `[WEBHOOK]`)
