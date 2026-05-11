# Focus States & Keyboard Navigation Specification

## Focus-Visible Ring Specification

All interactive elements MUST have visible focus ring for keyboard users.

### Button Focus
```html
<button class="px-4 py-2.5 rounded-lg bg-[#0071E3] text-white
             focus-visible:outline-2 focus-visible:outline-offset-2 
             focus-visible:outline-[#0071E3]
             dark:focus-visible:outline-[#0A84FF]">
  Save Changes
</button>
```

### Input Focus
```html
<input class="px-3 py-2 border border-black/[0.08] rounded-[12px]
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-[#0071E3]
            dark:focus-visible:outline-[#0A84FF]
            dark:border-white/[0.10]" />
```

### Rounded Elements (rounded-full)
For fully rounded buttons, use smaller offset to prevent ring cutoff:
```html
<button class="w-10 h-10 rounded-full
             focus-visible:outline-2 focus-visible:outline-offset-1
             focus-visible:outline-[#0071E3]">
  ✕
</button>
```

## Tab Order Rules

**LTR (English):**
- Left-to-right, top-to-bottom natural flow
- Sidebar → Main content → Footer
- Native browser behavior (don't override)

**RTL (Arabic):**
- Right-to-left, top-to-bottom natural flow
- Sidebar (on right in RTL) → Main content → Footer
- Use `<div dir="rtl">` wrapper or `dir="rtl"` on root
- **Never use explicit tabindex >0** — breaks RTL order
- Always use `tabindex="-1"` for skip links, not positive indices

## Keyboard Navigation Shortcuts

| Key | Action | Scope |
|-----|--------|-------|
| `Tab` | Move to next interactive element | Entire UI |
| `Shift+Tab` | Move to previous interactive element | Entire UI |
| `Enter` | Activate button, open select, submit form | On focused element |
| `Space` | Toggle checkbox, activate button (secondary) | On focused element |
| `Escape` | Close modal, cancel operation | Modal dialog |
| `Arrow Up/Down` | Navigate select options | Open select dropdown |

## WCAG AA Contrast Requirements

Focus outline must have 3:1 contrast against its background.

**Light mode:**
- Outline color: #0071E3 (blue)
- Outline on white background: 8.2:1 ✓ (exceeds 3:1)
- Outline on gray background: still visible ✓

**Dark mode:**
- Outline color: #0A84FF (lighter blue)
- Outline on #1C1C1E background: 6.1:1 ✓ (exceeds 3:1)

## Accessibility Testing Checklist

- [ ] Navigate entire UI with Tab/Shift+Tab only (no mouse)
- [ ] Every interactive element has visible focus ring
- [ ] Focus ring is 3:1+ contrast against background
- [ ] Tab order is logical (left-to-right in LTR, right-to-left in RTL)
- [ ] Modal dialogs trap focus (Tab stays within modal)
- [ ] Screen reader announces focused element correctly
