"use client";

import { DT } from "@/lib/design-tokens";

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-[300px] text-center py-12">
      <div className="flex flex-col items-center gap-3">
        <div className={`text-4xl ${DT.TEXT_GRAY}`}>{icon}</div>
        <h3 className={DT.H3}>{title}</h3>
        <p className={DT.MUTED}>{description}</p>
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className={`${DT.BG_DESTRUCTIVE} ${DT.BORDER_DESTRUCTIVE} border rounded-[12px] p-4`}>
      <div className="flex items-start gap-3">
        <span className={`${DT.TEXT_DESTRUCTIVE} text-lg`}>⚠</span>
        <p className={DT.BODY}>{message}</p>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className={`${DT.CARD_SM} p-5 animate-pulse`}>
      <div className="h-4 bg-black/[0.06] dark:bg-white/[0.06] rounded mb-3 w-2/3" />
      <div className="h-8 bg-black/[0.06] dark:bg-white/[0.06] rounded w-1/2" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className={`${DT.CARD} p-6 animate-pulse`}>
      <div className="h-5 bg-black/[0.06] dark:bg-white/[0.06] rounded mb-4 w-40" />
      <div className="h-64 bg-black/[0.06] dark:bg-white/[0.06] rounded w-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={`${DT.CARD} p-6 animate-pulse space-y-3`}>
      <div className="h-5 bg-black/[0.06] dark:bg-white/[0.06] rounded w-40" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-black/[0.06] dark:bg-white/[0.06] rounded w-full" />
      ))}
    </div>
  );
}
