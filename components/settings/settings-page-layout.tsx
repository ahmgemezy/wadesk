"use client";

import type { ReactNode } from "react";

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
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
