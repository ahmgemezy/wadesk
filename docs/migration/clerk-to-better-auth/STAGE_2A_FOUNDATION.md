# Stage 2a Foundation Files Diff — Clerk → Better Auth

**Produced:** 2026-05-06  
**Locked base:** `docs/migration/clerk-to-better-auth/STAGE_1_ARCHITECTURE.md` §9  
**Scope:** Planning only — no installs, no source file modifications. All diffs are applied in Stage 3.

---

## §1. Pinned Versions

### Literal npm view output

```
$ npm view @convex-dev/better-auth version
0.12.2

$ npm view @convex-dev/better-auth peerDependencies
{ 'better-auth': '>=1.6.9 <1.7.0', convex: '^1.25.0', react: '^18.3.1 || ^19.0.0' }

$ npm view better-auth version
1.6.9
```

### Chosen pins

| Package | Pin | Reasoning |
|---|---|---|
| `@convex-dev/better-auth` | `0.12.2` (exact) | Latest stable release; alpha-track — exact pin prevents unexpected API breaks between patch releases |
| `better-auth` | `~1.6.9` (range) | Matches peer dep spec `>=1.6.9 <1.7.0`; `~` allows only patch updates within 1.6.x |

**Citation:** [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next) states: `npm install better-auth@~1.6.9`. The `@convex-dev/better-auth` 0.12.2 peer dep confirms this range. `convex: '^1.25.0'` is satisfied by the project's existing `convex: "^1.37.0"`.

---

## §2. Architecture Corrections from Stage 1

Stage 1 §1.1 and §1.4 contained three factual errors found during doc research. These corrections do not re-litigate any locked Q1–Q10 decision; they correct topology and env var placement assumptions that were wrong against the actual library API. Stage 3 reads this section — not §1.1 or §1.4 from the Stage 1 doc.

### Correction 1 — Better Auth instance lives in Convex, not Vercel

**Stage 1 §1.1 said:** "Vercel (Next.js) hosts the Better Auth server. A new Route Handler at `app/api/auth/[...all]/route.ts` wraps `betterAuth({ ... })`."

**Corrected:** The `betterAuth(...)` instance is created inside `convex/auth.ts` (Convex), not inside the Next.js Route Handler. Auth logic runs on Convex.

The Next.js Route Handler at `app/api/auth/[...all]/route.ts` is a **thin proxy** that re-exports `handler` from `lib/auth-server.ts`. It contains no auth logic.

HTTP request flow:
```
Browser
  → POST /api/auth/...  (Vercel)
    → convexBetterAuthNextJs proxy (lib/auth-server.ts)
      → Convex HTTP endpoint (registered via authComponent.registerRoutes)
        → Better Auth handler (betterAuth instance in convex/auth.ts)
```

The proxy keeps cookies same-origin to the browser (Vercel domain); all auth logic executes on Convex.

**Source:** [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next) — "Create Better Auth instance — `convex/auth.ts`" and "Mount handlers — `convex/http.ts`".

### Correction 2 — All six auth env vars go on Convex, not Vercel

**Stage 1 §1.4 and Flag #6 said:** `BETTER_AUTH_SECRET` on Vercel; OAuth credentials on Vercel.

**Corrected:** Every variable consumed by the `betterAuth({...})` config runs on Convex and must be set via `npx convex env set`. The only Vercel additions are the browser-readable `NEXT_PUBLIC_*` variables.

| Variable | Host | Set via |
|---|---|---|
| `BETTER_AUTH_SECRET` | **Convex** | `npx convex env set BETTER_AUTH_SECRET=...` |
| `SITE_URL` | **Convex** | `npx convex env set SITE_URL=https://your-domain.com` |
| `GOOGLE_CLIENT_ID` | **Convex** | `npx convex env set GOOGLE_CLIENT_ID=...` |
| `GOOGLE_CLIENT_SECRET` | **Convex** | `npx convex env set GOOGLE_CLIENT_SECRET=...` |
| `FACEBOOK_CLIENT_ID` | **Convex** | `npx convex env set FACEBOOK_CLIENT_ID=...` |
| `FACEBOOK_CLIENT_SECRET` | **Convex** | `npx convex env set FACEBOOK_CLIENT_SECRET=...` |
| `NEXT_PUBLIC_CONVEX_URL` | **Vercel** | Already exists in `.env.local` — no change |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | **Vercel** | NEW — add to `.env.local` and Vercel dashboard |

`NEXT_PUBLIC_CONVEX_SITE_URL` is the `https://adjective-animal-123.convex.site` URL (found in Convex dashboard → Settings → Deployment URL). It is required by `convexBetterAuthNextJs` in `lib/auth-server.ts`.

**Source:** [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next) — "Set environment variables" section.

### Correction 3 — No `crossDomain` plugin for Next.js

**Stage 1 did not explicitly include it, but for clarity:** The `crossDomain` plugin from `@convex-dev/better-auth/plugins` is documented only in the React (Vite SPA) framework guide. The Next.js guide does not include it. WabDesk uses Next.js App Router; `crossDomain` must NOT appear in `convex/auth.ts` plugins array.

**Source:** [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next) — Next.js plugin list contains only `convex({ authConfig })`, no `crossDomain`.

---

## §3. Env Var Setup

### Convex — run before Stage 3 deploys

```bash
# Required secret — generate a new one
npx convex env set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"

# Base URL for email invitation links
npx convex env set SITE_URL="https://your-production-domain.com"
# Local dev override (Convex dev env):
npx convex env set SITE_URL="http://localhost:3000"

# Google OAuth (from Google Cloud Console)
npx convex env set GOOGLE_CLIENT_ID="<from Google Cloud Console>"
npx convex env set GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"

# Facebook OAuth (from Facebook Developer Portal)
npx convex env set FACEBOOK_CLIENT_ID="<from Facebook Developer Portal>"
npx convex env set FACEBOOK_CLIENT_SECRET="<from Facebook Developer Portal>"
```

### Vercel / `.env.local` — add before Stage 3 deploys

```bash
# Already present — no change needed:
NEXT_PUBLIC_CONVEX_URL=https://adjective-animal-123.convex.cloud

# NEW — add to .env.local and Vercel dashboard:
NEXT_PUBLIC_CONVEX_SITE_URL=https://adjective-animal-123.convex.site
```

`NEXT_PUBLIC_CONVEX_SITE_URL` is found in Convex dashboard → Settings → Deployment URL (ends in `.convex.site`).

