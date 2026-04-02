# Quickstart: Multi-Agent Shared Inbox

**Feature**: `001-multi-agent-inbox` | **Date**: 2026-04-02

---

## Prerequisites

- Node.js 20+
- A Convex account (free tier works for dev)
- A Clerk account with Organizations enabled
- A Meta Developer account with a test WhatsApp Business number

---

## 1. Scaffold the Project

```bash
npx create-next-app@latest wadesk --typescript --tailwind --app --src-dir no
cd wadesk
```

## 2. Install Core Dependencies

```bash
npm install convex @clerk/nextjs
npx shadcn@latest init
npx shadcn@latest add button input textarea scroll-area resizable sheet dialog dropdown-menu badge
```

## 3. Set Up Convex

```bash
npx convex dev
# Follow prompts to create project and link to this directory
```

Copy the generated `CONVEX_DEPLOYMENT` to `.env.local`.

## 4. Configure Environment Variables

```env
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token
```

## 5. Define the Schema

Copy the schema from [data-model.md](data-model.md) into `convex/schema.ts`.

Run `npx convex dev` to push the schema and generate TypeScript types.

## 6. Run the Development Server

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Convex dev (already running from step 3)
npx convex dev
```

Open [http://localhost:3000](http://localhost:3000).

## 7. Test the Webhook Locally

Use `ngrok` or `cloudflared` to expose your local Convex HTTP action:

```bash
npx convex dev --tunnel
# Convex will print a public URL for your HTTP actions
```

Register the webhook URL in your Meta App Dashboard:
- Webhook URL: `https://your-tunnel-url/meta/webhook`
- Verify Token: value from `META_WEBHOOK_VERIFY_TOKEN`
- Subscribe to: `messages`

## 8. Send a Test Message

1. Send a WhatsApp message from your test phone to the connected number
2. Open the dashboard at `/inbox`
3. The message should appear in the Unassigned queue within 3 seconds
4. Assign it to yourself and send a reply

## 9. Verify RTL Layout

Switch your browser language to Arabic or manually set `dir="rtl"` on `<html>` in `app/layout.tsx`. Verify:
- Conversation list appears on the right side
- Thread appears on the left
- Arabic text renders with Cairo font
- Directional icons (chevrons) point correctly

---

## End-to-End Test Checklist

- [ ] Inbound WhatsApp message → appears in Unassigned queue within 3s
- [ ] Assign conversation to agent → agent sees it in their queue; other agents cannot
- [ ] Agent sends reply → customer receives it on WhatsApp
- [ ] Add internal note → not sent to customer; visible to supervisor
- [ ] Mark conversation Resolved → leaves active inbox
- [ ] Customer replies to resolved conversation → re-opens automatically
- [ ] Select quick reply → populates reply box; editable before send
- [ ] Layout renders correctly in Arabic RTL
- [ ] Layout renders correctly in English LTR
