# UI Contracts: Dashboard Shell & Role-Aware Navigation

## Contract 1: DashboardLayout Props

The root dashboard layout (`app/(dashboard)/layout.tsx`) resolves the user server-side and passes a `ResolvedUser` object to child components. No child component may re-fetch user/role data independently.

```ts
interface ResolvedUser {
  name: string;
  email: string;
  imageUrl: string;
  role: 'org:admin' | 'org:supervisor' | 'org:agent';
  orgName: string;
}
```

---

## Contract 2: AppSidebar Props

```ts
interface AppSidebarProps {
  user: ResolvedUser;
  navItems: NavItem[];   // pre-filtered for role server-side
  locale: 'ar' | 'en';
}
```

- `navItems` MUST already be filtered — sidebar does NOT filter internally
- `locale` determines `side="right"` (ar) vs `side="left"` (en)

---

## Contract 3: NavItem Shape

```ts
interface NavItem {
  href: string;
  labelAr: string;
  labelEn: string;
  icon: LucideIcon;
  minRole: 'agent' | 'supervisor' | 'admin';
  children?: NavItem[];
}
```

---

## Contract 4: Navigation Items Registry

The canonical nav items list (defined in `lib/nav-items.ts`):

| href                    | labelAr          | labelEn       | minRole    |
|-------------------------|------------------|---------------|------------|
| `/inbox`                | الصندوق          | Inbox         | agent      |
| `/contacts`             | جهات الاتصال     | Contacts      | supervisor |
| `/analytics`            | التحليلات        | Analytics     | supervisor |
| `/settings/team`        | الفريق           | Team          | supervisor |
| `/settings/channels`    | الإدارات          | Departments      | admin      |
| `/settings/quick-replies` | الردود السريعة | Quick Replies | supervisor |
| `/settings/billing`     | الفواتير         | Billing       | admin      |

---

## Contract 5: Route Protection Map

Server layouts/pages that enforce role gating must redirect to `/inbox` when the user's role is insufficient. The mapping:

| Route prefix             | Minimum role  |
|--------------------------|---------------|
| `/inbox`                 | agent         |
| `/contacts`              | supervisor    |
| `/analytics`             | supervisor    |
| `/settings/team`         | supervisor    |
| `/settings/channels`     | admin         |
| `/settings/quick-replies`| supervisor    |
| `/settings/billing`      | admin         |

---

## Contract 6: BottomNav (Mobile)

Renders only on `< 768px`. Shows a subset of nav items — maximum 5 icons to avoid crowding.

```ts
interface BottomNavProps {
  items: NavItem[];   // same filtered list, max 5 shown
  locale: 'ar' | 'en';
}
```

Active state: `border-t-2 border-t-primary` on active item.
Safe area: `pb-[env(safe-area-inset-bottom)]` on nav container.
