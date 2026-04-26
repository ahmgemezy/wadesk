# Template Library — Industry & Purpose Filter Enhancement

**Date:** 2026-04-26  
**Status:** Approved  
**Scope:** `lib/templateLibrary.ts`, `components/templates/template-library-tab.tsx`, `components/templates/library-template-card.tsx`

---

## Goal

Add two new filter dimensions to the Template Library tab:
1. **Industry** — vertical-specific tabs (E-commerce, Healthcare, etc.)
2. **Purpose** — Meta's classification (Marketing / Utility / Authentication)

This strengthens the USP: the library feels curated per business type, not just a flat list of 66 generic templates.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Filter layout | Industry tabs on top, Purpose + Category chips below | Industry is the hero — users pick their vertical first |
| Card badge style | Merged type+purpose badge + industry tag(s) in footer | Same visual weight as today, adds key new info without crowding |
| Industry assignment | Multi-industry (array of strings per template) | Templates like "Appointment Confirmed" fit Healthcare, Beauty, and Auto simultaneously |
| Industries included | All 10 (see list below) | Full coverage of Egyptian & Gulf SMB verticals |

---

## Industries

| Key | Label | Emoji |
|---|---|---|
| `ecommerce` | E-commerce & Retail | 🛍️ |
| `food` | Food & Restaurants | 🍽️ |
| `health` | Healthcare & Clinics | 🏥 |
| `realestate` | Real Estate | 🏠 |
| `education` | Education & Training | 🎓 |
| `beauty` | Beauty & Salons | 💅 |
| `auto` | Auto & Services | 🚗 |
| `finance` | Finance & Insurance | 💰 |
| `travel` | Travel & Tourism | ✈️ |
| `general` | General / Other | ⚙️ |

---

## Data Model Changes (`lib/templateLibrary.ts`)

### New type

```ts
export type Industry =
  | "ecommerce" | "food" | "health" | "realestate"
  | "education" | "beauty" | "auto" | "finance"
  | "travel" | "general";
```

### Updated `LibraryTemplate`

Add one field:

```ts
industries: Industry[];   // one or more — never empty
```

### New constant

```ts
export const INDUSTRY_LABELS: Record<Industry, { en: string; ar: string; icon: string }> = {
  ecommerce:  { en: "E-commerce & Retail",   ar: "التجارة الإلكترونية", icon: "🛍️" },
  food:       { en: "Food & Restaurants",    ar: "المطاعم والأكل",     icon: "🍽️" },
  health:     { en: "Healthcare & Clinics",  ar: "الصحة والعيادات",    icon: "🏥" },
  realestate: { en: "Real Estate",           ar: "العقارات",           icon: "🏠" },
  education:  { en: "Education & Training",  ar: "التعليم والتدريب",   icon: "🎓" },
  beauty:     { en: "Beauty & Salons",       ar: "الجمال والصالونات",  icon: "💅" },
  auto:       { en: "Auto & Services",       ar: "السيارات والخدمات",  icon: "🚗" },
  finance:    { en: "Finance & Insurance",   ar: "المالية والتأمين",   icon: "💰" },
  travel:     { en: "Travel & Tourism",      ar: "السفر والسياحة",     icon: "✈️" },
  general:    { en: "General / Other",       ar: "عام",                icon: "⚙️" },
};
```

### Industry tagging per template (representative assignments)

| Template group | Industries |
|---|---|
| Flash Sale, Seasonal Offer, New Arrival, Win-Back | `ecommerce`, `food`, `beauty` |
| Order Confirmed, Shipped, Delivered | `ecommerce`, `food` |
| Appointment Confirmed/Reminder/Cancelled | `health`, `beauty`, `auto`, `education` |
| Payment Received, Due, Failed | `ecommerce`, `realestate`, `finance`, `health` |
| Welcome New Customer, Account Created | `general` (all verticals — tag `general`) |
| CSAT Request, Review Request | `general` |
| Account Security Alert, Service Update | `general`, `finance` |
| Re-engagement / Follow-Up | `ecommerce`, `food`, `beauty` |
| Real Estate property templates (new) | `realestate` |
| All Quick-Reply templates | `general` |

