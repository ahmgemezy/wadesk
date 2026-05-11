"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

export function ForwardTemplateCard() {
  const t = useT();
  const data = useQuery(api.lib.tenants.getForwardTemplatesPublic);
  const update = useMutation(api.lib.tenants.updateForwardTemplate);
  const [ar, setAr] = useState("");
  const [en, setEn] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setAr(data.ar);
      setEn(data.en);
    }
  }, [data]);

  const required = ["{{branchName}}", "{{branchNumber}}"];
  const missingAr = required.filter((v) => !ar.includes(v));
  const missingEn = required.filter((v) => !en.includes(v));
  const valid = missingAr.length === 0 && missingEn.length === 0;
  const dirty = !!data && (ar !== data.ar || en !== data.en);

  const save = async () => {
    setSaving(true);
    try {
      await update({ ar, en });
      toast.success(t("Saved", "تم الحفظ"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("MISSING_TEMPLATE_VARIABLES")) {
        toast.error(t("Both languages must include all variables", "يجب أن تحتوي كلتا اللغتين على المتغيرات"));
      } else {
        toast.error(t("Save failed", "فشل الحفظ"));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div>
        <h3 className={DT.H3}>
          {t("Forward message", "رسالة التحويل")}
        </h3>
        <p className={DT.MUTED}>
          {t(
            "Sent to the customer when an agent forwards their conversation to another branch.",
            "تُرسل للعميل عندما يقوم الموظف بتحويل محادثته لفرع آخر."
          )}
        </p>
      </div>

      <div className="space-y-2">
        <label className={DT.LBL}>{t("Arabic", "العربية")}</label>
        <textarea
          dir="rtl"
          rows={2}
          className={DT.TEXTAREA}
          value={ar}
          onChange={(e) => setAr(e.target.value)}
        />
        {missingAr.length > 0 && (
          <p className="text-xs text-destructive">
            {t("Missing variables: ", "متغيرات ناقصة: ")}
            {missingAr.join(" ")}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className={DT.LBL}>{t("English", "الإنجليزية")}</label>
        <textarea
          dir="ltr"
          rows={2}
          className={DT.TEXTAREA}
          value={en}
          onChange={(e) => setEn(e.target.value)}
        />
        {missingEn.length > 0 && (
          <p className="text-xs text-destructive">
            {t("Missing variables: ", "متغيرات ناقصة: ")}
            {missingEn.join(" ")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className={DT.MICRO}>
          {t("Variables:", "المتغيرات:")} <code dir="ltr">{"{{branchName}}"}</code>{" "}
          <code dir="ltr">{"{{branchNumber}}"}</code>
        </span>
        <div className="ms-auto">
          <button className={DT.BTN_PRIMARY} onClick={save} disabled={!valid || !dirty || saving}>
            {saving && <Loader2 className="size-4 animate-spin me-2" />}
            {t("Save", "حفظ")}
          </button>
        </div>
      </div>
    </div>
  );
}
