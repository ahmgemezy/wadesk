import React from "react";
import { useT } from "@/lib/i18n/context";

function PreferencesErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useT();
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive space-y-2">
      <p>
        {t(
          "Failed to load notification preferences.",
          "تعذّر تحميل تفضيلات الإشعارات.",
        )}
      </p>
      <button className="underline" onClick={onRetry}>
        {t("Retry", "إعادة المحاولة")}
      </button>
    </div>
  );
}

export class NotificationsErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("[NotificationsErrorBoundary]", error, info);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <PreferencesErrorFallback onRetry={() => window.location.reload()} />
      );
    }
    return this.props.children;
  }
}
