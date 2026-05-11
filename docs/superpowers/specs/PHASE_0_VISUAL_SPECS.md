# Phase 0 Visual Specifications

## Mobile Sidebar (Hidden State)

```
┌─────────────────────────────────────┐
│ ☰ WABDesk  [Search]  🔔  👤        │  <- Hamburger on left (LTR), right (RTL)
├─────────────────────────────────────┤
│                                     │
│  Main content area (full width)     │
│                                     │
│  Analytics cards, conversations     │
│  stack vertically (grid-cols-1)     │
│                                     │
└─────────────────────────────────────┘
```

When hamburger is clicked:
```
┌─────────────────────┐
│ 🔙 Inbox            │  <- Sidebar drawer overlays
│ 👥 Contacts         │
│ 📊 Analytics        │
│ ⚙️ Settings         │
├─────────────────────┤
│ 👤 Ahmed            │
└─────────────────────┘
```

## Focus Ring Examples

Button with focus ring:
```
┌─────────────────────────────┐
│ ┌───────────────────────┐   │
│ │ Save Changes          │ ← 2px outline, 2px offset
│ └───────────────────────┘   │
└─────────────────────────────┘
```

Input with focus ring:
```
┌────────────────────────────┐
│ ┌──────────────────────┐   │
│ │ Channel name         │ ← Blue border + outline
│ └──────────────────────┘   │
└────────────────────────────┘
```

## RTL Sidebar Selected Item

**LTR (English):**
```
┌────────────────────┐
│ ●│ 📥 Inbox       │ ← Blue border on LEFT
│  │ 12 unread      │
│  └────────────────┘
```

**RTL (Arabic):**
```
┌────────────────────┐
│ البريد الوارد │●  │ ← Blue border on RIGHT
│      رسائل 12  │  │
└─────────────────┘
```
