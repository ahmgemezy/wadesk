"use client";

import { CatalogSettings } from "@/components/settings/catalog-settings";
import { useT } from "@/lib/i18n/context";

export default function CatalogPage() {
  const t = useT();
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">
        {t("Product Catalog", "كتالوج المنتجات")}
      </h1>
      <CatalogSettings />
    </div>
  );
}
