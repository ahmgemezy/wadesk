// components/contacts/contact-stage-config.ts

export type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

export const STAGE_CONFIG: Record<Stage, { en: string; ar: string; color: string }> = {
  lead:     { en: "Lead",     ar: "عميل محتمل", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  prospect: { en: "Prospect", ar: "مرشح",       color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  customer: { en: "Customer", ar: "عميل",        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  retained: { en: "Retained", ar: "عميل دائم",  color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
  churned:  { en: "Churned",  ar: "مفقود",       color: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300" },
};

export const STAGE_TABS: (Stage | "all")[] = ["all", "lead", "prospect", "customer", "retained", "churned"];
