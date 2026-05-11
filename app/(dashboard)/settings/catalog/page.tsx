"use client";

import { CatalogSettings } from "@/components/settings/catalog-settings";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

export default function CatalogPage() {
  const t = useT();
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className={DT.H1}>
        {t("Product Catalog", "كتالوج المنتجات")}
      </h1>
      <CatalogSettings />
    </div>
  );
}
