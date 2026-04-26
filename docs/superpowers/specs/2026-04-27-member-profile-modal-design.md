# Member Profile Modal — Design Specification

**Date:** April 27, 2026  
**Status:** Approved  
**Feature:** Admin-only detailed member profile view accessible from `/settings/team` page

---

## 1. Overview & Goals

The member profile modal allows admins to view comprehensive information about team members and perform management actions. It serves four key purposes:

1. **Performance Tracking** — understand agent productivity, speed, quality (CSAT)
2. **Team Management** — reassign channels, departments, change roles
3. **Onboarding/Support** — verify contact info, track tenure, reach out if needed
4. **Compliance & Accountability** — audit work history, investigate issues, document decisions

**Access:** Admin-only. Click any team member on `/settings/team` → modal opens.

---

## 2. Modal Architecture

**Type:** Modal dialog (centered popup, not full-page navigation)

**Structure:** Fixed contact card + 4 tabs in the modal header

```
┌─────────────────────────────────────────┐
│  Ahmed Gemmezi  [Agent]                 │  ← Sticky contact card
│  gemmezy@gmail.com  Last login: Today   │
├─────────────────────────────────────────┤
│ Overview | Analytics | History | Manage │  ← Tabs
├─────────────────────────────────────────┤
│                                         │
│  [Tab Content — scrollable]             │
│                                         │
└─────────────────────────────────────────┘
```

**Modal Size:** ~600px wide, ~700px tall (responsive, scrollable content)

**Close Behavior:** 
- X button in top-right corner
- Click outside modal to close
- Unsaved changes in Manage tab show confirmation dialog

---

## 3. Tab 1: Overview

**Purpose:** Quick reference — contact details and current assignments.

**Content:**

### Sticky Contact Card (Always Visible)
- **Name** — large, bold text
- **Email** — secondary gray text
- **Role badge** — colored: Admin (purple), Supervisor (blue), Agent (green)
- **Quick Stats Row:**
  - Last login: "Today, 11:04 AM" or "5 days ago"
  - Join date: "Mar 10, 2026"
  - Manager: "Ahmed Hussien" (if assigned, otherwise "Unassigned")

### Assignments Section
- **Channels** — List of WhatsApp channels with checkmarks
  - Example: "✓ Sales, ✓ Support"
  - Formatted as tags or simple list
  - Non-interactive (editing happens in Manage tab)

- **Departments** — List of departments with checkmarks
  - Example: "✓ Support, ✓ Training"
  - Note: "Determines which conversations they can see"

### Quick Performance Snapshot (Mini Preview)
- 3-4 key metrics, current month only:
  - Response time: "2.3 min avg"
  - CSAT score: "4.7 ⭐"
  - Conversations handled: "142"
  - Resolution rate: "94%"
- Small cards with subtle color coding (green/orange/red)
- Link: "View full analytics →" (switches to Analytics tab)

**Read-Only:** No edits on this tab; all edits in Manage tab.

---

## 4. Tab 2: Analytics

**Purpose:** Deep dive into performance metrics across time ranges and channels.

**Content:**

### Time Range Selector (Sticky Top)
- 4 pill/radio buttons: `Week | Month | 90 Days | All-time`
- Default: "Month"
- All metrics below update on change
- No loading state needed (assume data is pre-fetched or fast)

### Tenant-Wide Summary (Primary View)
- Grid of 5 metric cards, each showing:
  - **Metric name** (e.g., "Response Time", "CSAT Score")
  - **Value** (e.g., "2.3 min", "4.7 ⭐")
  - **Sparkline** — tiny inline trend chart (last 4 weeks within the selected range)
  - **Color coding:**
    - Response Time: <2min = green, 2-5min = orange, >5min = red
    - Conversation Volume: no color, just number
    - Avg Conversation Length: no color, just number
    - Resolution Rate: >90% = green, 70-90% = orange, <70% = red
    - CSAT Score: >4.5 = green, 3.5-4.5 = orange, <3.5 = red

### Channel Breakdown Table
- **Columns:** Channel name | Response Time | Conversation Volume | Avg Length | Resolution Rate | CSAT Score
- **Rows:** One row per channel the agent is assigned to
- **Sortable:** Click column header to sort ascending/descending
- **Purpose:** Spot performance variance across channels (e.g., "fast in Sales, slow in Support")
- **Interaction:** Click row → expand to see more details (optional, v1 can be simple)

