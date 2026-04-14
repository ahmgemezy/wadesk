"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2Icon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

type ExportKind = "contacts" | "conversations";

export function DataExport() {
  const t = useT();
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const generateContacts = useAction(api.export.generateContactsExport);
  const generateConversations = useAction(api.export.generateConversationsExport);

  async function handleExport(kind: ExportKind) {
    setExporting(kind);
    setDownloadUrl(null);
    try {
      const url =
        kind === "contacts"
          ? await generateContacts({})
          : await generateConversations({});
      if (url) {
        setDownloadUrl(url);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("FORBIDDEN")) {
        toast.error(t("You don't have permission to export data.", "ليس لديك صلاحية تصدير البيانات."));
      } else {
        toast.error(t("Export failed. Please try again.", "فشل التصدير. يرجى المحاولة مرة أخرى."));
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">
          {t("Data & Privacy", "البيانات والخصوصية")}
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          {t(
            "Export your contacts and conversations. Available on all plans.",
            "صدّر جهات الاتصال والمحادثات. متاح لجميع الخطط.",
          )}
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {t("Export Contacts (CSV)", "تصدير جهات الاتصال (CSV)")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Download all contacts with custom fields.",
                "تحميل جميع جهات الاتصال مع الحقول المخصصة.",
              )}
            </p>
          </div>
          {exporting === "contacts" ? (
            <Button disabled size="sm">
              <Loader2Icon className="size-4 animate-spin mr-2" />
              {t("Preparing your export...", "جاري تجهيز التصدير...")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("contacts")}
            >
              <DownloadIcon className="size-4 mr-2" />
              {t("Export", "تصدير")}
            </Button>
          )}
        </div>

        <div className="border-t pt-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {t("Export Conversations (JSON)", "تصدير المحادثات (JSON)")}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                "Download all conversations with messages.",
                "تحميل جميع المحادثات مع الرسائل.",
              )}
            </p>
          </div>
          {exporting === "conversations" ? (
            <Button disabled size="sm">
              <Loader2Icon className="size-4 animate-spin mr-2" />
              {t("Preparing your export...", "جاري تجهيز التصدير...")}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExport("conversations")}
            >
              <DownloadIcon className="size-4 mr-2" />
              {t("Export", "تصدير")}
            </Button>
          )}
        </div>
      </div>

      {downloadUrl && !exporting && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 border p-4">
          <DownloadIcon className="size-4 text-green-600" />
          <span className="text-sm font-medium">
            {t("Download ready", "التحميل جاهز")}
          </span>
          <a
            href={downloadUrl}
            download
            className="text-sm text-primary underline underline-offset-4 ms-auto"
          >
            {t("Download file", "تحميل الملف")}
          </a>
        </div>
      )}
    </div>
  );
}
