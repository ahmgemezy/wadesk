# Quickstart & Test Scenarios: Dashboard Shell & Role-Aware Navigation

## Prerequisites

- Dev server running: `npm run dev`
- Three test accounts in Clerk with different roles in the same org:
  - Account A: `org:admin`
  - Account B: `org:supervisor`
  - Account C: `org:agent`

---

## Test Suite

### US1 — Agent Shell (P1)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1.1 | Agent sees Inbox only | Log in as Agent → view sidebar | Only "Inbox / الصندوق" visible |
| 1.2 | Agent has role badge | Log in as Agent → inspect avatar area | Badge shows "Agent" (EN) / "وكيل" (AR) |
| 1.3 | Agent forbidden redirect | Log in as Agent → navigate to `/settings/billing` | Redirected to `/inbox` silently |
| 1.4 | Agent mobile nav | Log in as Agent → resize to <768px | Bottom nav appears with Inbox icon only |
| 1.5 | Agent RTL layout | Log in as Agent → switch locale to Arabic | Sidebar on right, Cairo font, RTL text |

---

### US2 — Admin Shell (P2)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 2.1 | Admin full nav | Log in as Admin → view sidebar | Inbox, Contacts, Analytics, Settings visible |
| 2.2 | Admin Settings sub-nav | Log in as Admin → expand Settings | Team, Channels, Quick Replies, Billing all visible |
| 2.3 | Admin org switcher | Log in as Admin (multiple orgs) → click org name | Dropdown lists all orgs; switching reloads scoped dashboard |
| 2.4 | Admin sign out | Log in as Admin → click Sign Out | Redirected to `/` (marketing homepage) |
| 2.5 | Admin role badge | Log in as Admin → inspect avatar | Badge shows "Admin" / "مدير" |

---

### US3 — Supervisor Shell (P3)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 3.1 | Supervisor no Billing | Log in as Supervisor → expand Settings | Team, Channels, Quick Replies visible; Billing absent |
| 3.2 | Supervisor billing redirect | Log in as Supervisor → navigate to `/settings/billing` | Redirected to `/inbox` |
| 3.3 | Supervisor role badge | Log in as Supervisor → inspect avatar | Badge shows "Supervisor" / "مشرف" |
| 3.4 | Supervisor contacts access | Log in as Supervisor → navigate to `/contacts` | Page loads successfully |

---

### US4 — Wayfinding (P4)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 4.1 | Active state — top level | Navigate to Analytics | Analytics link highlighted in sidebar |
| 4.2 | Active state — sub-page | Navigate to Settings → Team | Settings expanded, Team sub-item highlighted |
| 4.3 | Breadcrumb on sub-page | Navigate to Settings → Channels | Page header shows "Settings › Channels" |
| 4.4 | RTL active indicator | Switch to Arabic → navigate to Inbox | Active border appears on right side of Inbox item |

---

### Cross-Cutting

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 5.1 | Dark mode | Toggle OS to dark mode | Sidebar, bottom nav, badges all use dark variants |
| 5.2 | Tablet icon-only | Resize to 900px | Sidebar collapses to icons only; hover shows tooltip with label |
| 5.3 | iOS safe area | Open on iPhone Safari | Bottom nav not obscured by home indicator |
| 5.4 | Cairo font | View any page in Arabic | Cairo font renders for all sidebar labels and role badge |
| 5.5 | Directional icons | Switch to Arabic | Chevron icons in sidebar are mirrored correctly |