**Empty State:**
- No conversations in selected period: "No conversations in this period. Select a different time range."
- Agent just joined: "Not enough data yet. Check back after their first week."

---

## 5. Tab 3: History

**Purpose:** Audit trail and recent work — track actions for compliance, investigate issues.

**Content:**

### A) Recent Conversations (Top Half, Scrollable)
- **List of last 20 conversations** this agent was involved in, sorted newest first
- Each row shows:
  - **Customer name/phone** (e.g., "+20 101 234 5678")
  - **Status badge** (Open / Resolved / Pending)
  - **Assigned on** date + time (e.g., "Mar 25, 3:14 PM")
  - **Last message** timestamp (e.g., "2 hours ago")
  - **Click to expand** → show full conversation thread (all messages + internal notes)

- **Filters above list:**
  - Status: All / Open / Resolved / Pending
  - Date range: This week / This month / Custom date picker

### B) Full Action Audit Trail (Bottom Half, Searchable)
- **Chronological timeline** of every action this agent took
- Each log entry shows:
  - **Timestamp** with relative time ("2 hours ago") and full datetime on hover
  - **Action** type (Opened conversation, Sent message, Closed conversation, Reassigned to X, Updated contact, Added internal note, etc.)
  - **Details** (which conversation, which contact, what was changed)
  - **Conversation ID** (clickable link to jump to conversation in Inbox)

- **Search box** at top:
  - Search by conversation ID, phone number, or action keyword
  - Real-time filter as user types

- **Pagination/Load More:**
  - Show last 100 entries by default
  - "Load more" button if additional entries exist
  - Or pagination: "Page 1 of 5"

**Empty State:**
- "No history available" (new agent, no activity yet)

---

## 6. Tab 4: Manage

**Purpose:** Administrative control — edit info, reassign, change role, disable account.

**Content:**

### A) Contact Information (Editable)
- **Inline edit fields or modal form:**
  - First name (text input)
  - Last name (text input)
  - Email (text input, show validation)
  - Phone number (text input, E.164 format)
  - Job title (text input, e.g., "Support Lead", "Account Manager")
  - Manager (dropdown, select from list of admins/supervisors, optional)
  - Personal admin notes (textarea, private, visible only to admins)
    - Use case: "Good performer, sometimes takes long breaks" or "Still in onboarding"

- **Save button** after edits
- **Confirmation toast** on successful save
- **Validation errors** if invalid input (e.g., invalid email)

### B) Channel & Department Assignments (Reassign)
- **Channels section:**
  - Checkbox list of all available channels
  - Current assignments checked
  - Admin can toggle on/off
  - "Save changes" button

- **Departments section:**
  - Checkbox list of all available departments
  - Current assignments checked
  - Admin can toggle on/off
  - **Warning message:** "Changing department assignment restricts/expands which conversations they can see."
  - "Save changes" button

- **Confirmation on save:** "Update assignments? They will immediately gain/lose access to conversations."

### C) Role & Permissions (Change Role)
- **Current role display** with edit option
- **Dropdown to change role:** Admin → Supervisor → Agent (and reverse)
  - **Disabled states:**
    - If user is PRIMARY ADMIN: "Primary Admin — cannot change role to another role"
    - Gray out the dropdown with explanation
  
  - **Confirmation dialog on change:**
    - "Changing to Supervisor means they can invite/remove agents. Continue?"
    - or "Changing to Agent removes their ability to manage team members."

- **Save button** and confirmation toast

### D) Account Status (Disable/Remove)
- **Disable Account button** (warning/orange color)
  - Temporarily disables login
  - Conversations automatically reassigned to team
  - User can re-enable later (same button becomes "Re-enable")
  - Confirmation: "Disable this agent's account? They won't be able to log in. Conversations will be reassigned."

- **Remove from Organization button** (danger/red color)
  - **Only visible if current user is PRIMARY ADMIN**
  - Confirmation modal with strong warnings:
    - "Remove [Name] from organization?"
    - "This cannot be undone."
    - "All conversations will be reassigned to the team."
    - Text input to confirm: "Type their name to confirm removal"
    - Two buttons: "Cancel" | "Remove" (disabled until name is typed correctly)

