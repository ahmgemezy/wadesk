# Quickstart: Agent Roles & Permissions

**Feature**: `002-agent-roles` | **Date**: 2026-04-02

**Prerequisites**: `001-multi-agent-inbox` must be set up first (Convex project, Clerk org, schema deployed).

---

## 1. Configure Clerk Custom Roles

In your Clerk Dashboard → Organizations → Roles:

1. Create role: `supervisor` (Clerk will namespace as `org:supervisor`)
2. Create role: `agent` (Clerk will namespace as `org:agent`)
3. Set **Default member role** to `agent`

These roles appear in the Clerk JWT as `orgRole` and are accessible in Convex via `identity.orgRole`.

---

## 2. Add `inviteLinks` Table to Schema

Add to `convex/schema.ts`:

```typescript
inviteLinks: defineTable({
  tenantId: v.string(),
  token: v.string(),
  createdBy: v.string(),
  expiresAt: v.number(),
  revoked: v.boolean(),
  defaultRole: v.literal("org:agent"),
  createdAt: v.number(),
})
  .index("by_tenant", ["tenantId"])
  .index("by_token", ["token"]),
```

Push the schema:
```bash
npx convex dev
```

---

## 3. Add Environment Variables

```env
# .env.local (additions)
CLERK_SECRET_KEY=sk_test_...   # Already set — used for Backend SDK calls
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 4. Create Convex Functions

Create these files:

- `convex/orgMembers.ts` — `inviteByEmail`, `inviteByWhatsApp`, `changeRole`, `removeMember`, `list`
- `convex/inviteLinks.ts` — `generate`, `revoke`, `getActive`, `validateAndJoin`
- Add `setAssignmentMode` to `convex/channels.ts`
- Add `unassignAll` to `convex/conversations.ts`

---

## 5. Create Next.js Pages

```bash
# Team settings page (Admin only)
app/(dashboard)/settings/team/page.tsx

# Public invite join page
app/join/[token]/page.tsx

# Post-email-invite acceptance redirect
app/accept-invite/page.tsx
```

---

## 6. Run Development Server

```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: Convex dev (already running)
npx convex dev
```

---

## End-to-End Test Checklist

### Email Invitation
- [ ] Admin opens Settings → Team
- [ ] Admin enters email, selects "Agent" role, clicks Invite
- [ ] Invitee receives email with join link
- [ ] Invitee clicks link, creates account → lands on `/inbox`
- [ ] New member appears in team list with "Agent" role
- [ ] New agent can only see their own conversations (not others')

### WhatsApp Invitation
- [ ] Admin enters phone number (+201012345678), clicks "Invite via WhatsApp"
- [ ] Invitee receives WhatsApp message with join link
- [ ] Invitee clicks link, creates account → joins as Agent
- [ ] Invalid phone number shows inline error

### Shareable Invite Link
- [ ] Admin generates link → copies URL
- [ ] Open link in incognito → shows join page with org name
- [ ] Create account → joins as Agent role
- [ ] Admin revokes link → opening it shows "Invite expired or invalid"
- [ ] Generating a new link auto-revokes the previous one

### Role & Permission Enforcement
- [ ] Log in as Agent → cannot see conversations assigned to other agents
- [ ] Log in as Agent → Assign button is absent/disabled
- [ ] Log in as Supervisor → can see all conversations and reassign
- [ ] Log in as Supervisor → billing/settings pages return 403
- [ ] Log in as Admin → all actions succeed

### Last Admin Protection
- [ ] Admin tries to demote themselves when they are the only Admin → blocked with error
- [ ] Admin tries to remove themselves when only Admin → blocked with error

### Assignment Mode
- [ ] Admin sets channel to "Manual" → new conversations go to Unassigned queue
- [ ] Admin sets channel to "First Reply Wins" → first replying agent auto-assigned
- [ ] Admin sets channel to "Round Robin" on Free plan → blocked with upgrade prompt
- [ ] Round Robin on Growth plan → conversations rotate across all active agents

### Agent Removal
- [ ] Admin removes an agent who has open conversations
- [ ] Within 5 seconds, removed agent's conversations appear in Unassigned queue
- [ ] Removed agent cannot log in to the org

### Plan Limits
- [ ] Free plan tenant at 2 agents → invite blocked with plan limit message
- [ ] Upgrade prompt shown with specific plan recommendation
