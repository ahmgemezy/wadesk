"use client";

import { XIcon } from "lucide-react";
import { useT } from "@/lib/i18n/context";

interface ReplyContextBannerProps {
  quotedContent: string;
  quotedAuthor: string;
  onClear: () => void;
}

export function ReplyContextBanner({
  quotedContent,
  quotedAuthor,
  onClear,
}: ReplyContextBannerProps) {
  const t = useT();

  return (
    <div className="flex items-start gap-2 px-3 py-2 bg-muted border-s-4 border-primary rounded-e-lg text-sm">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-primary text-xs mb-0.5">
          {t("Replying to", "رد على")} {quotedAuthor}
        </p>
        <p className="text-muted-foreground truncate">{quotedContent}</p>
      </div>
      <button
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
        aria-label={t("Cancel reply", "إلغاء الرد")}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}
