"use client";

import type { ReactNode } from "react";
import { DT } from "@/lib/design-tokens";

interface SettingsPageLayoutProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function SettingsPageLayout({
  title,
  description,
  children,
}: SettingsPageLayoutProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <h1 className={DT.H1}>{title}</h1>
        {description && <p className={DT.MUTED}>{description}</p>}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
