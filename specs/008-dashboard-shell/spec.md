# Feature Specification: Dashboard Shell & Role-Aware Navigation

**Feature Branch**: `008-dashboard-shell`
**Created**: 2026-04-04
**Status**: Draft
**Input**: User description: "Dashboard shell and role-aware navigation for WaDesk. A persistent app shell wrapping all dashboard pages with a sidebar (desktop) and bottom nav (mobile). Navigation items are role-aware: Admin sees full nav (Inbox, Contacts, Analytics, Settings with all sub-pages); Supervisor sees same minus Billing; Agent sees only Inbox. The shell includes org switcher, user avatar with role badge, and sign-out. All role restrictions enforced at both UI and Convex data layer. RTL-first with Cairo font, dark mode supported."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Agent Navigates the Inbox (Priority: P1)

An agent logs in and lands on a minimal, focused dashboard showing only the Inbox. There is no clutter from settings, billing, or analytics — just the tools they need to reply to customers. On desktop they see a sidebar; on mobile a bottom navigation bar.

**Why this priority**: Agents are the most frequent users of WaDesk. Without a usable shell they cannot navigate the product at all. This is the foundation every other story depends on.

**Independent Test**: Log in as an Agent role → see sidebar with only Inbox link → navigate to Inbox → no Settings, Billing, or Analytics links visible anywhere.

**Acceptance Scenarios**:

1. **Given** a user with Agent role is logged in, **When** they view the dashboard, **Then** the sidebar shows only "Inbox" as a navigation link
2. **Given** an Agent is on desktop, **When** they view the shell, **Then** a persistent left sidebar (right in RTL) is visible with their name, role badge ("Agent" / "وكيل"), and a sign-out option
3. **Given** an Agent is on mobile, **When** they view the shell, **Then** a bottom navigation bar replaces the sidebar with an Inbox icon and label
4. **Given** an Agent tries to access `/settings/billing` directly via URL, **When** the page loads, **Then** they are redirected to `/inbox` with no error flash
5. **Given** the UI language is Arabic, **When** an Agent views the shell, **Then** the layout is RTL, sidebar is on the right, Cairo font is used throughout

---

### User Story 2 - Admin Navigates the Full Dashboard (Priority: P2)

An Admin logs in and sees the complete navigation: Inbox, Contacts, Analytics, and Settings (with sub-pages: Team, Channels, Quick Replies, Billing). They can switch between organizations if they belong to multiple, and sign out from the user menu.

**Why this priority**: Admins configure and manage the entire product. Without full navigation they cannot onboard agents, connect WhatsApp, or manage billing.

**Independent Test**: Log in as Admin → all nav items visible → navigate to Settings → all sub-pages accessible → org switcher visible and functional → sign-out works.

**Acceptance Scenarios**:

1. **Given** an Admin is logged in, **When** they view the shell, **Then** the sidebar shows: Inbox, Contacts, Analytics, Settings
2. **Given** an Admin expands Settings, **When** they view sub-navigation, **Then** they see: Team, Channels, Quick Replies, Billing
3. **Given** an Admin belongs to multiple organizations, **When** they click the org switcher, **Then** a dropdown lists all their orgs and switching reloads the dashboard scoped to the selected org
4. **Given** an Admin views their avatar area, **When** they inspect the role badge, **Then** it displays "Admin" (or "مدير" in Arabic)
5. **Given** an Admin clicks Sign Out, **When** the action completes, **Then** they are redirected to the marketing homepage

---

### User Story 3 - Supervisor Navigates Without Billing (Priority: P3)

A Supervisor logs in and sees the same navigation as Admin except the Billing sub-page is hidden. They can manage the team, view analytics, and handle conversations — but cannot access payment or plan information.

**Why this priority**: Supervisors are common in medium-sized teams. Hiding billing is a critical trust and security boundary between operational and financial access.

**Independent Test**: Log in as Supervisor → Settings visible → expand Settings → Billing link absent → navigate to `/settings/billing` directly → redirected to `/inbox`.

**Acceptance Scenarios**:

1. **Given** a Supervisor is logged in, **When** they expand Settings in the sidebar, **Then** they see Team, Channels, Quick Replies — but NOT Billing
2. **Given** a Supervisor navigates to `/settings/billing` via URL, **When** the page loads, **Then** they are redirected to `/inbox`
3. **Given** a Supervisor views their role badge, **When** they inspect it, **Then** it displays "Supervisor" (or "مشرف" in Arabic)

---

### User Story 4 - Active Navigation State & Wayfinding (Priority: P4)

Any user navigating between sections always knows where they are. The current page is highlighted in the sidebar/bottom nav. Page titles reflect the current section. Breadcrumbs appear on nested settings pages.

