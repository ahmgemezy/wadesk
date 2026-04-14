# WabDesk — Upcoming Features Plan

> Generated: 2026-04-14
> Branch: 009-automation-rules
> Purpose: Implementation roadmap for the next 4 features

---

## Priority Order

| # | Feature | Complexity | Plan Section |
|---|---|---|---|
| 1 | Round-robin assignment | Low | §1 |
| 2 | Data export | Medium | §2 |
| 3 | Advanced message templates | Medium | §3 |
| 4 | WhatsApp Business profile editing | Medium | §4 |

Billing (Polar.sh) is tracked separately — see docs/plans/ for billing plan.

---

## 1. Round-Robin Assignment (Task 014)

### Goal
Automatically distribute incoming conversations equally across agents in a channel.

### Files to Create
- `convex/roundRobin.ts` — `assignNextAgent(channelId)` internalMutation

### Files to Modify
- `convex/schema.ts` — ensure `channels.assignmentMode` and `channels.roundRobinIndex` exist
- `convex/http.ts` — after `createInbound`, if channel mode is `round_robin`, call `assignNextAgent`
- `convex/inbox.ts` — `createConversation` mutation: trigger round-robin if mode set
- `app/(dashboard)/settings/channels/[channelId]/page.tsx` — add Assignment Mode selector (radio group: First Reply / Manual / Round Robin)
- `convex/lib/planLimits.ts` — add round-robin to Growth+ gated features

### Core Logic (assignNextAgent)
```
1. Load channelMembers for channelId (active agents only)
2. If members.length === 0 → return null (stays unassigned)
3. index = channel.roundRobinIndex ?? 0
4. nextAgent = members[index % members.length]
5. Patch conversation.assignedTo = nextAgent.userId
6. Patch channel.roundRobinIndex = (index + 1) % members.length
7. Insert notification for assigned agent
```

### Acceptance Criteria
- [ ] New conversations auto-assigned in round-robin order
- [ ] Index wraps correctly after last agent
- [ ] Removing an agent from channel doesn't break rotation
- [ ] Admin can still manually reassign
- [ ] Mode selector in channel settings (Growth+ only)
- [ ] Free/Starter see disabled option with upgrade prompt

### Estimated Effort: 1 Claude Code session

---

## 2. Data Export (Task 015)

### Goal
Allow Admin/Supervisor to download all their tenant's contacts and conversations.

### Files to Create
- `convex/export.ts` — `generateContactsExport` and `generateConversationsExport` actions
- `app/(dashboard)/settings/export/page.tsx` — export UI page
- `components/settings/data-export.tsx` — export buttons + download state

### Files to Modify
- `lib/shell/nav-config.ts` — add "Data & Privacy" link under Settings (minRole: supervisor)

### Core Logic
```
generateContactsExport (Convex action):
1. Verify caller is Admin or Supervisor
2. Query all contacts where tenantId = caller's tenantId
3. Query customFields for each contact
4. Build CSV string (phone, name, tags, stage, notes, customFields JSON, firstSeen, lastSeen, source)
5. Upload CSV to Convex Storage
6. Return storage URL (signed, expires in 1 hour)

generateConversationsExport (Convex action):
1. Verify caller is Admin or Supervisor
2. Query all conversations for tenantId
3. For each conversation, query its messages
4. Build JSON array per schema in CLAUDE.md §27
5. Upload JSON to Convex Storage
6. Return storage URL
```

### UI States
- Idle: "Export Contacts (CSV)" button + "Export Conversations (JSON)" button
- Loading: spinner + "Preparing your export..."
- Done: "Download ready" with direct download link (auto-click or manual)
- Error: toast with retry

### Acceptance Criteria
- [ ] Contacts CSV downloads with all fields
- [ ] Conversations JSON includes full message history
- [ ] Export is strictly scoped to caller's tenantId
- [ ] Only Admin/Supervisor can trigger export
- [ ] Works on Free plan
- [ ] Large tenants (1000+ conversations) don't timeout

### Estimated Effort: 1 Claude Code session

