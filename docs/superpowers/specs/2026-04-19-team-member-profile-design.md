# Team Member Profile Sheet — Design Spec

**Date:** 2026-04-19  
**Status:** Approved  
**Feature:** Team member profile viewer in Settings → Team

---

## Overview

Admin and Supervisor users can click a team member row to view a profile side sheet. The sheet shows identity information, channel assignments, and performance statistics with a date range picker.

---

## Permission Model

| Caller | Can open profile of | Cannot open |
|---|---|---|
| Admin | Any member (admin, supervisor, agent) | — |
| Supervisor | Agents who share at least one channel with the caller | Admins, other supervisors, agents in unshared channels |

**UI behaviour:** Non-accessible rows have no hover state and no click handler — the restriction is invisible to the user. No error is shown.

**Backend enforcement:** The `getProfile` Convex query validates caller role and channel overlap server-side. Returns `FORBIDDEN` if the caller lacks access to the target member.

---

## Profile Sheet — Three Sections

### 1. Identity Header
- Avatar (image or initial fallback)
- Full name, email
- Role badge (Admin / Supervisor / Agent)
- Join date

### 2. Assigned Channels
- List of channel chips pulled from `channelMembers` table
- Each chip shows channel display name and phone number
- Active channels shown with a green dot

### 3. Performance Stats
- Date range picker (defaults to last 30 days)
- Three stat cards: Conversations Handled, Avg Response Time, CSAT Score
- Stats sourced from `conversationMetrics` table filtered by `assignedAgentId` and date range

---

## Backend — New Convex Query

**`convex/orgMembers.ts` — add `getProfile` query (or action if Clerk call needed)**

```
getProfile(targetUserId: string, startTs: number, endTs: number)
```

Steps:
1. Assert caller is `org:admin` or `org:supervisor`
2. If supervisor: fetch caller's `channelIds` from `channelMembers` → fetch target's `channelIds` → assert intersection is non-empty, else throw `FORBIDDEN`
3. Fetch target member identity from Clerk (`clerkClient().users.getUser(targetUserId)`)
4. Fetch target's `channelMembers` rows for display
5. Aggregate `conversationMetrics` rows where `assignedAgentId === targetUserId` and `createdAt` in `[startTs, endTs]`
6. Return: `{ identity, channels, stats: { conversationsHandled, avgFirstResponseTimeSeconds, avgCsatScore } }`

Since Clerk is called, this must be a Convex **action** (not a query).

---

## Frontend — New & Modified Files

### New: `components/settings/member-profile-sheet.tsx`
- Accepts `memberId: string | null` and `onClose: () => void`
- When `memberId` is non-null, calls `getProfile` action with current date range
- Renders Sheet with three sections
- Uses existing `DateRangePicker` component from analytics (defaults to last 30 days)
- Loading state: skeleton placeholders per section
- CSAT shown as "—" if no data

### Modified: `components/settings/team-member-list.tsx`
- Add `selectedMemberId: string | null` state
- Admin: all active member rows get `onClick={() => setSelectedMemberId(member.userId)}`
- Supervisor: only rows where `member.role === "org:agent"` get `onClick`; other rows remain non-interactive (no hover, no cursor change)
- Render `<MemberProfileSheet memberId={selectedMemberId} onClose={() => setSelectedMemberId(null)} />` at component root
- Pending (invited) members: no profile clickable (no `userId` yet)

---

## Data Sources

| Data | Source |
|---|---|
| Identity (name, email, avatar, join date) | Clerk via `clerkClient().users.getUser()` |
| Channel assignments | `channelMembers` table (by_tenant_user index) |
| Performance stats | `conversationMetrics` table (by_tenant_agent index) |

---

## Out of Scope

- Editing member details from the profile sheet (read-only)
- Viewing profiles of pending (invited) members
- Online/offline status indicator
- Conversation history drill-down from the profile

---

## No Schema Changes Required

All data already exists in `channelMembers` and `conversationMetrics`. No new tables or indexes needed.