---

## 7. Access Control & Permissions

| Action                    | Admin | Supervisor | Agent |
|---------------------------|-------|------------|-------|
| View Overview             | ✅    | ❌         | ❌    |
| View Analytics            | ✅    | ❌         | ❌    |
| View History              | ✅    | ❌         | ❌    |
| View Manage tab           | ✅    | ❌         | ❌    |
| Edit contact info         | ✅    | ❌         | ❌    |
| Reassign channels         | ✅    | ❌         | ❌    |
| Reassign departments      | ✅    | ❌         | ❌    |
| Change role               | ✅    | ❌         | ❌    |
| Disable account           | ✅    | ❌         | ❌    |
| Remove from org           | Primary Admin only | ❌ | ❌ |

**Enforcement:** All permission checks must be server-side in Convex functions, not client-side.

---

## 8. Data Model & Fetching

### Data Required
- Member profile: name, email, phone, job title, manager, role, join date, last login, departments, channels
- Analytics data: aggregate metrics per member, per time range, per channel
- History data: recent conversations, full action audit log (from a new `memberActionLog` or similar table)
- Contact info: current assignments, current status (active/disabled)

### Convex Functions Needed (Skeleton)
- `getMemberProfile(tenantId, memberId)` — fetch basic info + assignments
- `getMemberAnalytics(tenantId, memberId, timeRange)` — fetch metrics summary + channel breakdown
- `getMemberRecentConversations(tenantId, memberId, limit)` — last N conversations
- `getMemberAuditLog(tenantId, memberId, filters, search)` — action log with search
- `updateMemberContact(tenantId, memberId, updates)` — edit contact info
- `updateMemberAssignments(tenantId, memberId, channels, departments)` — reassign
- `updateMemberRole(tenantId, memberId, newRole)` — change role
- `disableAccount(tenantId, memberId)` / `enableAccount(tenantId, memberId)`
- `removeFromOrganization(tenantId, memberId)` — **primary admin only**

### Caching Strategy
- Member profile: cache for 5 minutes (unlikely to change frequently)
- Analytics: cache for 1 hour (based on pre-computed aggregations)
- History: no caching (always fresh)

---

## 9. Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| Member deleted by another admin | Modal shows "This member no longer exists. Close this modal." |
| Member role changed while modal is open | Modal shows banner: "This member's role was updated." Offer to refresh. |
| Network error while saving changes | Toast error: "Failed to save changes. Please try again." Keep form intact. |
| Admin tries to remove themselves | Block with message: "You cannot remove your own account." |
| Admin tries to remove last primary admin | Block with message: "Cannot remove the last primary admin." |
| Permission denied (e.g., supervisor tries to access) | Modal closes, redirect to settings/team, show error toast. |

---

## 10. RTL & Localization

**RTL Requirements (Arabic UI):**
- Modal and all content must work in RTL
- Use `start`/`end` CSS utilities, not `left`/`right`
- Icons: flip directional arrows (chevrons, etc.) for RTL
- Timestamps displayed in standard format, respecting locale
- Numbers: use Western numerals (0-9) for metrics, consistency with rest of app

**Localizations:**
- Tab labels, field labels, button text all localizable
- Error messages localized
- Confirmation dialogs translated

---

## 11. Success Criteria

- ✅ Admin can view all 4 tabs without errors
- ✅ Analytics update when time range changes (Week/Month/90-day/All-time)
- ✅ History search works (filter by conversation ID, phone, action type)
- ✅ Reassign channels/departments updates immediately in the UI
- ✅ Role changes show confirmation and persist
- ✅ Disable/remove account only available to appropriate admins
- ✅ All management actions are server-side validated (Convex)
- ✅ Modal is responsive and works on mobile (if needed)
- ✅ Modal closes on ESC or outside click
- ✅ No cross-tenant data leakage (always filtered by tenantId)

---

## 12. Future Enhancements (Phase 2+)

- Conversation replay/transcript viewer in History tab
- Performance trend graphs (line charts over time)
- Bulk actions on multiple members
- Member performance scoring/badges
- Integration with HR systems (onboarding status, training completed, etc.)
- SMS/WhatsApp notifications to agent about profile changes
- Export member analytics as PDF
