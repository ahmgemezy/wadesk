# Data Model: Dashboard Shell & Role-Aware Navigation

## Overview

This feature has **no new Convex tables** — it is purely a UI shell. All data is read from existing sources:
- User identity and role: Clerk session (`auth()` → `orgRole`)
- Organization list: Clerk session (`auth()` → `orgId`, org switcher via Clerk components)

No database writes occur in this feature.

---

## UI Data Entities

These are TypeScript types used in the shell — not database tables.

### NavItem

Represents a single navigation link in the sidebar or bottom nav.

| Field       | Type                                    | Description                                      |
|-------------|-----------------------------------------|--------------------------------------------------|
| `href`      | `string`                                | Route path (e.g., `/inbox`, `/settings/team`)    |
| `labelAr`   | `string`                                | Arabic label                                     |
| `labelEn`   | `string`                                | English label                                    |
| `icon`      | `LucideIcon`                            | Icon component from lucide-react                 |
| `minRole`   | `'agent' \| 'supervisor' \| 'admin'`   | Minimum role required to see this item           |
| `children`  | `NavItem[]` (optional)                  | Sub-navigation items (e.g., Settings sub-pages)  |

### ResolvedUser

Shape of user data passed from server layout to sidebar client component.

| Field     | Type                                          | Description                          |
|-----------|-----------------------------------------------|--------------------------------------|
| `name`    | `string`                                      | User's display name                  |
| `email`   | `string`                                      | User's email address                 |
| `imageUrl`| `string`                                      | Avatar image URL                     |
| `role`    | `'org:admin' \| 'org:supervisor' \| 'org:agent'` | Clerk org role                   |
| `orgName` | `string`                                      | Active organization display name     |

---

## Role Hierarchy

```
org:admin      → sees all nav items
org:supervisor → sees all except Billing
org:agent      → sees Inbox only
```

Enforced at two levels:
1. **UI**: `NAV_ITEMS` filtered server-side before rendering sidebar
2. **Route**: Server layout redirects to `/inbox` if `orgRole` does not meet `minRole` for the current route
