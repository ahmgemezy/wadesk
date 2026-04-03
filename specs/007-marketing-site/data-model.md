# Data Model: WaDesk Marketing Site

**Feature**: 007-marketing-site  
**Date**: 2026-04-04  
**Note**: This feature introduces NO new Convex tables. All data is static TypeScript constants.

---

## Static Entities

These entities are defined as TypeScript types + constants in `lib/marketing/pricing-data.ts`. They are not stored in a database.

---

### Plan

A pricing tier displayed on the homepage pricing section.

```typescript
type Currency = "EGP" | "SAR" | "AED" | "USD";

type PlanPrice = Record<Currency, string>;  // e.g. { EGP: "199", SAR: "49", AED: "49", USD: "15" }

type Plan = {
  id: "free" | "starter" | "growth" | "business";
  nameAr: string;        // Arabic plan name
  nameEn: string;        // English plan name
  price: PlanPrice;      // null means Free (display "مجاني")
  isFree: boolean;       // true for Free plan — shows "No credit card required"
  agentLimit: number | null;    // null = unlimited
  channelLimit: number | null;  // null = unlimited
  conversationLimit: number | null; // null = unlimited
  features: string[];    // Arabic feature strings
  ctaLabel: string;      // Arabic CTA text
  highlighted: boolean;  // true for Growth (sweet spot)
};
```

**Instances**: Free, Starter, Growth (highlighted), Business  
**Validation**: Each plan must have prices in all 4 currencies. Free plan must have `isFree: true`.

---

### FeatureHighlight

A product capability shown in the features section.

```typescript
type FeatureHighlight = {
  id: string;
  icon: string;          // Lucide icon name
  titleAr: string;       // Arabic title
  titleEn: string;       // English title
  descriptionAr: string; // Arabic description (1–2 sentences)
  descriptionEn: string; // English description (1–2 sentences)
};
```

**Instances**: Multi-agent inbox, Real-time assignment, Internal notes, Quick replies  
**Validation**: Minimum 4 highlights required (FR-002).

---

### Differentiator

A competitive advantage claim shown in the "Why WaDesk" section.

```typescript
type Differentiator = {
  id: string;
  titleAr: string;
  titleEn: string;
  statementAr: string; // Supporting claim in Arabic
  statementEn: string; // Supporting claim in English
  icon: string;        // Lucide icon name
};
```

**Instances**: Zero markup on Meta messages, Arabic-first UX, Local currency billing  
**Validation**: Must include zero markup, Arabic-first, and local currency claims (FR-005).

---

## File Location

```
lib/
└── marketing/
    └── pricing-data.ts   # Plan[], FeatureHighlight[], Differentiator[] constants
```
