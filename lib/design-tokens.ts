// lib/design-tokens.ts
export const DT = {
  // ── Inputs ──────────────────────────────────────────────────────────────
  INPUT: [
    "w-full rounded-xl border border-black/[0.12] bg-black/[0.04]",
    "px-3.5 py-2 text-[14px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all",
    "placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40 dark:focus:border-[#0A84FF]",
  ].join(" "),

  INPUT_SM: [
    "w-full rounded-lg border border-black/[0.12] bg-black/[0.04]",
    "px-2.5 py-1.5 text-[13px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] focus:ring-1 focus:ring-[#0071E3]/20 transition-all",
    "placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40",
  ].join(" "),

  INPUT_XS: [
    "w-full rounded-md border border-black/[0.12] bg-black/[0.04]",
    "px-2 py-1 text-[12px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] transition-all",
    "placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40",
  ].join(" "),

  // ── Buttons ─────────────────────────────────────────────────────────────
  BTN_PRIMARY: [
    "inline-flex items-center justify-center",
    "rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1]",
    "text-white font-normal px-5 py-2 text-[14px]",
    "transition-colors disabled:opacity-50 gap-1.5 shrink-0",
    "dark:bg-[#0A84FF] dark:hover:bg-[#1A91FF] dark:active:bg-[#0070D8]",
  ].join(" "),

  BTN_OUTLINE: [
    "inline-flex items-center justify-center",
    "rounded-full border border-black/[0.12] bg-transparent",
    "hover:bg-black/[0.04] active:bg-black/[0.06]",
    "text-[#1D1D1F] font-normal px-5 py-2 text-[14px]",
    "transition-colors disabled:opacity-50 gap-1.5 shrink-0",
    "dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.06]",
  ].join(" "),

  BTN_SM: [
    "inline-flex items-center justify-center",
    "rounded-full border border-black/[0.12] bg-transparent",
    "hover:bg-black/[0.04] active:bg-black/[0.06]",
    "text-[#1D1D1F] font-normal px-3 py-1.5 text-[13px]",
    "transition-colors disabled:opacity-50 gap-1 shrink-0",
    "dark:border-white/[0.12] dark:text-white dark:hover:bg-white/[0.06]",
  ].join(" "),

  BTN_SM_PRIMARY: [
    "inline-flex items-center justify-center",
    "rounded-full bg-[#0071E3] hover:bg-[#0077ED]",
    "text-white font-normal px-3 py-1.5 text-[13px]",
    "transition-colors disabled:opacity-50 gap-1 shrink-0",
    "dark:bg-[#0A84FF] dark:hover:bg-[#1A91FF]",
  ].join(" "),

  BTN_ICON: [
    "inline-flex items-center justify-center",
    "size-8 rounded-xl",
    "text-[#6E6E73] hover:bg-black/[0.06] hover:text-[#1D1D1F]",
    "transition-colors",
    "dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white",
  ].join(" "),

  BTN_ICON_SM: [
    "inline-flex items-center justify-center",
    "size-6 rounded-lg",
    "text-[#6E6E73] hover:bg-black/[0.06] hover:text-[#1D1D1F]",
    "transition-colors",
    "dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white",
  ].join(" "),

  BTN_DESTRUCTIVE: [
    "inline-flex items-center justify-center",
    "rounded-full bg-[#FF3B30] hover:bg-[#FF453A] active:bg-[#D70015]",
    "text-white font-normal px-5 py-2 text-[14px]",
    "transition-colors disabled:opacity-50 gap-1.5 shrink-0",
    "dark:bg-[#FF453A] dark:hover:bg-[#FF6961]",
  ].join(" "),

  // ── Cards ────────────────────────────────────────────────────────────────
  CARD: [
    "rounded-[22px] bg-white border border-black/[0.08]",
    "shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)]",
    "dark:bg-[#1C1C1E] dark:border-white/[0.08]",
  ].join(" "),

  CARD_SM: [
    "rounded-2xl bg-white border border-black/[0.08]",
    "shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]",
    "dark:bg-[#2C2C2E] dark:border-white/[0.06]",
  ].join(" "),

  CARD_FLAT: [
    "rounded-2xl bg-black/[0.03]",
    "border border-black/[0.06]",
    "dark:bg-white/[0.04] dark:border-white/[0.06]",
  ].join(" "),

  // ── Dialogs / Sheets ─────────────────────────────────────────────────────
  DIALOG: [
    "rounded-[28px] border-0",
    "bg-white/95 backdrop-blur-2xl",
    "shadow-[0_25px_80px_rgba(0,0,0,0.18)]",
    "dark:bg-[#1C1C1E]/95",
  ].join(" "),

  SHEET: [
    "border-0",
    "bg-white/95 backdrop-blur-2xl",
    "shadow-[-20px_0_60px_rgba(0,0,0,0.12)]",
    "dark:bg-[#1C1C1E]/95",
  ].join(" "),

  DIALOG_FOOTER: [
    "border-t border-black/[0.06] px-6 py-4",
    "flex items-center justify-end gap-2",
    "bg-white/80 backdrop-blur-sm",
    "dark:bg-[#1C1C1E]/80 dark:border-white/[0.06]",
  ].join(" "),

  // ── Typography ───────────────────────────────────────────────────────────
  H1:   "text-[28px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white",
  H2:   "text-[22px] font-semibold tracking-[-0.3px] text-[#1D1D1F] dark:text-white",
  H3:   "text-[17px] font-semibold tracking-[-0.2px] text-[#1D1D1F] dark:text-white",
  BODY: "text-[14px] text-[#1D1D1F] dark:text-white",
  BODY_HOVER: "hover:text-[#1D1D1F] dark:hover:text-white",
  MUTED: "text-[13px] text-[#6E6E73] dark:text-white/50",
  MUTED_HOVER: "hover:text-[#1D1D1F] dark:hover:text-white",
  MICRO: "text-[11px] text-[#6E6E73] dark:text-white/40",
  LBL:  "block text-[13px] font-medium text-[#1D1D1F] mb-1 dark:text-white/90",
  SEC:  "text-[11px] font-semibold text-[#6E6E73] uppercase tracking-[0.06em] dark:text-white/40",

  // ── Dividers ─────────────────────────────────────────────────────────────
  DIVIDER:   "border-t border-black/[0.08] dark:border-white/[0.06]",
  DIVIDER_V: "border-s border-black/[0.08] dark:border-white/[0.06]",

  // ── Badges ───────────────────────────────────────────────────────────────
  BADGE_BLUE:    "inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950 px-2.5 py-0.5 text-[12px] font-medium text-blue-700 dark:text-blue-300",
  BADGE_GREEN:   "inline-flex items-center rounded-full bg-green-50 dark:bg-green-950 px-2.5 py-0.5 text-[12px] font-medium text-green-700 dark:text-green-300",
  BADGE_AMBER:   "inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950 px-2.5 py-0.5 text-[12px] font-medium text-amber-700 dark:text-amber-300",
  BADGE_RED:     "inline-flex items-center rounded-full bg-red-50 dark:bg-red-950 px-2.5 py-0.5 text-[12px] font-medium text-red-700 dark:text-red-300",
  BADGE_PURPLE:  "inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-950 px-2.5 py-0.5 text-[12px] font-medium text-purple-700 dark:text-purple-300",
  BADGE_NEUTRAL: "inline-flex items-center rounded-full bg-black/[0.06] dark:bg-white/[0.10] px-2.5 py-0.5 text-[12px] font-medium text-[#1D1D1F] dark:text-white",

  // ── List items ────────────────────────────────────────────────────────────
  LIST_ITEM:        "flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer",
  LIST_ITEM_ACTIVE: "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0071E3]/10 text-[#0071E3] dark:bg-[#0A84FF]/15 dark:text-[#0A84FF]",
  LIST_ITEM_SM:     "flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.05] transition-colors cursor-pointer",

  // ── Select ───────────────────────────────────────────────────────────────
  SELECT: [
    "w-full h-10 rounded-xl border border-black/[0.12] bg-black/[0.04]",
    "px-3.5 text-[14px] text-[#1D1D1F]",
    "focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
  ].join(" "),

  // ── Textarea ─────────────────────────────────────────────────────────────
  TEXTAREA: [
    "w-full rounded-xl border border-black/[0.12] bg-black/[0.04]",
    "px-3.5 py-2.5 text-[14px] text-[#1D1D1F] outline-none",
    "focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all",
    "resize-none placeholder:text-[#6E6E73]",
    "dark:bg-white/[0.06] dark:border-white/[0.10] dark:text-white",
    "dark:placeholder:text-white/40",
  ].join(" "),

  // ── Sidebar ──────────────────────────────────────────────────────────────
  SIDEBAR_BG:          "bg-[#F5F5F7] dark:bg-[#111111]",
  SIDEBAR_ITEM:        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-medium text-[#1D1D1F] hover:bg-black/[0.06] dark:text-white/80 dark:hover:bg-white/[0.07] transition-colors",
  SIDEBAR_ITEM_ACTIVE: "flex items-center gap-2.5 px-3 py-2 rounded-xl text-[14px] font-medium bg-white shadow-sm text-[#0071E3] dark:bg-white/[0.10] dark:text-[#0A84FF]",

  // ── Status dots ───────────────────────────────────────────────────────────
  DOT_GREEN: "size-2 rounded-full bg-[#34C759] dark:bg-[#30D158]",
  DOT_GRAY:  "size-2 rounded-full bg-[#8E8E93] dark:bg-[#636366]",
  DOT_AMBER: "size-2 rounded-full bg-[#FF9500] dark:bg-[#FF9F0A]",
  DOT_RED:   "size-2 rounded-full bg-[#FF3B30] dark:bg-[#FF453A]",

  // ── Semantic colors ───────────────────────────────────────────────────────
  TEXT_BLUE:    "text-[#0071E3] dark:text-[#0A84FF]",
  BORDER_BLUE:  "border-[#0071E3] dark:border-[#0A84FF]",
  BG_BLUE:      "bg-[#0071E3] dark:bg-[#0A84FF]",
  BG_BLUE_LIGHT: "bg-[#0071E3]/5 dark:bg-[#0A84FF]/5",
  BG_BLUE_HOVER: "hover:bg-[#0071E3]/10 dark:hover:bg-[#0A84FF]/10",
  BORDER_BLUE_HOVER: "hover:border-[#0071E3]/50 dark:hover:border-[#0A84FF]/50",
  BG_RED:       "bg-[#FF3B30] dark:bg-[#FF453A]",
  BORDER_RED:   "border-[#FF3B30] dark:border-[#FF453A]",
  BG_RED_HOVER: "hover:bg-[#FF3B30]/10 dark:hover:bg-[#FF453A]/10",
  TEXT_RED:     "text-[#FF3B30] dark:text-[#FF453A]",
  TEXT_GRAY:    "text-[#6E6E73] dark:text-white/50",

  // ── Info box ──────────────────────────────────────────────────────────────
  INFO_BOX: "rounded-xl bg-black/[0.03] dark:bg-white/[0.04] px-3.5 py-2.5 text-[12px] text-[#6E6E73] dark:text-white/50",

  // ── Form inputs ───────────────────────────────────────────────────────────
  CHECKBOX_ACCENT: "accent-[#0071E3] dark:accent-[#0A84FF]",
} as const;

export type DTKey = keyof typeof DT;