> Note: templates tagged `general` appear under every industry tab because "All" includes everything, and industry-specific tabs only show templates whose `industries` array contains that industry key.

---

## Filter Logic (`template-library-tab.tsx`)

```ts
// Filtering order: industry → purpose → category → search
filtered = LIBRARY_TEMPLATES.filter(tpl => {
  // "general" templates are universal — they appear under every industry tab
  const passesIndustry =
    industryFilter === "all" ||
    tpl.industries.includes(industryFilter) ||
    tpl.industries.includes("general");
  if (!passesIndustry) return false;
  if (purposeFilter !== "all" && tpl.metaCategory !== purposeFilter) return false;  // quick_reply has no metaCategory → excluded when purpose filter is active
  if (categoryFilter !== "all" && tpl.category !== categoryFilter) return false;
  if (q && !tpl.title.toLowerCase().includes(q) && !tpl.body.toLowerCase().includes(q)) return false;
  return true;
});
```

**Edge case — `general` templates:** Templates tagged with `"general"` (universal templates like greetings, CSAT, welcome) appear under every industry tab. The `general` key is a signal meaning "applicable to all verticals," not a separate industry silo.

**Edge case — purpose filter:** When `purposeFilter` is `MARKETING` or `UTILITY`, Quick-Reply templates are naturally excluded (they have no `metaCategory`). Correct behaviour — no special handling needed.

---

## UI Changes

### `template-library-tab.tsx`

1. Add `industryFilter` state (`"all" | Industry`), default `"all"`
2. Add `purposeFilter` state (`"all" | MetaCategory`), default `"all"`
3. **Industry tab bar** renders above the existing chip rows — horizontally scrollable, one tab per industry + "All"
4. **Purpose chips row** sits between the industry tab bar and category chips: `All purposes · 🎯 Marketing · 🔧 Utility · 🔐 Authentication`
5. Selecting an industry tab resets `purposeFilter` and `categoryFilter` to `"all"` (avoids empty-result confusion)
6. Category chips remain unchanged — they still filter within the active industry + purpose selection

### `library-template-card.tsx`

Replace the current type badge with a **merged purpose+type badge**:

| Template type | `metaCategory` | Badge label | Badge colour |
|---|---|---|---|
| `meta` | `MARKETING` | `🎯 Marketing Broadcast` | purple tint |
| `meta` | `UTILITY` | `🔧 Utility Broadcast` | blue tint |
| `meta` | `AUTHENTICATION` | `🔐 Auth Broadcast` | amber tint |
| `quick_reply` | — | `💬 Quick-Reply` | green tint (unchanged) |

Add **industry tag(s)** in the footer after the category badge. Show max 2 industry tags on the card; if the template has more, show `+N more`. Full list visible in the preview sheet.

### `library-template-preview.tsx`

No structural changes needed. Optionally show the full industry list in the preview detail view.

---

## Scope: What Is NOT Changing

- No new Convex tables or backend changes — library templates are static data in `lib/templateLibrary.ts`
- No changes to the "My Templates" tab or "Broadcast Templates" tab
- No changes to template submission flow (`meta-submit-form.tsx`)
- No new templates added in this task (industry tags are assigned to existing 66 templates)

---

## Files to Change

| File | Change |
|---|---|
| `lib/templateLibrary.ts` | Add `Industry` type, `INDUSTRY_LABELS`, `industries[]` field, tag all 66 templates |
| `components/templates/template-library-tab.tsx` | Add industry tab bar, purpose chip row, updated filter logic |
| `components/templates/library-template-card.tsx` | Merged purpose+type badge, industry tag(s) in footer |

---

## Definition of Done

- [ ] All 66 existing templates have `industries[]` assigned (no template left untagged)
- [ ] Industry tab bar renders correctly in RTL layout
- [ ] Selecting an industry tab shows only matching templates
- [ ] Purpose chips (Marketing/Utility/Auth) filter correctly; Quick-Reply templates disappear when a purpose is selected
- [ ] Category chips still work within active industry + purpose filters
- [ ] Card badges show merged type+purpose label with correct colour
- [ ] Max 2 industry tags shown on card, `+N more` if overflow
- [ ] Tested in Arabic (RTL) and English (LTR)
