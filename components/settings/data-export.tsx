"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Loader2Icon, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { useT, useLocale } from "@/lib/i18n/context";

type ExportKind = "contacts" | "conversations";
type ConversationFormat = "json" | "csv" | "html";

export function DataExport() {
  const t = useT();
  const locale = useLocale();
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [downloadUrls, setDownloadUrls] = useState<Record<ExportKind, string | null>>({
    contacts: null,
    conversations: null,
  });
  const [convFormat, setConvFormat] = useState<ConversationFormat>("json");

  const generateContacts = useAction(api.export.generateContactsExport);
  const generateConversations = useAction(api.export.generateConversationsExport);

  async function handleExport(kind: ExportKind) {
    setExporting(kind);
    setDownloadUrls((prev) => ({ ...prev, [kind]: null }));
    try {
      const url =
        kind === "contacts"
          ? await generateContacts({})
          : await generateConversations({ format: convFormat, locale });
      if (url) {
        setDownloadUrls((prev) => ({ ...prev, [kind]: url }));
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

  const formatOptions: { value: ConversationFormat; label: string; desc: string }[] = [
    { value: "json", label: "JSON", desc: t("For developers & import tools", "للمطورين وأدوات الاستيراد") },
    { value: "csv", label: "CSV", desc: t("For Excel & Google Sheets", "لإكسل وجوجل شيتس") },
    { value: "html", label: "HTML", desc: t("Browse in browser", "عرض في المتصفح") },
  ];

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

        {downloadUrls.contacts && !exporting && (
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 border p-3">
            <DownloadIcon className="size-4 text-green-600" />
            <span className="text-sm font-medium">
              {t("Download ready", "التحميل جاهز")}
            </span>
            <a
              href={downloadUrls.contacts}
              download
              className="text-sm text-primary underline underline-offset-4 ms-auto"
            >
              {t("Download file", "تحميل الملف")}
            </a>
          </div>
        )}

        <div className="border-t pt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">
                {t("Export Conversations", "تصدير المحادثات")}
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

          <div className="flex gap-2 mt-3">
            {formatOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setConvFormat(opt.value)}
                className={`flex-1 rounded-lg border px-3 py-2 text-center transition-colors ${
                  convFormat === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <span className="block text-sm font-semibold">{opt.label}</span>
                <span className="block text-xs mt-0.5">{opt.desc}</span>
              </button>
            ))}
          </div>

          {downloadUrls.conversations && !exporting && (
            <div className="flex items-center gap-2 rounded-lg bg-muted/50 border p-3 mt-3">
              <DownloadIcon className="size-4 text-green-600" />
              <span className="text-sm font-medium">
                {t("Download ready", "التحميل جاهز")}
              </span>
              <a
                href={downloadUrls.conversations}
                download
                className="text-sm text-primary underline underline-offset-4 ms-auto"
              >
                {t("Download file", "تحميل الملف")}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
