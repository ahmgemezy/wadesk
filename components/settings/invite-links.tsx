"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";
import { Link2, Copy, RefreshCw, Trash2, Plus } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LinkRole = "org:agent" | "org:supervisor";

interface InviteLink {
  _id: Id<"inviteLinks">;
  token: string;
  label: string | null;
  defaultRole: LinkRole;
  expiresAt: number;
  createdBy: string;
  createdAt: number;
  url: string;
  isExpired: boolean;
  neverExpires: boolean;
}

// ─── Confirmation Dialog ──────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  loading?: boolean;
}

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t("Please wait…", "يرجى الانتظار…") : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create Link Dialog ───────────────────────────────────────────────────────

interface CreateLinkDialogProps {
  open: boolean;
  onClose: () => void;
  isSupervisor: boolean;
}

function CreateLinkDialog({ open, onClose, isSupervisor }: CreateLinkDialogProps) {
  const t = useT();
  const create = useMutation(api.inviteLinks.create);

  const [label, setLabel] = useState("");
  const [role, setRole] = useState<LinkRole>("org:agent");
  const [expiresInDays, setExpiresInDays] = useState<string | null>("7");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setLabel("");
    setRole("org:agent");
    setExpiresInDays("7");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!label.trim()) {
      setError(t("Label is required", "الاسم مطلوب"));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const days = expiresInDays === "never" || expiresInDays === null ? undefined : Number(expiresInDays);
      const result = await create({ label: label.trim(), role, expiresInDays: days });
      await navigator.clipboard.writeText(result.url);
      toast.success(t("Link created and copied!", "تم إنشاء الرابط ونسخه!"));
      handleClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("FORBIDDEN")) {
        setError(t("You are not allowed to create supervisor links", "غير مسموح لك بإنشاء روابط للمشرفين"));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Create New Link", "إنشاء رابط جديد")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Label */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("Label", "الاسم")}
            </label>
            <Input
              placeholder={t("e.g. Agent Link", "مثال: رابط الوكلاء")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("Role", "الدور")}
            </label>
            <TooltipProvider>
              <Select
                value={role}
                onValueChange={(v: string | null) => v && setRole(v as LinkRole)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org:agent">
                    {t("Agent (وكيل)", "وكيل (Agent)")}
                  </SelectItem>
                  {isSupervisor ? (
                    <Tooltip>
                      <TooltipTrigger>
                        <SelectItem value="org:supervisor" disabled>
                          {t("Supervisor (مشرف)", "مشرف (Supervisor)")}
                        </SelectItem>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t(
                          "Supervisors can only create agent links",
                          "المشرف يمكنه إنشاء روابط وكلاء فقط"
                        )}
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <SelectItem value="org:supervisor">
                      {t("Supervisor (مشرف)", "مشرف (Supervisor)")}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </TooltipProvider>
          </div>

          {/* Expiry */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t("Expiry", "مدة الصلاحية")}
            </label>
            <Select value={expiresInDays} onValueChange={(v: string | null) => setExpiresInDays(v ?? "never")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">{t("Never expires", "لا ينتهي")}</SelectItem>
                <SelectItem value="7">{t("7 days", "٧ أيام")}</SelectItem>
                <SelectItem value="30">{t("30 days", "٣٠ يوماً")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              {t("Cancel", "إلغاء")}
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !label.trim()}>
              {loading
                ? t("Creating…", "جارٍ الإنشاء…")
                : t("Create & Copy", "إنشاء ونسخ")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Link Card ────────────────────────────────────────────────────────────────

interface LinkCardProps {
  link: InviteLink;
  isAdminOrSupervisor: boolean;
}

function LinkCard({ link, isAdminOrSupervisor }: LinkCardProps) {
  const t = useT();
  const revoke = useMutation(api.inviteLinks.revoke);
  const regenerate = useMutation(api.inviteLinks.regenerate);

  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [loading, setLoading] = useState(false);

  const displayName =
    link.label ||
    (link.defaultRole === "org:agent"
      ? t("Agent Link", "رابط الوكلاء")
      : t("Supervisor Link", "رابط المشرفين"));

  const roleBadgeLabel =
    link.defaultRole === "org:agent"
      ? t("Agent", "وكيل")
      : t("Supervisor", "مشرف");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link.url);
    toast.success(t("Copied!", "تم النسخ!"));
  };

  const handleRevoke = async () => {
    setLoading(true);
    try {
      await revoke({ linkId: link._id });
      toast.success(t("Link revoked", "تم إلغاء الرابط"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error", "خطأ"));
    } finally {
      setLoading(false);
      setConfirmRevoke(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const result = await regenerate({ linkId: link._id });
      await navigator.clipboard.writeText(result.url);
      toast.success(t("Link regenerated and copied!", "تم تجديد الرابط ونسخه!"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("Error", "خطأ"));
    } finally {
      setLoading(false);
      setConfirmRegenerate(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link2 className="size-4 text-muted-foreground shrink-0" />
          <span className="font-medium text-sm truncate">{displayName}</span>
        </div>
        <Badge variant="secondary" className="shrink-0 text-xs">
          {roleBadgeLabel}
        </Badge>
      </div>

      {/* URL */}
      <div
        className="text-xs font-mono text-muted-foreground bg-muted rounded px-2 py-1.5 truncate"
        dir="ltr"
      >
        {link.url}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        {link.isExpired ? (
          <Badge variant="destructive" className="text-xs">
            {t("Expired", "منتهي الصلاحية")}
          </Badge>
        ) : link.neverExpires ? (
          <span>{t("Never expires", "لا ينتهي")}</span>
        ) : (
          <span>
            {t("Expires:", "ينتهي في:")}{" "}
            {new Date(link.expiresAt).toLocaleDateString(t("en-US", "ar-EG"))}
          </span>
        )}
        <span>•</span>
        <span>
          {t("Created by:", "أُنشئ بواسطة:")}{" "}
          {link.createdBy.slice(0, 8)}
        </span>
      </div>

      {/* Actions */}
      {isAdminOrSupervisor && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={link.isExpired}
            className="flex items-center gap-1.5"
          >
            <Copy className="size-3.5" />
            {t("Copy", "نسخ")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRegenerate(true)}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="size-3.5" />
            {t("Regenerate", "تجديد")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmRevoke(true)}
            disabled={loading}
            className="flex items-center gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
            {t("Revoke", "إلغاء")}
          </Button>
        </div>
      )}

      {/* Confirm: Regenerate */}
      <ConfirmDialog
        open={confirmRegenerate}
        onClose={() => setConfirmRegenerate(false)}
        onConfirm={handleRegenerate}
        title={t("Regenerate Link?", "تجديد الرابط؟")}
        description={t(
          "Regenerate this link? The old link will stop working immediately.",
          "هل تريد تجديد هذا الرابط؟ الرابط القديم سيتوقف عن العمل فوراً."
        )}
        confirmLabel={t("Confirm", "تأكيد")}
        loading={loading}
      />

      {/* Confirm: Revoke */}
      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        onConfirm={handleRevoke}
        title={t("Revoke Link?", "إلغاء الرابط؟")}
        description={t(
          "Revoke this link? This cannot be undone.",
          "هل تريد إلغاء هذا الرابط؟ لا يمكن التراجع عن هذا الإجراء."
        )}
        confirmLabel={t("Revoke Link", "إلغاء الرابط")}
        confirmVariant="destructive"
        loading={loading}
      />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InviteLinks() {
  const t = useT();
  const { membership } = useOrganization();
  const orgRole = ((membership as unknown) as Record<string, unknown>)?.role as string | undefined;
  const isAdmin = orgRole === "org:admin" || orgRole === "admin";
  const isSupervisor = orgRole === "org:supervisor";
  const isAdminOrSupervisor = isAdmin || isSupervisor;

  const links = useQuery(api.inviteLinks.list);
  const [createOpen, setCreateOpen] = useState(false);

  // Loading skeleton
  if (links === undefined) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 w-36 bg-muted rounded animate-pulse" />
          <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-semibold">
            {t("Invite Links", "روابط الدعوة")}
          </h3>
          {isAdminOrSupervisor && (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Plus className="size-4" />
              {t("Create New Link", "إنشاء رابط جديد")}
            </Button>
          )}
        </div>

        {/* Empty state */}
        {links.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
            <Link2 className="size-10 text-muted-foreground/50" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {t("No invite links yet", "لا توجد روابط دعوة بعد")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Create a link to share with your team",
                  "أنشئ رابطاً لمشاركته مع فريقك"
                )}
              </p>
            </div>
            {isAdminOrSupervisor && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateOpen(true)}
                className="mt-1 flex items-center gap-1.5"
              >
                <Plus className="size-4" />
                {t("Create First Link", "إنشاء أول رابط")}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <LinkCard
                key={link._id}
                link={link}
                isAdminOrSupervisor={isAdminOrSupervisor}
              />
            ))}
          </div>
        )}

        {/* Create dialog */}
        <CreateLinkDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          isSupervisor={isSupervisor}
        />
      </div>
    </TooltipProvider>
  );
}
