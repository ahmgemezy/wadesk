"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { DT } from "@/lib/design-tokens";
import { PencilIcon, PlusIcon, Trash2Icon, XIcon, CalendarClockIcon, StickyNoteIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT, useLocale } from "@/lib/i18n/context";
import { FollowUpModal } from "./follow-up-modal";
import { motion } from "framer-motion";

type Stage = "lead" | "prospect" | "customer" | "retained" | "churned";

const STAGES: { value: Stage; en: string; ar: string; color: string }[] = [
  { value: "lead",     en: "Lead",     ar: "عميل محتمل", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  { value: "prospect", en: "Prospect", ar: "مرشح",       color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  { value: "customer", en: "Customer", ar: "عميل",       color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  { value: "retained", en: "Retained", ar: "عميل دائم", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  { value: "churned",  en: "Churned",  ar: "مفقود",      color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
];

interface ContactPanelProps {
  contactId: Id<"contacts">;
  channelId?: Id<"channels">;
  conversationId?: Id<"conversations">;
}

export function ContactPanel({ contactId, channelId, conversationId }: ContactPanelProps) {
  const t = useT();
  const locale = useLocale();
  const isRtl = locale === "ar";

  const data = useQuery(api.contacts.getById, { contactId });
  const customFields = useQuery(api.customFields.list, { contactId });
  const followUps = useQuery(api.followUps.listByContact, { contactId });
  const internalNotes = useQuery(api.inbox.getInternalNotesByContact, { contactId });
  const csatSummary = useQuery(api.csat.getContactCsat, { contactId });

  const updateContact = useMutation(api.contacts.update);
  const updateStage = useMutation(api.contacts.updateStage);
  const upsertField = useMutation(api.customFields.upsert);
  const deleteField = useMutation(api.customFields.delete_);
  const cancelFollowUp = useMutation(api.followUps.cancel);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  const [newFieldKey, setNewFieldKey] = useState("");
  const [newFieldValue, setNewFieldValue] = useState("");
  const [showNewField, setShowNewField] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  if (data === undefined || customFields === undefined) {
    return (
      <motion.div
        dir={isRtl ? "rtl" : "ltr"}
        className="p-4 space-y-6"
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
      >
        <motion.div variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="space-y-2">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </motion.div>
        
        <motion.div variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </motion.div>
        
        <motion.div variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-20 w-full rounded-md" />
        </motion.div>
        
        <motion.div variants={{ hidden: { opacity: 0, x: -10 }, show: { opacity: 1, x: 0 } }} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-full rounded-md" />
        </motion.div>
      </motion.div>
    );
  }

  if (data === null) {
    return (
      <div dir={isRtl ? "rtl" : "ltr"} className="p-4 text-center text-muted-foreground">
        {t("Contact not found", "لم يتم العثور على جهة الاتصال")}
      </div>
    );
  }

  const { contact, conversationCount } = data;
  const displayName = contact.customName ?? contact.displayName;

  function startEditing() {
    setName(contact.customName ?? "");
    setTags(contact.tags.join("، "));
    setNotes(contact.notes ?? "");
    setEditing(true);
  }

  async function saveEdits() {
    const patch: Record<string, unknown> = {};
    const newName = name.trim() || undefined;
    if (newName !== contact.customName) patch.customName = newName;
    const newTags = tags
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (JSON.stringify(newTags) !== JSON.stringify(contact.tags)) patch.tags = newTags;
    if (notes !== (contact.notes ?? "")) patch.notes = notes || undefined;

    if (Object.keys(patch).length > 0) {
      await updateContact({ contactId, ...patch } as Parameters<typeof updateContact>[0]);
    }
    setEditing(false);
  }

  async function handleAddField() {
    const key = newFieldKey.trim();
    const value = newFieldValue.trim();
    if (!key) return;
    await upsertField({ contactId, key, value });
    setNewFieldKey("");
    setNewFieldValue("");
    setShowNewField(false);
  }

  async function handleDeleteField(fieldId: Id<"customFields">) {
    await deleteField({ customFieldId: fieldId });
  }

  const pendingFollowUps = followUps?.filter((f) => f.status === "pending") ?? [];
  const doneFollowUps = followUps?.filter((f) => f.status !== "pending") ?? [];

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <>
      {channelId && (
        <FollowUpModal
          open={showFollowUpModal}
          onClose={() => setShowFollowUpModal(false)}
          contactId={contactId}
          channelId={channelId}
          locale={locale}
        />
      )}

      <div dir={isRtl ? "rtl" : "ltr"} className="h-full overflow-y-auto">
        <motion.div 
          className="p-4 space-y-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >

          {/* ── Name + edit ── */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("Name", "الاسم")}
                  className={`${DT.INPUT} text-lg font-medium`}
                />
              ) : (
                <h3 className="text-lg font-medium truncate">{displayName}</h3>
              )}
            </div>
            <button
              className={DT.BTN_ICON_SM}
              onClick={editing ? saveEdits : startEditing}
              aria-label={editing ? t("Save", "حفظ") : t("Edit", "تعديل")}
            >
              {editing ? (
                <span className="text-xs">{t("Save", "حفظ")}</span>
              ) : (
                <PencilIcon className="size-4" />
              )}
            </button>
            {editing && (
              <button className={DT.BTN_ICON_SM} onClick={() => setEditing(false)}>
                <XIcon className="size-4" />
              </button>
            )}
          </div>

          {/* ── Phone ── */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("Phone Number", "رقم الهاتف")}</p>
            <p className="text-sm font-mono" dir="ltr">{contact.phone}</p>
          </div>

          {/* ── Conversations ── */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t("Conversations", "المحادثات")}</p>
            <p className="text-sm">{conversationCount}</p>
          </div>

          {/* ── CSAT ── */}
          {csatSummary && csatSummary.count > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("Satisfaction", "الرضا")}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-semibold text-amber-700 dark:text-amber-400">
                  ⭐ {csatSummary.average}/5
                </span>
                <span className="text-xs text-muted-foreground">
                  {t(
                    `${csatSummary.count} ${csatSummary.count === 1 ? "rating" : "ratings"}`,
                    `${csatSummary.count} ${csatSummary.count === 1 ? "تقييم" : "تقييمات"}`,
                  )}
                </span>
                {csatSummary.lastScore !== null && csatSummary.lastScore !== csatSummary.average && (
                  <span className="text-xs text-muted-foreground">
                    {t(`Last: ${csatSummary.lastScore}/5`, `الأخير: ${csatSummary.lastScore}/5`)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── Customer Journey ── */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("Customer Journey", "رحلة العميل")}</p>
            <div className="flex flex-wrap gap-1">
              {STAGES.map((s) => {
                const isActive = (contact.stage ?? "lead") === s.value;
                return (
                  <button
                    key={s.value}
                    onClick={() => updateStage({ contactId, stage: s.value }).catch(() => {})}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium transition-all",
                      isActive ? s.color : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {locale === "ar" ? s.ar : s.en}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Tags ── */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("Tags", "الوسوم")}</p>
            {editing ? (
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("Comma separated tags", "وسوم مفصولة بفواصل")}
                className={DT.INPUT}
              />
            ) : (
              <div className="flex flex-wrap gap-1">
                {contact.tags.length > 0 ? (
                  contact.tags.map((tag) => (
                    <span key={tag} className={DT.BADGE_NEUTRAL}>{tag}</span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">{t("No tags", "بدون وسوم")}</span>
                )}
              </div>
            )}
          </div>

          {/* ── Contact Notes ── */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{t("Notes", "ملاحظات")}</p>
            {editing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t("Add notes...", "أضف ملاحظات...")}
                rows={3}
                className={DT.TEXTAREA}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {contact.notes || <span className="text-muted-foreground text-xs">{t("No notes", "بدون ملاحظات")}</span>}
              </p>
            )}
          </div>

          {/* ── Internal Notes (from conversations) ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <StickyNoteIcon className="size-3 text-amber-500" />
              <p className="text-xs text-muted-foreground">{t("Internal Notes", "ملاحظات داخلية")}</p>
            </div>
            {internalNotes === undefined ? (
              <Skeleton className="h-8 w-full" />
            ) : internalNotes.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t("No internal notes", "لا توجد ملاحظات داخلية")}</span>
            ) : (
              <div className="space-y-2">
                {internalNotes.map((note) => (
                  <div
                    key={note._id}
                    className="rounded-lg bg-amber-50/80 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/40 p-2.5 text-xs shadow-sm"
                  >
                    <p className="whitespace-pre-wrap text-foreground">{note.content}</p>
                    <p className="text-muted-foreground mt-1">{formatDate(note.timestamp)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Follow-ups ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CalendarClockIcon className="size-3 text-blue-500" />
                <p className="text-xs text-muted-foreground">{t("Follow-ups", "المتابعات")}</p>
              </div>
              {channelId && (
                <button
                  className={DT.BTN_ICON_SM}
                  onClick={() => setShowFollowUpModal(true)}
                  aria-label={t("Add follow-up", "إضافة متابعة")}
                >
                  <PlusIcon className="size-4" />
                </button>
              )}
            </div>

            {followUps === undefined ? (
              <Skeleton className="h-8 w-full" />
            ) : pendingFollowUps.length === 0 && doneFollowUps.length === 0 ? (
              <span className="text-xs text-muted-foreground">{t("No follow-ups", "لا توجد متابعات")}</span>
            ) : (
              <div className="space-y-2">
                {pendingFollowUps.map((fu) => (
                  <div
                    key={fu._id}
                    className="rounded-lg border border-primary/20 dark:border-primary/30 bg-primary/5 dark:bg-primary/10 p-2.5 text-xs space-y-1 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-medium text-blue-700 dark:text-blue-300">
                        {formatDate(fu.scheduledAt)}
                      </p>
                      <button
                        onClick={() => cancelFollowUp({ followUpId: fu._id }).catch(() => {})}
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        aria-label={t("Cancel", "إلغاء")}
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                    {fu.note && <p className="text-muted-foreground">{fu.note}</p>}
                    {fu.expectedRevenue && (
                      <p className="text-green-600 dark:text-green-400">
                        {fu.expectedRevenue} {fu.currency}
                      </p>
                    )}
                  </div>
                ))}
                {doneFollowUps.slice(0, 3).map((fu) => (
                  <div
                    key={fu._id}
                    className="rounded-md border border-border bg-muted/40 p-2 text-xs space-y-1 opacity-60"
                  >
                    <p className="font-medium line-through">{formatDate(fu.scheduledAt)}</p>
                    <span className={DT.BADGE_NEUTRAL}>{fu.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Custom Fields ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{t("Custom Fields", "حقول مخصصة")}</p>
              {!editing && (
                <button
                  className={DT.BTN_ICON_SM}
                  onClick={() => setShowNewField(true)}
                  aria-label={t("Add field", "إضافة حقل")}
                >
                  <PlusIcon className="size-4" />
                </button>
              )}
            </div>

            {customFields.map((field) => (
              <div key={field._id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground min-w-20">{field.key}</span>
                <span className="flex-1">{field.value}</span>
                <button
                  className={DT.BTN_ICON_SM}
                  onClick={() => handleDeleteField(field._id)}
                  aria-label={`${t("Delete", "حذف")} ${field.key}`}
                >
                  <Trash2Icon className="size-3" />
                </button>
              </div>
            ))}

            {showNewField && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newFieldKey}
                  onChange={(e) => setNewFieldKey(e.target.value)}
                  placeholder={t("Key", "المفتاح")}
                  className={`${DT.INPUT} w-24`}
                />
                <input
                  type="text"
                  value={newFieldValue}
                  onChange={(e) => setNewFieldValue(e.target.value)}
                  placeholder={t("Value", "القيمة")}
                  className={`${DT.INPUT} flex-1`}
                />
                <button className={DT.BTN_ICON_SM} onClick={handleAddField}>
                  <PlusIcon className="size-4" />
                </button>
                <button
                  className={DT.BTN_ICON_SM}
                  onClick={() => { setShowNewField(false); setNewFieldKey(""); setNewFieldValue(""); }}
                >
                  <XIcon className="size-4" />
                </button>
              </div>
            )}

            {!showNewField && customFields.length === 0 && (
              <span className="text-xs text-muted-foreground">{t("No custom fields", "لا توجد حقول مخصصة")}</span>
            )}
          </div>

        </motion.div>
      </div>
    </>
  );
}