**Why this priority**: Without clear wayfinding users get lost — especially in Arabic RTL layouts where directional cues differ from LTR conventions.

**Independent Test**: Navigate to Analytics → Analytics link highlighted → navigate to Settings → Team → breadcrumb shows "Settings › Team" → Team link highlighted in sub-nav.

**Acceptance Scenarios**:

1. **Given** a user is on the Inbox page, **When** they view the sidebar, **Then** the Inbox link is visually highlighted as active
2. **Given** a user navigates to a Settings sub-page, **When** they view the sidebar, **Then** Settings is expanded and the active sub-page is highlighted
3. **Given** a user is on a nested settings page, **When** they view the page header, **Then** a breadcrumb trail shows their location (e.g., Settings › Team)
4. **Given** the layout is RTL, **When** a user views the active state indicator, **Then** the highlight indicator appears on the correct (right) side of the nav item

---

### Edge Cases

- What happens when a user's role changes while they are logged in? → Shell re-renders nav items to match new role on next navigation without requiring sign-out
- What happens when a user belongs to no organization? → Redirected to onboarding flow (existing dashboard layout guard handles this)
- What happens when the sidebar content is taller than the viewport? → Nav items scroll independently; user info and sign-out remain pinned to the bottom
- What happens on tablet (768–1024px)? → Sidebar collapses to icon-only mode; hovering/tapping shows full label as tooltip
- What happens if an Agent bookmarks a forbidden URL? → Server-side redirect to `/inbox` silently — no error page shown

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The shell MUST wrap all authenticated dashboard pages with a persistent sidebar on desktop (≥1024px) and a bottom navigation bar on mobile (<768px)
- **FR-002**: Navigation items MUST be filtered by the user's role: Admin sees all items; Supervisor sees all except Billing; Agent sees Inbox only
- **FR-003**: Role-based route restrictions MUST be enforced server-side — accessing a forbidden route via direct URL MUST redirect the user, not merely hide the link
- **FR-004**: The shell MUST display the user's name, avatar, and role badge (Admin / Supervisor / Agent in both Arabic and English)
- **FR-005**: The shell MUST include an organization switcher for users who belong to multiple organizations
- **FR-006**: The shell MUST include a Sign Out action accessible from the user avatar area
- **FR-007**: The active navigation item MUST be visually distinguished from inactive items at all times
- **FR-008**: Settings sub-navigation MUST be expandable/collapsible and preserve its open state during the session
- **FR-009**: The shell MUST render in RTL layout when the user's locale is Arabic, and LTR when English
- **FR-010**: The shell MUST support dark mode — all nav elements, backgrounds, and badges must have correct dark variants
- **FR-011**: On tablet viewports (768–1024px), the sidebar MUST collapse to icon-only mode with tooltip labels on hover/tap
- **FR-012**: The bottom navigation bar on mobile MUST show icons with short labels and respect safe area insets (iOS notch/home indicator)

### Key Entities

- **Navigation Item**: A link in the shell with a label (Arabic + English), an icon, a target route, and a minimum role required to see it
- **Role Badge**: A visual tag on the user avatar displaying their current role in the active locale (Admin/مدير, Supervisor/مشرف, Agent/وكيل)
- **Organization Switcher**: A dropdown listing all orgs the current user belongs to, with the active org name and logo displayed in the shell header

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any user can navigate to any permitted page within 2 taps/clicks from any other page
- **SC-002**: An Agent attempting to access a forbidden route is redirected within 1 second with no visible error flash
- **SC-003**: The shell renders correctly in RTL Arabic layout with no clipped text, misaligned icons, or broken spacing on all screen sizes
- **SC-004**: All shell text and icons meet 4.5:1 contrast ratio in both light and dark modes
- **SC-005**: On mobile, all bottom nav items are fully tappable (minimum 44×44px hit area) with no elements obscured by system UI
- **SC-006**: Nav items and role badge update to reflect a role change without requiring a full page reload or sign-out

---

## Assumptions

- User authentication and organization membership are already handled by Clerk — the shell reads role from the active Clerk session
- The three roles (Admin, Supervisor, Agent) are configured in Clerk Dashboard as `org:admin`, `org:supervisor`, `org:agent` (completed in 002-agent-roles)
- The Inbox page exists; Contacts, Analytics, and Settings pages will be built in parallel features — the shell provides navigation scaffolding for them
- Arabic is the default locale; locale preference is managed by the existing i18n system (established in 007-marketing-site)
- The Cairo font is already loaded via the Next.js font system (established in 007-marketing-site)
- Dark mode toggle/preference is consumed by the shell, not managed by it — a separate theme preference feature handles the toggle
- The org switcher only lists existing organizations — creating new orgs is handled in the onboarding flow
- On tablet (768–1024px), icon-only sidebar is acceptable UX — full labels are not required at this breakpoint
