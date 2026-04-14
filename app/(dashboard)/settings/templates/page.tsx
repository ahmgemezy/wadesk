"use client";

import { TemplatesSettings } from "@/components/settings/templates-settings";
import { useT } from "@/lib/i18n/context";

export default function TemplatesPage() {
  const t = useT();
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t("Message Templates", "قوالب الرسائل")}</h1>
      <TemplatesSettings />
    </div>
  );
}
