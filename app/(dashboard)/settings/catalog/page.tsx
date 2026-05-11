"use client";

import { CatalogSettings } from "@/components/settings/catalog-settings";
import { useT } from "@/lib/i18n/context";

export default function CatalogPage() {
  const t = useT();
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-[28px] font-semibold tracking-[-0.5px] text-[#1D1D1F] dark:text-white">
        {t("Product Catalog", "كتالوج المنتجات")}
      </h1>
      <CatalogSettings />
    </div>
  );
}