**Note on OAuth redirect URIs (Stage 1 §9 Flag #6):** Before Stage 3 deploys, Ahmed must manually add Better Auth's callback URIs to the Google Cloud Console and Facebook Developer Portal. Clerk URIs must NOT be removed until after the 7-day rollback window closes. See Stage 1 §9 Flag #6 for the full 5-item checklist.

---

## §4. Modified Files

### §4.1 `package.json`

**File size:** 70 lines (≤80 — full BEFORE shown).

#### BEFORE (current file, all 70 lines)

```json
 1  {
 2    "name": "wabdesk",
 3    "version": "0.1.0",
 4    "private": true,
 5    "scripts": {
 6      "dev": "next dev --experimental-https --turbopack",
 7      "build": "next build",
 8      "start": "next start",
 9      "lint": "next lint",
10      "email": "email dev --dir emails --port 3100",
11      "test": "vitest run",
12      "test:watch": "vitest",
13      "test:convex": "vitest run --config convex/vitest.config.ts",
14      "test:e2e": "playwright test",
15      "test:all": "npm run test && npm run test:convex"
16    },
17    "dependencies": {
18      "@base-ui/react": "^1.3.0",
19      "@better-auth/infra": "^0.2.5",
20      "@clerk/localizations": "^4.5.8",
21      "@clerk/nextjs": "^7.2.5",
22      "@paddle/paddle-js": "^1.6.2",
23      "@react-email/components": "^1.0.12",
24      "@react-email/render": "^2.0.7",
25      "@tailwindcss/postcss": "^4.2.2",
26      "@types/node": "^25.5.0",
27      "@types/react": "^19.2.14",
28      "@types/react-dom": "^19.2.3",
29      "canvas-confetti": "^1.9.4",
30      "class-variance-authority": "^0.7.1",
31      "clsx": "^2.1.1",
32      "cmdk": "^1.1.1",
33      "convex": "^1.37.0",
34      "date-fns": "^4.1.0",
35      "emoji-picker-react": "^4.18.0",
36      "framer-motion": "^12.38.0",
37      "klaro": "^0.7.21",
38      "libphonenumber-js": "^1.12.41",
39      "lucide-react": "^0.468.0",
40      "next": "^15.5.15",
41      "next-themes": "^0.4.6",
42      "papaparse": "^5.5.3",
43      "postcss": "^8.5.8",
44      "react": "^19.2.4",
45      "react-day-picker": "^9.14.0",
46      "react-dom": "^19.2.4",
47      "react-resizable-panels": "^4.9.0",
48      "recharts": "^3.8.1",
49      "shadcn": "^4.1.2",
50      "sonner": "^2.0.7",
51      "tailwind-merge": "^3.5.0",
52      "tailwindcss": "^4.2.2",
53      "tw-animate-css": "^1.4.0",
54      "typescript": "^5.6.2"
55    },
56    "devDependencies": {
57      "@edge-runtime/vm": "^5.0.0",
58      "@playwright/test": "^1.59.1",
59      "@react-email/ui": "^6.0.0",
60      "@testing-library/jest-dom": "^6.9.1",
61      "@testing-library/react": "^16.3.2",
62      "@types/canvas-confetti": "^1.9.0",
63      "@types/papaparse": "^5.5.2",
64      "@vitejs/plugin-react": "^6.0.1",
65      "convex-test": "^0.0.50",
66      "jsdom": "^29.1.0",
67      "react-email": "^6.0.0",
68      "vitest": "^4.1.5"
69    }
70  }
```

#### AFTER (full file, all 69 lines)

**Changes:** Remove lines 19–21 (`@better-auth/infra`, `@clerk/localizations`, `@clerk/nextjs`). Add `@convex-dev/better-auth` on new line 19 and `better-auth` on new line 28.

```json
 1  {
 2    "name": "wabdesk",
 3    "version": "0.1.0",
 4    "private": true,
 5    "scripts": {
 6      "dev": "next dev --experimental-https --turbopack",
 7      "build": "next build",
 8      "start": "next start",
 9      "lint": "next lint",
10      "email": "email dev --dir emails --port 3100",
11      "test": "vitest run",
12      "test:watch": "vitest",
13      "test:convex": "vitest run --config convex/vitest.config.ts",
14      "test:e2e": "playwright test",
15      "test:all": "npm run test && npm run test:convex"
16    },
17    "dependencies": {
18      "@base-ui/react": "^1.3.0",
19      "@convex-dev/better-auth": "0.12.2",
20      "@paddle/paddle-js": "^1.6.2",
21      "@react-email/components": "^1.0.12",
22      "@react-email/render": "^2.0.7",
23      "@tailwindcss/postcss": "^4.2.2",
24      "@types/node": "^25.5.0",
25      "@types/react": "^19.2.14",
26      "@types/react-dom": "^19.2.3",
27      "better-auth": "~1.6.9",
28      "canvas-confetti": "^1.9.4",
29      "class-variance-authority": "^0.7.1",
30      "clsx": "^2.1.1",
31      "cmdk": "^1.1.1",
32      "convex": "^1.37.0",
33      "date-fns": "^4.1.0",
34      "emoji-picker-react": "^4.18.0",
35      "framer-motion": "^12.38.0",
36      "klaro": "^0.7.21",
37      "libphonenumber-js": "^1.12.41",
38      "lucide-react": "^0.468.0",
39      "next": "^15.5.15",
40      "next-themes": "^0.4.6",
41      "papaparse": "^5.5.3",
42      "postcss": "^8.5.8",
43      "react": "^19.2.4",
44      "react-day-picker": "^9.14.0",
45      "react-dom": "^19.2.4",
46      "react-resizable-panels": "^4.9.0",
47      "recharts": "^3.8.1",
48      "shadcn": "^4.1.2",
49      "sonner": "^2.0.7",
50      "tailwind-merge": "^3.5.0",
51      "tailwindcss": "^4.2.2",
52      "tw-animate-css": "^1.4.0",
53      "typescript": "^5.6.2"
54    },
55    "devDependencies": {
56      "@edge-runtime/vm": "^5.0.0",
57      "@playwright/test": "^1.59.1",
58      "@react-email/ui": "^6.0.0",
59      "@testing-library/jest-dom": "^6.9.1",
60      "@testing-library/react": "^16.3.2",
61      "@types/canvas-confetti": "^1.9.0",
62      "@types/papaparse": "^5.5.2",
63      "@vitejs/plugin-react": "^6.0.1",
64      "convex-test": "^0.0.50",
65      "jsdom": "^29.1.0",
66      "react-email": "^6.0.0",
67      "vitest": "^4.1.5"
68    }
69  }
```

**Removed packages and rationale:**
- `@better-auth/infra` — orphan; installed earlier during migration planning but not used by Stage 2a files
- `@clerk/localizations` — Clerk UI localisation; Stage 2d deletes all `@clerk/nextjs` UI imports; removed together
- `@clerk/nextjs` — primary Clerk package; replaced by Better Auth across Stages 2b–2d

**Note:** `@clerk/nextjs` imports still exist in source files (`convex/members.ts`, `convex/orgMembers.ts`, etc.) at Stage 2a. Those call sites are removed in Stages 2b–2d. The `package.json` AFTER is the target state after Stage 3 applies all changes; the Clerk imports are removed in their own sub-stages first.

---

### §4.2 `convex/convex.config.ts`

**Current state:** File does not exist. Verified: `find convex/ -name "convex.config.ts"` returns no results. This is a creation, not a modification, but Stage 2a categorises it as "modified" per the scope list.

**Why it doesn't exist today:** Convex `convex.config.ts` is only required when using Convex Components. No components are currently used.

#### BEFORE

```
File does not exist.
```

#### AFTER (full file, 8 lines)

```typescript
1  import { defineApp } from "convex/server";
2  import betterAuth from "./betterAuth/convex.config";
3  
4  const app = defineApp();
5  app.use(betterAuth);
6  
7  export default app;
```

**Note on import path:** The import is `"./betterAuth/convex.config"` (local component directory), not `"@convex-dev/better-auth/convex.config"` (npm package path). This is the local install pattern. See [labs.convex.dev/better-auth/features/local-install](https://labs.convex.dev/better-auth/features/local-install) — "Component Registration: Update `convex/convex.config.ts` to import from the local component instead of the npm package."

---

### §4.3 `convex/auth.config.ts`

**File size:** 8 lines (≤80 — full BEFORE shown).

#### BEFORE (current file, all 8 lines)

```typescript
1  export default {
2    providers: [
3      {
4        domain: "https://communal-octopus-5.clerk.accounts.dev",
5        applicationID: "convex",
6      },
7    ],
8  };
```

#### AFTER (full file, 8 lines)

```typescript
1  import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
2  import type { AuthConfig } from "convex/server";
3  
4  export default {
5    providers: [getAuthConfigProvider()],
6  } satisfies AuthConfig;
```

`getAuthConfigProvider()` returns the JWKS provider configuration that tells Convex's auth layer where to find the Better Auth public key for JWT verification.

**Source:** [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next) — "Add Convex auth config — `convex/auth.config.ts`".

---

### §4.4 `convex/http.ts`

**File size:** 409 lines. BEFORE shows two relevant regions (changed import area + changed router area). AFTER shows the full 412-line file.

#### BEFORE — relevant regions

**Region 1: Import block (lines 1–6, all imports) — 1 line added after line 6:**

```typescript
 1  import { httpRouter } from "convex/server";
 2  import { httpAction } from "./_generated/server";
 3  import { internal } from "./_generated/api";
 4  import type { Id } from "./_generated/dataModel";
 5  import { paddleWebhook } from "./billing";
 6  import { metaWebhookV2 } from "./webhooks/meta";
```

**Region 2: Router section (lines 399–409, with 5 lines of context) — 2 lines added before `export default http`:**

```typescript
399  // ── Router ───────────────────────────────────────────────────────────────────
400  
401  const http = httpRouter();
402  http.route({ path: "/meta-webhook", method: "GET", handler: metaWebhook });
403  http.route({ path: "/meta-webhook", method: "POST", handler: metaWebhook });
404  // New structured webhook endpoint — routes by wabaId, modular processor files
405  http.route({ path: "/webhooks/meta", method: "GET", handler: metaWebhookV2 });
406  http.route({ path: "/webhooks/meta", method: "POST", handler: metaWebhookV2 });
407  http.route({ path: "/paddle-webhook", method: "POST", handler: paddleWebhook });
408  
409  export default http;
```

#### AFTER (full file, all 412 lines)

```typescript
  1  import { httpRouter } from "convex/server";
  2  import { httpAction } from "./_generated/server";
  3  import { internal } from "./_generated/api";
  4  import type { Id } from "./_generated/dataModel";
  5  import { paddleWebhook } from "./billing";
  6  import { metaWebhookV2 } from "./webhooks/meta";
  7  import { authComponent, createAuth } from "./auth";
  8  
  9  // ── Types ────────────────────────────────────────────────────────────────────
 10  
 11  type MetaMessage = {
 12    id: string;
 13    from: string;
 14    timestamp: string;
 15    type: string;
 16    text?: { body: string };
 17    image?: { id: string; caption?: string };
 18    audio?: { id: string };
 19    document?: { id: string; filename?: string; caption?: string };
 20    video?: { id: string; caption?: string };
 21    sticker?: { id: string };
 22    location?: { latitude: number; longitude: number; name?: string };
 23    reaction?: { message_id: string; emoji: string };
 24    // Interactive replies (button_reply / list_reply) — v16.0+
 25    interactive?: {
 26      type: "button_reply" | "list_reply";
 27      button_reply?: { id: string; title: string };
 28      list_reply?: { id: string; title: string; description?: string };
 29    };
 30    // System messages (e.g. user changed phone number) — v16.0+
 31    system?: { body: string; type: string; wa_id?: string };
 32  };
 33  
 34  type MetaStatus = {
 35    id: string;
 36    status: "sent" | "delivered" | "read" | "failed";
 37    timestamp: string;
 38    recipient_id: string;
 39    // v16.0+: errors include message + error_data.details in addition to code/title
 40    errors?: { code: number; title: string; message?: string; error_data?: { details: string } }[];
 41    // v23.0 and below: conversation object present; removed in v24.0+
 42    conversation?: { id: string; expiration_timestamp?: string; origin?: { type: string } };
 43    // v24.0+: pricing.type replaces the deprecated billable field
 44    pricing?: {
 45      billable?: boolean;
 46      pricing_model?: string;
 47      type?: "regular" | "free_group_customer_service";
 48      category?: "group_marketing" | "group_utility" | "group_service";
 49    };
 50  };
 51  
 52  type ContentType =
 53    | "text"
 54    | "image"
 55    | "audio"
 56    | "document"
 57    | "video"
 58    | "sticker"
 59    | "location"
 60    | "unsupported";
 61  
 62  // ── Content parsing ──────────────────────────────────────────────────────────
 63  
 64  function extractCsatScore(msg: MetaMessage): string | null {
 65    if (msg.type === "interactive" && msg.interactive) {
 66      if (msg.interactive.type === "button_reply" && msg.interactive.button_reply) {
 67        const id = msg.interactive.button_reply.id;
 68        if (/^[1-5]$/.test(id)) return id;
 69        const title = msg.interactive.button_reply.title;
 70        const match = title.match(/^([1-5])/);
 71        if (match) return match[1];
 72      }
 73    }
 74    return null;
 75  }
 76  
 77  function parseMessageContent(msg: MetaMessage): {
 78    content: string;
 79    contentType: ContentType;
 80    mediaUrl?: string;
 81  } {
 82    switch (msg.type) {
 83      case "text":
 84        return { content: msg.text?.body ?? "", contentType: "text" };
 85      case "image":
 86        return {
 87          content: msg.image?.caption ?? "[Image]",
 88          contentType: "image",
 89          mediaUrl: msg.image?.id,
 90        };
 91      case "audio":
 92        return { content: "[Voice Message]", contentType: "audio", mediaUrl: msg.audio?.id };
 93      case "document":
 94        return {
 95          content: msg.document?.filename ?? msg.document?.caption ?? "[Document]",
 96          contentType: "document",
 97          mediaUrl: msg.document?.id,
 98        };
 99      case "video":
100        return {
101          content: msg.video?.caption ?? "[Video]",
102          contentType: "video",
103          mediaUrl: msg.video?.id,
104        };
105      case "sticker":
106        return { content: "[Sticker]", contentType: "sticker", mediaUrl: msg.sticker?.id };
107      case "location": {
108        const loc = msg.location;
109        return { content: `${loc?.latitude ?? ""},${loc?.longitude ?? ""}|${loc?.name ?? ""}`, contentType: "location" };
110      }
111      case "interactive": {
112        const interactive = msg.interactive;
113        if (interactive?.type === "button_reply") {
114          return { content: interactive.button_reply?.title ?? "[Button Reply]", contentType: "text" };
115        }
116        if (interactive?.type === "list_reply") {
117          return { content: interactive.list_reply?.title ?? "[List Reply]", contentType: "text" };
118        }
119        return { content: "[Interactive]", contentType: "unsupported" };
120      }
121      case "system":
122        return { content: msg.system?.body ?? "[System Message]", contentType: "unsupported" };
123      default:
124        return { content: "[Unsupported message type]", contentType: "unsupported" };
125      }
126  }
127  
128  // ── Structured logger ────────────────────────────────────────────────────────
129  
130  function log(event: string, details: Record<string, unknown> = {}) {
131    console.log(JSON.stringify({ tag: "[WEBHOOK]", event, ...details }));
132  }
133  
134  function warn(event: string, details: Record<string, unknown> = {}) {
135    console.warn(JSON.stringify({ tag: "[WEBHOOK]", event, ...details }));
136  }
137  
138  // ── HTTP action ──────────────────────────────────────────────────────────────
139  
140  export const metaWebhook = httpAction(async (ctx, request) => {
141    // ── GET: hub verification ──────────────────────────────────────────────────
142    if (request.method === "GET") {
143      const url = new URL(request.url);
144      const mode = url.searchParams.get("hub.mode");
145      const token = url.searchParams.get("hub.verify_token");
146      const challenge = url.searchParams.get("hub.challenge");
147  
148      if (
149        mode === "subscribe" &&
150        token === process.env.META_WEBHOOK_VERIFY_TOKEN
151      ) {
152        log("hub_verification_success");
153        return new Response(challenge, { status: 200 });
154      }
155  
156      warn("hub_verification_failed");
157      return new Response("Forbidden", { status: 403 });
158    }
159  
160    // ── POST: incoming events ─────────────────────────────────────────────────
161    if (request.method === "POST") {
162      const body = await request.text();
163  
164      // Accept either:
165      // 1. Forwarded from Next.js route (x-webhook-secret header)
166      // 2. Direct from Meta (x-hub-signature-256 header) — for Convex direct access
167      const webhookSecret = request.headers.get("x-webhook-secret");
168      const isFromNextjs =
169        webhookSecret !== null &&
170        webhookSecret === process.env.WHATSAPP_WEBHOOK_SECRET;
171  
172      if (!isFromNextjs) {
173        // Direct Meta call — verify HMAC
174        const signature = request.headers.get("x-hub-signature-256") ?? "";
175        const appSecret = process.env.META_APP_SECRET ?? "";
176  
177        const isValid = await verifyHmac(body, signature, appSecret);
178        if (!isValid) {
179          warn("signature_verification_failed");
180          return new Response("Forbidden", { status: 403 });
181        }
182      }
183  
184      try {
185        const payload = JSON.parse(body) as {
186          entry?: {
187            id: string;
188            changes?: {
189              value?: {
190                metadata?: { phone_number_id: string; display_phone_number: string };
191                contacts?: { profile: { name: string }; wa_id: string }[];
192                messages?: MetaMessage[];
193                statuses?: MetaStatus[];
194              };
195            }[];
196          }[];
197        };
198  
199        for (const entry of payload.entry ?? []) {
200          for (const change of entry.changes ?? []) {
201            const value = change.value;
202            if (!value) continue;
203  
204            const phoneNumberId = value.metadata?.phone_number_id ?? "";
205            log("webhook_received", {
206              phoneNumberId,
207              messageCount: value.messages?.length ?? 0,
208              statusCount: value.statuses?.length ?? 0,
209            });
210  
211            // Resolve channel
212            const channels = await ctx.runQuery(internal.channels.listByPhoneId, {
213              phoneNumberId,
214            });
215  
216            if (!channels.length) {
217              warn("unknown_phone_number_id", { phoneNumberId });
218              continue;
219            }
220            const channel = channels[0];
221  
222            // ── Process inbound messages ────────────────────────────────────
223            for (const msg of value.messages ?? []) {
224              // ── Handle incoming reactions ────────────────────────────────
225              if (msg.type === "reaction") {
226                const reaction = (msg as any).reaction as { message_id: string; emoji: string } | undefined;
227                if (reaction) {
228                  await ctx.runMutation(internal.messages.handleIncomingReaction, {
229                    tenantId: channel.tenantId,
230                    metaMessageId: reaction.message_id,
231                    reactorPhone: msg.from,
232                    emoji: reaction.emoji ?? "",
233                  });
234                }
235                continue;
236              }
237  
238              const { content, contentType, mediaUrl } = parseMessageContent(msg);
239              const senderName = value.contacts?.[0]?.profile?.name;
240  
241              log("processing_message", {
242                orgId: channel.tenantId,
243                metaMessageId: msg.id,
244                type: msg.type,
245                contentType,
246              });
247  
248              // ── Check if this is a CSAT response (single digit 1–5) ──────────
249              const csatContent = extractCsatScore(msg) ?? (contentType === "text" && /^[1-5]$/.test(content.trim()) ? content.trim() : null);
250              if (csatContent) {
251                const isCsat: boolean = await ctx.runMutation(internal.csat.checkAndRecordResponse, {
252                  tenantId: channel.tenantId,
253                  senderPhone: msg.from,
254                  content: csatContent,
255                  channelId: channel._id,
256                });
257                if (isCsat) {
258                  log("csat_response_recorded", {
259                    orgId: channel.tenantId,
260                    senderPhone: msg.from,
261                    score: csatContent,
262                  });
263                  continue;
264                }
265              }
266  
267              const result: {
268                messageId: Id<"messages">;
269                conversationId: Id<"conversations">;
270                isNewConversation: boolean;
271                isDuplicate: boolean;
272              } = await ctx.runMutation(internal.messages.createInbound, {
273                tenantId: channel.tenantId,
274                channelId: channel._id,
275                metaMessageId: msg.id,
276                senderPhone: msg.from,
277                wabaId: phoneNumberId,
278                content,
279                contentType,
280                mediaUrl,
281                timestamp: Number(msg.timestamp) * 1000,
282                senderDisplayName: senderName,
283              });
284  
285              if (result.isDuplicate) {
286                log("duplicate_message_skipped", {
287                  orgId: channel.tenantId,
288                  metaMessageId: msg.id,
289                });
290                continue;
291              }
292  
293              log("message_inserted", {
294                orgId: channel.tenantId,
295                messageId: result.messageId,
296                conversationId: result.conversationId,
297                isNewConversation: result.isNewConversation,
298              });
299  
300              if (mediaUrl) {
301                await ctx.scheduler.runAfter(0, internal.actions.resolveMedia.resolveInboundMedia, {
302                  messageId: result.messageId,
303                  mediaId: mediaUrl,
304                  channelId: channel._id,
305                  tenantId: channel.tenantId,
306                });
307              }
308  
309              if (result.isNewConversation) {
310                // Get the conversation to find its department
311                const conversation = await ctx.runQuery(internal.conversations.getInternal, {
312                  conversationId: result.conversationId,
313                });
314  
315                if (conversation?.departmentId) {
316                  const department = await ctx.runQuery(internal.departments.getInternal, {
317                    departmentId: conversation.departmentId,
318                  });
319  
320                  if (department?.assignmentMode === "round_robin") {
321                    await ctx.runAction(internal.actions.roundRobin.assignRoundRobin, {
322                      tenantId: channel.tenantId,
323                      channelId: channel._id,
324                      departmentId: conversation.departmentId,
325                      conversationId: result.conversationId,
326                    });
327                  }
328                }
329              }
330  
331              await ctx.runMutation(internal.automations.evaluateAndFireAutomations, {
332                tenantId: channel.tenantId,
333                channelId: channel._id,
334                conversationId: result.conversationId,
335                messageContent: content,
336                isNewConversation: result.isNewConversation,
337              });
338            }
339  
340            // ── Process status updates ──────────────────────────────────────
341            for (const status of value.statuses ?? []) {
342              const validStatuses = ["sent", "delivered", "read", "failed"] as const;
343              if (!validStatuses.includes(status.status)) continue;
344  
345              await ctx.runMutation(internal.messages.updateStatusByMetaId, {
346                metaMessageId: status.id,
347                status: status.status,
348                tenantId: channel.tenantId,
349              });
350  
351              log("status_update_applied", {
352                orgId: channel.tenantId,
353                metaMessageId: status.id,
354                status: status.status,
355              });
356  
357              if (status.status === "failed" && status.errors?.length) {
358                warn("message_delivery_failed", {
359                  orgId: channel.tenantId,
360                  metaMessageId: status.id,
361                  errors: status.errors,
362                });
363              }
364            }
365          }
366        }
367      } catch (err) {
368        warn("processing_error", { error: String(err) });
369        // Swallow — always return 200 to Meta
370      }
371  
372      return new Response("OK", { status: 200 });
373    }
374  
375    return new Response("Method Not Allowed", { status: 405 });
376  });
377  
378  // ── HMAC verification (Web Crypto API — works in Convex edge runtime) ────────
379  
380  async function verifyHmac(
381    body: string,
382    signature: string,
383    appSecret: string,
384  ): Promise<boolean> {
385    const encoder = new TextEncoder();
386    const key = await crypto.subtle.importKey(
387      "raw",
388      encoder.encode(appSecret),
389      { name: "HMAC", hash: "SHA-256" },
390      false,
391      ["sign"],
392    );
393    const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
394    const hexMac = Array.from(new Uint8Array(mac))
395      .map((b) => b.toString(16).padStart(2, "0"))
396      .join("");
397    return signature === `sha256=${hexMac}`;
398  }
399  
400  // ── Router ───────────────────────────────────────────────────────────────────
401  
402  const http = httpRouter();
403  http.route({ path: "/meta-webhook", method: "GET", handler: metaWebhook });
404  http.route({ path: "/meta-webhook", method: "POST", handler: metaWebhook });
405  // New structured webhook endpoint — routes by wabaId, modular processor files
406  http.route({ path: "/webhooks/meta", method: "GET", handler: metaWebhookV2 });
407  http.route({ path: "/webhooks/meta", method: "POST", handler: metaWebhookV2 });
408  http.route({ path: "/paddle-webhook", method: "POST", handler: paddleWebhook });
409  
410  authComponent.registerRoutes(http, createAuth);
411  
412  export default http;
```

**Only two changes from BEFORE:**
- Line 7 (added): `import { authComponent, createAuth } from "./auth";`
- Lines 410–411 (added): `authComponent.registerRoutes(http, createAuth);` + blank line before `export default http`

All other lines are identical to BEFORE. No existing routes are touched.

---

## §5. New Files

### §5.1 `convex/auth.ts`

```typescript
  1  import { createClient, type GenericCtx } from "@convex-dev/better-auth";
  2  import { convex } from "@convex-dev/better-auth/plugins";
  3  import { components } from "./_generated/api";
  4  import { DataModel } from "./_generated/dataModel";
  5  import { query } from "./_generated/server";
  6  import { betterAuth } from "better-auth/minimal";
  7  import { organization } from "better-auth/plugins";
  8  import { createAccessControl } from "better-auth/plugins/access";
  9  import authConfig from "./auth.config";
 10  
 11  export const authComponent = createClient<DataModel>(components.betterAuth);
 12  
 13  // ── Access control (Stage 1 §3.2, Q8 Option A) ───────────────────────────────
 14  // Empty resource statement — WabDesk gates access via role-string comparison
 15  // (assertAdmin, assertAdminOrSupervisor in convex/lib/auth.ts), not via
 16  // granular hasPermission checks. Stage 3 day-one: verify "org:admin" colon
 17  // syntax is accepted by Better Auth 1.6.9 organization plugin at runtime.
 18  const ac = createAccessControl({});
 19  const orgAdmin = ac.newRole({});
 20  const orgSupervisor = ac.newRole({});
 20  const orgAgent = ac.newRole({});
 21  
 22  // ── JWT payload ───────────────────────────────────────────────────────────────
 23  // MUST remain synchronous — no DB access permitted. activeOrganizationRole
 24  // must already be on the session record (written by session.update.before).
 25  // sessionId and iat are included explicitly per Stage 1 §9 Q1 locked shape;
 26  // if @convex-dev/better-auth 0.12.2 also auto-injects them, Stage 3 should
 27  // remove the duplicates. See §9 open question OQ-3.
 28  function definePayload({
 29    session,
 30  }: {
 31    user: Record<string, unknown>;
 32    session: Record<string, unknown>;
 33  }) {
 34    return {
 35      orgId: (session.activeOrganizationId as string | null | undefined) ?? "",
 36      orgRole:
 36        (session.activeOrganizationRole as string | null | undefined) ?? "org:agent",
 37      sessionId: session.id as string,
 38      iat: Math.floor(Date.now() / 1000),
 39    };
 40  }
 41  
 42  // ── Auth factory ──────────────────────────────────────────────────────────────
 43  // createAuth is called once per Convex request. The Convex ctx is closed over
 44  // by databaseHooks so adapter queries can use it inside hook callbacks.
 45  export const createAuth = (ctx: GenericCtx<DataModel>) => {
 46    return betterAuth({
 47      appName: "WabDesk",
 48      baseURL: process.env.SITE_URL!,
 49      secret: process.env.BETTER_AUTH_SECRET!,
 50      database: authComponent.adapter(ctx),
 51      emailAndPassword: {
 52        enabled: true,
 53        // false: invitation acceptance must not require prior email verification
 54        // (Stage 1 §7 risk #11). Stage 3: confirm this setting does not block
 55        // the email+password signup flow.
 56        requireEmailVerification: false,
 57      },
 58      socialProviders: {
 59        google: {
 60          clientId: process.env.GOOGLE_CLIENT_ID!,
 61          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
 62        },
 63        facebook: {
 64          clientId: process.env.FACEBOOK_CLIENT_ID!,
 65          clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
 66        },
 67      },
 68      // additionalFields on session adds activeOrganizationRole column to the
 69      // schema. Stage 3: verify Better Auth 1.6.9 supports session.additionalFields
 70      // (docs confirm user.additionalFields; session key is inferred by analogy).
 71      // If not supported, manually add the column to the CLI-generated schema.
 72      // See §9 open question OQ-1.
 73      session: {
 74        additionalFields: {
 75          activeOrganizationRole: {
 76            type: "string",
 77            required: false,
 78            input: false,
 79          },
 80        },
 81      },
 82      databaseHooks: {
 83        session: {
 84          create: {
 85            // Stage 1 §9 Q1 (locked): auto-set activeOrganizationId when a new
 86            // session is created and the user belongs to exactly one organization.
 87            // Closed over `ctx` is the Convex request context; the adapter query
 88            // targets the "member" model (different from "session") so no circular
 89            // DB call is involved.
 90            before: async (session) => {
 91              const members = await authComponent.adapter(ctx).findMany({
 92                model: "member",
 93                where: [{ field: "userId", value: session.userId }],
 94              });
 95              if (members.length === 1) {
 96                return {
 97                  data: {
 98                    ...session,
 99                    activeOrganizationId: (
100                      members[0] as Record<string, unknown>
101                    ).organizationId as string,
102                  },
103                };
104              }
105              return { data: session };
106            },
107          },
108          update: {
109            // Denormalize activeOrganizationRole onto the session record when
110            // activeOrganizationId changes. definePayload is sync, so it cannot
111            // query the DB — this hook is the only place the role can be written.
112            //
113            // hookCtx shape is Better Auth's internal hook context. The access
114            // pattern `hookCtx?.context?.session?.userId` is inferred from the
115            // docs example for user.update.before. Stage 3: verify this path
116            // against @convex-dev/better-auth 0.12.2. See §9 OQ-2.
117            before: async (
118              data: Record<string, unknown>,
119              hookCtx: unknown,
120            ) => {
121              const activeOrgId = data.activeOrganizationId as
122                | string
123                | null
124                | undefined;
125              if (!activeOrgId) return { data };
126              const hCtx = hookCtx as
127                | { context?: { session?: { userId?: string } } }
128                | undefined;
129              const sessionUserId = hCtx?.context?.session?.userId;
130              if (!sessionUserId) return { data };
131              const members = await authComponent.adapter(ctx).findMany({
132                model: "member",
133                where: [
134                  { field: "userId", value: sessionUserId },
135                  { field: "organizationId", value: activeOrgId },
136                ],
137              });
138              const role = (
139                members[0] as Record<string, unknown> | undefined
140              )?.role as string | undefined;
141              return {
142                data: { ...data, activeOrganizationRole: role ?? "org:agent" },
143              };
144            },
145          },
146        },
147      },
148      plugins: [
149        organization({
150          ac,
149          roles: {
150            "org:admin": orgAdmin,
151            "org:supervisor": orgSupervisor,
152            "org:agent": orgAgent,
153          },
154          creatorRole: "org:admin",
155          // Stage 2c wires this to convex/lib/emailHelpers.ts (Resend).
156          // Signature from better-auth docs:
157          //   data: { id, email, inviter: { user: { name, email } }, organization: { name } }
158          sendInvitationEmail: async (_data) => {
159            void _data;
160          },
161        }),
162        convex({ authConfig, jwt: { definePayload } }),
163      ],
164    });
165  };
166  
167  // ── getCurrentUser query ──────────────────────────────────────────────────────
168  export const getCurrentUser = query({
169    args: {},
170    handler: async (ctx) => {
171      return authComponent.getAuthUser(ctx);
172    },
173  });
```

**Import path citations:**
- `createClient`, `GenericCtx` from `"@convex-dev/better-auth"` — [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next)
- `convex` plugin from `"@convex-dev/better-auth/plugins"` — [labs.convex.dev/better-auth/api/convex-plugin](https://labs.convex.dev/better-auth/api/convex-plugin)
- `betterAuth` from `"better-auth/minimal"` — [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next)
- `organization` from `"better-auth/plugins"` — [better-auth.com/docs/plugins/organization](https://better-auth.com/docs/plugins/organization)
- `createAccessControl` from `"better-auth/plugins/access"` — [better-auth.com/docs/plugins/organization](https://better-auth.com/docs/plugins/organization) Access Control section

**⚠️ Stage 3 day-one flag — colon role names:** The `"org:admin"`, `"org:supervisor"`, `"org:agent"` keys in `roles: {}` use colon syntax not present in any better-auth documentation example. All docs examples use plain strings (`"owner"`, `"admin"`, `"member"`). This is Stage 1 Q8 Option A (locked); validity is a day-one Stage 3 verification step. If `"org:admin"` is rejected, the fallback is renaming to `"admin"` / `"supervisor"` / `"agent"` across all Convex role-check code — a Stage 3 scope expansion that requires Ahmed approval before proceeding.

---

### §5.2 `convex/betterAuth/convex.config.ts`

```typescript
1  import { defineComponent } from "convex/server";
2  
3  const component = defineComponent("betterAuth");
4  
5  export default component;
```

**Source:** [labs.convex.dev/better-auth/features/local-install](https://labs.convex.dev/better-auth/features/local-install) — "Component Definition — `convex/betterAuth/convex.config.ts`".

This file declares the local Convex Component. The string `"betterAuth"` must match the key used in `convex/convex.config.ts` (`app.use(betterAuth)` where `betterAuth` is the imported component).

---

### §5.3 `convex/betterAuth/auth.ts`

This file exists **solely for CLI schema generation** (`cd convex/betterAuth && npx auth generate`). It is not imported at runtime. It must include all plugins and `additionalFields` that affect the schema so the generated `schema.ts` includes the correct tables and columns.

```typescript
 1  import { betterAuth } from "better-auth/minimal";
 2  import { organization } from "better-auth/plugins";
 3  
 4  // Static export — used only by: cd convex/betterAuth && npx auth generate
 5  // NOT imported at runtime. Runtime config is in convex/auth.ts.
 6  // This file must mirror all schema-relevant config from convex/auth.ts:
 7  //   - plugins that add tables (organization adds: organization, member, invitation)
 8  //   - session.additionalFields (adds activeOrganizationRole column to session)
 9  // Do NOT include: convex plugin, databaseHooks, socialProviders, secret, baseURL.
10  export const auth = betterAuth({
11    plugins: [
12      organization(),
13    ],
14    session: {
15      additionalFields: {
16        activeOrganizationRole: {
17          type: "string",
18          required: false,
19          input: false,
20        },
21      },
22    },
23  });
```

**Source:** [labs.convex.dev/better-auth/features/local-install](https://labs.convex.dev/better-auth/features/local-install) — "Schema Generation: Add a static auth export to `convex/betterAuth/auth.ts` for schema generation purposes only."

---

### §5.4 `lib/auth-client.ts`

```typescript
 1  import { createAuthClient } from "better-auth/react";
 2  import { convexClient } from "@convex-dev/better-auth/client/plugins";
 3  import { organizationClient } from "better-auth/client/plugins";
 4  import { createAccessControl } from "better-auth/plugins/access";
 5  
 6  // Mirror the server-side access control config. Role names must match convex/auth.ts.
 7  // Stage 3 day-one: verify colon-separated role keys ("org:admin" etc.) are
 8  // accepted by organizationClient in better-auth 1.6.9. See §9 OQ-4.
 9  const ac = createAccessControl({});
10  const orgAdmin = ac.newRole({});
11  const orgSupervisor = ac.newRole({});
12  const orgAgent = ac.newRole({});
13  
14  export const authClient = createAuthClient({
15    plugins: [
16      convexClient(),
17      organizationClient({
18        ac,
19        roles: {
20          "org:admin": orgAdmin,
21          "org:supervisor": orgSupervisor,
22          "org:agent": orgAgent,
23        },
24      }),
25    ],
26  });
```

**Source:**
- `createAuthClient` from `"better-auth/react"` — [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next)
- `convexClient` from `"@convex-dev/better-auth/client/plugins"` — [labs.convex.dev/better-auth/api/convex-plugin](https://labs.convex.dev/better-auth/api/convex-plugin)
- `organizationClient` from `"better-auth/client/plugins"` — [better-auth.com/docs/plugins/organization](https://better-auth.com/docs/plugins/organization)
- `createAccessControl` from `"better-auth/plugins/access"` — [better-auth.com/docs/plugins/organization](https://better-auth.com/docs/plugins/organization) Access Control section

**Note:** `lib/auth-client.ts` is a browser file (used in Client Components). The import `"better-auth/react"` provides hooks like `useSession()`. The `convexClient()` plugin is what connects the auth session to the Convex WebSocket (no `crossDomain` plugin — Next.js does not need it per Correction 3 above).

---

### §5.5 `lib/auth-server.ts`

```typescript
 1  import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";
 2  
 3  export const {
 4    handler,
 5    preloadAuthQuery,
 6    isAuthenticated,
 7    getToken,
 8    fetchAuthQuery,
 9    fetchAuthMutation,
10    fetchAuthAction,
11  } = convexBetterAuthNextJs({
12    convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
13    convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
14  });
```

**Source:** [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next) — "Configure Next.js server utilities — `src/lib/auth-server.ts`".

**Notes:**
- `handler` is an object with `{ GET, POST }` — used by the Route Handler in §5.6
- `isAuthenticated()` replaces Clerk's `auth()` in Server Components / RSC layouts (Stage 2b)
- `fetchAuthQuery` / `fetchAuthMutation` / `fetchAuthAction` replace `convexAuthNextJsToken()` + manual header passing (Stage 2c)
- No `basePath` override — using default `/api/auth`; Route Handler is at `app/api/auth/[...all]/route.ts` which matches the default

---

### §5.6 `app/api/auth/[...all]/route.ts`

```typescript
1  import { handler } from "@/lib/auth-server";
2  
3  export const { GET, POST } = handler;
```

**Source:** [labs.convex.dev/better-auth/framework-guides/next](https://labs.convex.dev/better-auth/framework-guides/next) — "Mount Next.js route handler — `app/api/auth/[...all]/route.ts`".

**Why `export const { GET, POST } = handler` and NOT `export { handler as GET, handler as POST }`:** `handler` is an object `{ GET: RequestHandler, POST: RequestHandler }`, not a function. Destructuring assigns the correct handler function to each export. The alternate form would export the entire object as each method handler, which would cause Next.js to receive incorrect handler types.

**Directory note:** `app/api/auth/` does not currently exist. Stage 3 must create the directory path `app/api/auth/[...all]/` before creating this file.

---

## §6. CLI Step for Schema Generation (`convex/betterAuth/schema.ts`)

### Content

`convex/betterAuth/schema.ts` is **CLI-generated**. Its content is not specified by Stage 2a. Stage 3 produces it by running a command.

### CLI command (Stage 3 runs this)

```bash
cd convex/betterAuth
npx auth generate
```

Run from the `convex/betterAuth/` directory. The CLI reads `convex/betterAuth/auth.ts` (the static export in §5.3) and generates `convex/betterAuth/schema.ts`.

**Source:** [labs.convex.dev/better-auth/features/local-install](https://labs.convex.dev/better-auth/features/local-install) — "Schema Generation: then run `cd convex/betterAuth && npx auth generate`".

### Expected output location

`convex/betterAuth/schema.ts`

### Expected tables in generated schema

Based on the `convex/betterAuth/auth.ts` static export, the CLI should generate Convex table definitions for:

| Better Auth model | Convex table | Added by |
|---|---|---|
| `user` | `user` | core |
| `session` | `session` | core |
| `account` | `account` | core |
| `verification` | `verification` | core |
| `organization` | `organization` | organization plugin |
| `member` | `member` | organization plugin |
| `invitation` | `invitation` | organization plugin |

The `session` table must include `activeOrganizationId` (added by organization plugin) and `activeOrganizationRole` (added by `session.additionalFields` in the static auth config).

### If `session.additionalFields` is not picked up by the CLI

If the generated `schema.ts` does not include `activeOrganizationRole` on the session table (possible if `session.additionalFields` is unsupported — see §9 OQ-1), Stage 3 must manually add it to the generated schema. The field to add:

```typescript
// Inside the session table definition in convex/betterAuth/schema.ts:
activeOrganizationRole: v.optional(v.string()),
```

Manual addition is safe — the local install pattern explicitly supports editing the generated schema. See [labs.convex.dev/better-auth/features/local-install](https://labs.convex.dev/better-auth/features/local-install) — "Custom Indexes: The system allows adding custom database indexes... preserving custom indexes during regeneration."

### Regenerating the schema

To regenerate after config changes:

```bash
cd convex/betterAuth
npx auth generate
```

If `activeOrganizationRole` was manually added and the schema is regenerated, the manual addition must be re-applied. Document this in Stage 3 notes.

---

## §7. Stage 3 Application Order

Apply in this exact order. Each step depends on the previous.

1. `npm install @convex-dev/better-auth@0.12.2 better-auth@~1.6.9`  
   `npm uninstall @clerk/nextjs @clerk/localizations @better-auth/infra`

2. Set all six Convex env vars:
   ```bash
   npx convex env set BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
   npx convex env set SITE_URL="http://localhost:3000"
   npx convex env set GOOGLE_CLIENT_ID="..."
   npx convex env set GOOGLE_CLIENT_SECRET="..."
   npx convex env set FACEBOOK_CLIENT_ID="..."
   npx convex env set FACEBOOK_CLIENT_SECRET="..."
   ```

3. Add `NEXT_PUBLIC_CONVEX_SITE_URL` to `.env.local`

4. Create `convex/betterAuth/` directory

5. Create `convex/betterAuth/convex.config.ts` (§5.2 content)

6. Create `convex/convex.config.ts` (§4.2 AFTER content)

7. Create `convex/betterAuth/auth.ts` (§5.3 content)

8. Run CLI schema generation:
   ```bash
   cd convex/betterAuth
   npx auth generate
   ```
   Verify `convex/betterAuth/schema.ts` was created. Check that `session` table includes `activeOrganizationRole`. If missing, manually add `activeOrganizationRole: v.optional(v.string())`.

9. Create `convex/auth.ts` (§5.1 content)

10. Apply `convex/auth.config.ts` change (§4.3 AFTER)

11. Apply `convex/http.ts` change (§4.4 AFTER) — adds import + `registerRoutes` call

12. Create `lib/auth-client.ts` (§5.4 content)

13. Create `lib/auth-server.ts` (§5.5 content)

14. Create `app/api/auth/[...all]/` directory path

15. Create `app/api/auth/[...all]/route.ts` (§5.6 content)

16. `npx tsc --noEmit` — must be clean before Stage 3 closes. TypeScript errors at this point are Stage 3 blockers.

**Note:** Steps 1 and 2–15 are ordered so Convex schema is generated before `convex/auth.ts` is written (auth.ts imports from `components.betterAuth` which requires the schema to be in place for type generation). If `npx convex dev` must run between steps 8 and 9 to regenerate `_generated/` types, do so.

---

## §8. Verification Gates

The six mandatory verification steps from Stage 1 §6, restated with the Stage 2a files that enable each check.

| Step | What to verify | Where in Stage 2a plan |
|---|---|---|
| 1 | Role name colon validity: attempt `auth.api.inviteMember({ role: "org:admin" })` against local instance. If rejected, rename to plain strings before proceeding. | `convex/auth.ts` lines 150–153 (`roles` object) |
| 2 | `definePayload` is synchronous: confirm `definePayload` in `convex/auth.ts` contains no `await` and no async calls. | `convex/auth.ts` lines 28–40 |
| 3 | `activeOrganizationRole` in generated schema: after running CLI, `grep -n "activeOrganizationRole" convex/betterAuth/schema.ts` must return a result. If missing, apply manual fix (§6). | §6 "If session.additionalFields is not picked up" |
| 4 | `databaseHooks.session.create.before` timing: create a test user with one org; verify the session record in Convex DB has `activeOrganizationId` populated immediately after sign-in. | `convex/auth.ts` lines 90–106 |
| 5 | `NEXT_PUBLIC_CONVEX_SITE_URL` available to browser: confirm `process.env.NEXT_PUBLIC_CONVEX_SITE_URL` is defined in `.env.local` and prefixed correctly for Next.js client-side access. | §3 Env var setup |
| 6 | (Added Stage 1 §9 Flag #2) `organization.create()` auto-sets `activeOrganizationId`: after new user signs up and creates first org via `/onboarding` flow, verify the session's `activeOrganizationId` is set before the redirect to `/inbox`. If not auto-set, the `databaseHooks.session.create.before` hook (which reads the member table) fires too early; `ensureCreated` in `convex/onboarding.ts` must trigger `auth.api.setActiveOrganization()` after org creation. This is a Stage 2c scope item. | `convex/auth.ts` lines 82–106 |

---

## §9. Open Questions for Stage 2b/c/d

**OQ-1 — `session.additionalFields` support (Stage 3 blocker)**  
Better Auth 1.6.9 docs demonstrate `user.additionalFields` but the `session.additionalFields` key is only inferred by analogy. If the key is not supported, `activeOrganizationRole` must be added manually to the generated `convex/betterAuth/schema.ts`. The `databaseHooks.session.update.before` write will still work regardless (it's just a raw DB update). Risk: **low** (manual schema edit is the fallback), but must be verified at Stage 3 step 8.

**OQ-2 — `hookCtx.context.session?.userId` in `session.update.before` (Stage 3 blocker)**  
The second argument to `databaseHooks.session.update.before` is a Better Auth hook context. The access pattern `hookCtx?.context?.session?.userId` is inferred from the `user.update.before` docs example (`ctx.context.session`). If the session update hook context does NOT carry `session.userId` (e.g., because we're updating the session itself), `sessionUserId` will be `undefined` and the role population will silently no-op. Stage 3 must log `hookCtx` to confirm its shape. If `userId` is unavailable via this path, an alternative is to pass `userId` in the `setActiveOrganization` call's update payload (requires checking Better Auth's session update API).

**OQ-3 — `sessionId`/`iat` duplication in `definePayload` (Stage 3 minor)**  
The Convex plugin API docs state: "sessionId and iat are always added automatically" to the JWT payload. The `definePayload` in Stage 2a includes them explicitly per Stage 1 §9 locked shape. If the library auto-adds them AND our `definePayload` also returns them, they may be duplicated in the token. Stage 3 should inspect the actual JWT after sign-in; if duplicated, remove `sessionId` and `iat` from `definePayload`'s return object (1-line change, trivial).

**OQ-4 — `organizationClient` `ac` + `roles` API shape (Stage 3 day-one)**  
Docs confirm `organizationClient({ ac, roles: {...} })` is valid. However, the docs examples use plain role names (`"owner"`, `"admin"`, `"member"`) — same colon-name risk as OQ in §5.1. If `organizationClient` rejects colon role keys at client initialisation, `lib/auth-client.ts` fails on import. Caught by Step 1 of the verification gates.

**OQ-5 — `convexBetterAuthNextJs` exact export list (Stage 3 day-one)**  
`lib/auth-server.ts` destructures 7 exports from `convexBetterAuthNextJs(...)`. Stage 3 must confirm all 7 exist in `@convex-dev/better-auth@0.12.2/nextjs`. If any are missing, TypeScript will report an error. The import is stable per docs but the exact export list of 0.12.2 (vs older versions) was not verified against the installed package's type definitions.

**OQ-6 — `sendInvitationEmail` wiring (Stage 2c)**  
`convex/auth.ts` line 158 has a `void _data` placeholder. Stage 2c must replace this with a call to an email helper (likely `convex/lib/emailHelpers.ts`). The `data` shape is `{ id: string, email: string, inviter: { user: { name: string, email: string } }, organization: { name: string } }`.

**OQ-7 — `convex/lib/auth.ts` reads `orgId` / `orgRole` from JWT (Stage 2b)**  
`convex/lib/auth.ts` currently reads Clerk JWT claims (`identity.orgId`, `identity.o.id`, `identity.orgRole`, `identity.o.rol`). After Stage 2a, the JWT will carry `orgId` and `orgRole` as top-level flat claims (per `definePayload` in `convex/auth.ts`). Stage 2b replaces the multi-format resolver with a single `identity.orgId` / `identity.orgRole` read. The `normalizeOrgRole()` and `resolveOrgId()` helpers in `convex/lib/auth.ts` become dead code. Stage 2b scope.

---

## §10. Out of Scope — Explicit

These files were considered during Stage 2a planning but consciously excluded. The sub-stage that owns each is noted.

| File | Reason excluded | Owns |
|---|---|---|
| `convex/lib/auth.ts` | Shrinks from 72-line multi-format Clerk/BA resolver to ~15-line flat-claim reader. Depends on Stage 2a's `definePayload` JWT shape being finalised. | Stage 2b |
| `middleware.ts` | Deletion (Stage 1 §9 Flag #3 locked). Stage 2b provides BEFORE=current content, AFTER=deleted. Protected layouts gain `isAuthenticated()` RSC guards from `lib/auth-server.ts`. | Stage 2b |
| `convex/members.ts` | Contains `banUser`, `unbanUser`, `clerkClient()` call sites. | Stage 2c (Q3 deletions) + Stage 2c (27 call site replacements) |
| `convex/orgMembers.ts` | `clerkClient()` call sites for org membership management. | Stage 2c |
| `convex/lib/emailHelpers.ts` | `clerkClient()` call site for invitation email sending. Stage 2c wires `sendInvitationEmail`. | Stage 2c |
| `convex/actions/validateInvite.ts` | `clerkClient()` call site. | Stage 2c |
| `convex/actions/roundRobin.ts` | `clerkClient()` call site. | Stage 2c |
| `convex/onboarding.ts` | `ensureCreated` tenantId source changes from Clerk org ID to Better Auth org UUID. | Stage 2c |
| `lib/utils.ts` | `slugify()` helper to be added (Q10 Option A). Used in onboarding flow + session.create.before. | Stage 2c |
| `components/convex-client-provider.tsx` | Replace `<ConvexProviderWithClerk>` with `<ConvexBetterAuthProvider>`. | Stage 2d |
| `components/clerk-provider-with-locale.tsx` | Delete entirely. | Stage 2d |
| All `app/(auth)/sign-in/`, `sign-up/`, `organization/` pages | Replace Clerk UI components with Better Auth form-based pages. | Stage 2d |
| `convex/betterAuth/schema.ts` | CLI-generated (§6). Content is not specified by hand. | Stage 3 (generated) |

---

*End of Stage 2a Foundation Files Diff.*