---

## 3. Advanced Message Templates with Variables (Task: Templates)

### Goal
Templates with {{variable}} placeholders that agents fill in before sending, replacing basic quick replies for structured messages.

### Files to Create
- `convex/messageTemplates.ts` — list, create, update, remove
- `components/templates/template-picker.tsx` — popover trigger in MessageInput
- `components/templates/template-fill-form.tsx` — variable fill-in sheet
- `components/settings/templates-settings.tsx` — admin CRUD page
- `app/(dashboard)/settings/templates/page.tsx`

### Files to Modify
- `convex/schema.ts` — add `messageTemplates` table (see CLAUDE.md §29 for full schema)
- `components/inbox/message-input.tsx` — add template picker icon button to toolbar
- `lib/shell/nav-config.ts` — add Templates under Settings (minRole: supervisor)
- `convex/lib/planLimits.ts` — add template limits per plan

### Variable Parsing Helper (lib/templateHelpers.ts)
```typescript
export function extractVariables(body: string): string[] {
  const matches = body.matchAll(/\{\{(\w+)\}\}/g)
  return [...new Set([...matches].map(m => m[1].toLowerCase()))]
}

export function renderTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key.toLowerCase()] ?? `{{${key}}}`)
}
```

### Acceptance Criteria
- [ ] Templates CRUD in settings (Admin/Supervisor)
- [ ] Template picker in MessageInput toolbar
- [ ] Variable form renders dynamically from extracted variables[]
- [ ] Preview updates live as agent types
- [ ] Empty variable blocks send + shows error
- [ ] Arabic templates render correctly (RTL)
- [ ] Plan limits enforced (0 for Free, 10 Starter, 50 Growth, unlimited Business)
- [ ] Category filter tabs in settings page

### Estimated Effort: 1–2 Claude Code sessions

---

## 4. WhatsApp Business Profile Editing (Task: WA Profile)

### Goal
Allow admins to view and edit their WhatsApp Business profile (photo, description, address, category) from within WabDesk.

### Files to Create
- `convex/waBusinessProfile.ts` — `getProfile`, `updateProfile`, `uploadProfilePhoto` actions
- `components/settings/wa-business-profile.tsx` — profile edit form component
- `app/(dashboard)/settings/channels/[channelId]/profile/page.tsx` — profile tab page

### Files to Modify
- `app/(dashboard)/settings/channels/[channelId]/page.tsx` — add "Business Profile" tab linking to new page

### Meta API Calls (all via Convex actions using encrypted token)
```
GET  https://graph.facebook.com/v19.0/{phoneNumberId}/whatsapp_business_profile
     ?fields=about,address,description,email,profile_picture_url,websites,vertical

POST https://graph.facebook.com/v19.0/{phoneNumberId}/whatsapp_business_profile
     Body: { description, address, email, websites, vertical }

POST https://graph.facebook.com/v19.0/{phoneNumberId}/whatsapp_business_profile
     For photo: upload to Meta first → get handle → set profile_picture_handle
```

### Display Name Warning (IMPORTANT)
- Display name changes go through Meta review — NOT instant
- Do NOT include display name editing in v1 UI
- Show current display name as read-only with tooltip: "Name changes require Meta review — contact support"

### Acceptance Criteria
- [ ] Profile loads current data from Meta API on page open
- [ ] Description, address, email, website, category editable
- [ ] Profile photo upload + preview
- [ ] Saves field-by-field with per-field loading state
- [ ] Display name shown read-only with explanation
- [ ] Plan gate: Growth+ only (show upgrade prompt for Free/Starter)
- [ ] RTL form layout
- [ ] Errors from Meta API shown as toasts

### Estimated Effort: 1–2 Claude Code sessions

---

## Implementation Order Recommendation

Start with **Round-Robin (014)** — lowest complexity, touches familiar files, quick win.
Then **Data Export (015)** — self-contained, no UI complexity.
Then **Templates** — medium complexity, high user value.
Then **WA Profile** — depends on Meta API availability/testing.
