# RTL (Right-to-Left) Design Specification

## Critical Rule: Use Logical CSS Properties

**DO NOT use directional properties** (`left`, `right`, `ml-`, `mr-`, `pl-`, `pr-`).  
**ALWAYS use logical properties** (`start`, `end`, `ms-`, `me-`, `ps-`, `pe-`).

### Property Mapping

| Physical | Logical | Behavior |
|----------|---------|----------|
| `left-` | `start-` | LTR: left side; RTL: right side |
| `right-` | `end-` | LTR: right side; RTL: left side |
| `ml-` | `ms-` | Margin-start (direction-aware) |
| `mr-` | `me-` | Margin-end (direction-aware) |
| `pl-` | `ps-` | Padding-start (direction-aware) |
| `pr-` | `pe-` | Padding-end (direction-aware) |
| `border-l-` | `border-s-` | Border-start (direction-aware) |
| `border-r-` | `border-e-` | Border-end (direction-aware) |

## Sidebar Selected Item Border

### ❌ WRONG (flips in RTL)
```html
<div class="border-l-4 border-[#0071E3]">Inbox</div>
<!-- In RTL: border appears on LEFT (wrong!) -->
```

### ✅ CORRECT (respects RTL)
```html
<div dir="rtl" class="border-s-4 border-[#0071E3]">البريد الوارد</div>
<!-- In RTL: border appears on RIGHT (correct!) -->
```

## Shadow Direction in RTL

Shadows are **intrinsically directional** in visual design but CSS shadows are **symmetric** (no special left/right offset).

**Good news:** Tailwind shadows like `shadow-[0_2px_8px_rgba(...)]` work identically in LTR and RTL because the offset is `0` horizontally.

**No special handling needed** for symmetric box-shadows in RTL. ✓

## Text Alignment

**Never use `text-left` / `text-right`.** Use `text-start` / `text-end`.

```html
<!-- ❌ Wrong -->
<p class="text-left">English text</p>

<!-- ✅ Correct -->
<p class="text-start">Any language text</p>
<!-- Renders left in LTR, right in RTL -->
```

## Animations in RTL

**Problem:** `translate-x` in RTL moves in opposite direction.

**Solution:** Use logical properties or conditional checks.

```html
<!-- ❌ Wrong (flips in RTL) -->
<div class="group-hover:translate-x-2">Icon</div>

<!-- ✅ Correct (respects RTL) -->
<div class="group-hover:translate-inline-1">Icon</div>
<!-- translate-inline: positive = forward in reading direction -->
```

## Icon Flipping in RTL

Some icons **should** flip in RTL (arrows, chevrons), others **should not** (logos, checkmarks).

```html
<!-- Icons that should flip: -->
<!-- ✓ chevron-left, chevron-right, arrow-left, arrow-right, etc. -->
<svg class="rtl:scale-x-[-1]"><!-- flips in RTL --></svg>

<!-- Icons that should NOT flip: -->
<!-- × checkmark, star, bell, settings, gear, etc. -->
<svg><!-- no rtl: modifier --></svg>
```

## Form Fields in RTL

**Phone numbers and email inputs** are always LTR (not affected by RTL wrapping).

```html
<div dir="rtl">
  <!-- This container is RTL (Arabic text) -->
  
  <input dir="ltr" type="tel" placeholder="+20 123 456 7890" />
  <!-- This input is explicitly LTR (phone number) -->
  <!-- Cursor moves left-to-right even though container is RTL -->
</div>
```

## Testing Checklist for RTL

- [ ] Switch app to Arabic (set `dir="rtl"` on root or use lang attribute)
- [ ] Sidebar: selected item blue border appears on **RIGHT** side (not left)
- [ ] All text alignment respects RTL (right-aligned naturally)
- [ ] Icons: chevrons point correctly in RTL context
- [ ] Animations: translate movements go forward in reading direction
- [ ] Phone input: LTR context preserved inside RTL wrapper
- [ ] No horizontal scroll appears
- [ ] All `start`/`end` properties used (no `left`/`right`)
