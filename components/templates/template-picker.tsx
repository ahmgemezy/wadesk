"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { DT } from "@/lib/design-tokens";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useT } from "@/lib/i18n/context";
import { FileTextIcon } from "lucide-react";
import { extractVariables, renderTemplate } from "@/lib/templateHelpers";

export function TemplatePicker({ onSelect }: { onSelect: (text: string) => void }) {
  const t = useT();
  const templates = useQuery(api.messageTemplates.list, {}) as
    | {
        _id: string;
        title: string;
        body: string;
        category?: string;
        language: "ar" | "en";
        variables: string[];
      }[]
    | undefined;

  const [selected, setSelected] = useState<{
    body: string;
    variables: string[];
  } | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  function handleSelect(tpl: {
    body: string;
    variables: string[];
  }) {
    if (tpl.variables.length === 0) {
      onSelect(tpl.body);
      return;
    }
    setSelected(tpl);
    setValues({});
  }

  const [applyErrors, setApplyErrors] = useState<string[]>([]);

  function handleApply() {
    if (!selected) return;
    const empty = selected.variables.filter((v) => !values[v]?.trim());
    if (empty.length > 0) {
      setApplyErrors(empty);
      return;
    }
    setApplyErrors([]);
    onSelect(renderTemplate(selected.body, values));
    setSelected(null);
    setValues({});
  }

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        title={t("Templates", "القوالب")}
      >
        <FileTextIcon className="size-4" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {selected ? (
          <div className="p-3 space-y-3">
            <p className="text-sm font-medium">
              {t("Fill in variables", "املأ المتغيرات")}
            </p>
            {selected.variables.map((variable) => (
              <div key={variable} className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {`{{${variable}}}`}
                </label>
                <input
                  value={values[variable] ?? ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setApplyErrors((prev) => prev.filter((v) => v !== variable));
                    setValues((prev) => ({ ...prev, [variable]: e.target.value }));
                  }}
                  dir="auto"
                  className={`${DT.INPUT} ${applyErrors.includes(variable) ? DT.BORDER_ERROR : ""}`}
                />
                {applyErrors.includes(variable) && (
                  <p className="text-xs text-destructive">
                    {t("Required", "مطلوب")}
                  </p>
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleApply} className="flex-1">
                {t("Apply", "تطبيق")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setSelected(null); setApplyErrors([]); }}
              >
                {t("Cancel", "إلغاء")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-2 max-h-64 overflow-y-auto">
            {!templates?.length ? (
              <p className="text-sm text-muted-foreground p-2 text-center">
                {t("No templates", "لا توجد قوالب")}
              </p>
            ) : (
              templates.map((tpl) => (
                <button
                  key={tpl._id}
                  className="w-full text-start px-3 py-2 rounded-md hover:bg-muted text-sm"
                  onClick={() => handleSelect(tpl)}
                >
                  <span className="font-medium">{tpl.title}</span>
                  <span className="text-xs text-muted-foreground ms-2 uppercase">
                    {tpl.language}
                  </span>
                  {tpl.category && (
                    <span className="text-xs text-muted-foreground ms-1">
                      · {tpl.category}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
