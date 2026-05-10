"use client";

import { useState, type ReactNode } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useOrganization, useAuth } from "@/lib/auth-hooks";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RoleSelect } from "./role-select";
import type { OrgRole } from "./team-member-list";
import { Mail, MessageCircle, Link2, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n/context";

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteModal({ open, onClose, onInvited }: InviteModalProps) {
  const { organization, membership } = useOrganization();
  const { isLoaded: authLoaded } = useAuth();
  const orgRole = ((membership as unknown) as Record<string, unknown>)?.role as string | undefined;
  const isSupervisor = orgRole === "org:supervisor";
  const [tab, setTab] = useState<"email" | "whatsapp" | "link">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<OrgRole>("org:agent");
  const effectiveRole = isSupervisor ? "org:agent" : role;
  const [error, setError] = useState<ReactNode>(null);
  const [linkFallback, setLinkFallback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const [channelId, setChannelId] = useState<Id<"channels"> | null>(null);
  const [departmentId, setDepartmentId] = useState<Id<"departments"> | null>(null);

  const channels = useQuery(api.channels.listForTenant);
  const showChannelSelector = (channels?.length ?? 0) >= 1;
  const departments = useQuery(
    api.departments.listForChannel,
    channelId ? { channelId } : "skip",
  );

  const t = useT();
  const inviteByEmail = useAction(api.orgMembers.inviteByEmail);
  const inviteByWhatsApp = useAction(api.orgMembers.inviteByWhatsApp);
  const generateLink = useMutation(api.inviteLinks.generate);
  const revokeLink = useMutation(api.inviteLinks.revokeLink);
  const activeLink = useQuery(api.inviteLinks.getActive, organization && authLoaded ? {} : "skip");

  const clearState = () => {
    setError(null);
    setLinkFallback(null);
    setCopied(false);
  };

  const upgradeLink = (
    <a href="/settings/billing" className="underline font-medium whitespace-nowrap">
      {t("Upgrade now →", "ارقَّ الآن ←")}
    </a>
  );

  const makePlanLimitError = (convexData: unknown): ReactNode => {
    const d = convexData as { message?: string; data?: { reason?: string } } | undefined;
    if (d?.data?.reason) {
      // Supervisor role not available on current plan
      return (
        <span>
          {t(
            "Supervisor roles are only available on Starter and above — upgrade to unlock team management, performance analytics, and more.",
            "دور المشرف متاح من خطة Starter فأعلى فقط — ارقَّ لتفعيل إدارة الفريق والتحليلات والمزيد."
          )}{" "}
          {upgradeLink}
        </span>
      );
    }
    // Agent count limit reached
    return (
      <span>
        {t(
          "You've reached your plan's agent limit. Upgrade to add more team members and scale your support operations.",
          "وصلت للحد الأقصى من الوكلاء في خطتك الحالية — ارقَّ لإضافة المزيد وتنمية فريقك."
        )}{" "}
        {upgradeLink}
      </span>
    );
  };

  const handleInviteEmail = async () => {
    if (!email.trim()) return;
    clearState();
    setSending(true);
    try {
      await inviteByEmail({
        email: email.trim(),
        role: effectiveRole,
        ...(channelId ? { channelId } : {}),
        ...(channelId && departmentId ? { departmentId } : {}),
      });
      setEmail("");
      onInvited();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const convexData = (e as { data?: unknown })?.data;
      if (msg.includes("PLAN_LIMIT")) {
        setError(makePlanLimitError(convexData));
      } else if (msg.includes("ALREADY_MEMBER")) {
        setError(t("Already a member", "عضو بالفعل"));
      } else if (msg.includes("LAST_ADMIN")) {
        setError(t("Cannot change the role of the last admin", "لا يمكن تغيير دور آخر مدير"));
      } else if (msg.includes("FORBIDDEN")) {
        setError(t("Forbidden", "غير مصرح"));
      } else if (msg.includes("SUPERVISOR_CAN_ONLY_INVITE_AGENTS")) {
        setError(t(
          "As a Supervisor, you can only invite Agents — contact your Admin to add other Supervisors.",
          "كمشرف، يمكنك دعوة الوكلاء فقط — تواصل مع المدير لإضافة مشرفين جدد."
        ));
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleInviteWhatsApp = async () => {
    if (!phone.trim()) return;
    clearState();
    setSending(true);
    try {
      const result = await inviteByWhatsApp({
        phone: phone.trim(),
        role: effectiveRole,
        ...(channelId ? { channelId } : {}),
        ...(channelId && departmentId ? { departmentId } : {}),
      });
      if (result.whatsappSent) {
        setPhone("");
        onInvited();
        onClose();
      } else {
        setError(t("WhatsApp template not set up yet. Share this invite link instead:", "قالب واتساب غير مُعدّ بعد. شارك رابط الدعوة:"));
        setLinkFallback(result.inviteUrl);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const convexData = (e as { data?: unknown })?.data;
      if (msg.includes("INVALID_PHONE")) {
        setError(t("Invalid phone number (E.164: +201012345678)", "رقم هاتف غير صالح (مثال: +201012345678)"));
      } else if (msg.includes("PLAN_LIMIT")) {
        setError(makePlanLimitError(convexData));
      } else if (msg.includes("FORBIDDEN")) {
        setError(t("Forbidden", "غير مصرح"));
      } else if (msg.includes("SUPERVISOR_CAN_ONLY_INVITE_AGENTS")) {
        setError(t(
          "As a Supervisor, you can only invite Agents — contact your Admin to add other Supervisors.",
          "كمشرف، يمكنك دعوة الوكلاء فقط — تواصل مع المدير لإضافة مشرفين جدد."
        ));
      } else {
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleGenerate = async () => {
    clearState();
    setSending(true);
    try {
      await generateLink({});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async () => {
    clearState();
    setSending(true);
    try {
      await revokeLink({});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const handleCopyActiveLink = async () => {
    if (!activeLink?.url) return;
    await navigator.clipboard.writeText(activeLink.url);
    setCopied(true);
    toast.success(t("Link copied!", "تم نسخ الرابط!"));
    setTimeout(() => setCopied(false), 2000);
  };

  const allTabs: Array<{ id: "email" | "whatsapp" | "link"; label: string; icon: React.ReactNode }> = [
    { id: "email", label: t("Email", "بريد إلكتروني"), icon: <Mail className="size-4" /> },
    { id: "whatsapp", label: t("WhatsApp", "واتساب"), icon: <MessageCircle className="size-4" /> },
    { id: "link", label: t("Link", "رابط"), icon: <Link2 className="size-4" /> },
  ];

  const tabs = isSupervisor ? allTabs.filter((t) => t.id !== "link") : allTabs;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-136">
        <DialogHeader className="pe-8">
          <DialogTitle>{t("Invite Member", "دعوة عضو")}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); clearState(); setChannelId(null); setDepartmentId(null); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-t-md transition-colors ${
                tab === t.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "email" && (
          <div className="space-y-3">
            <Input
              type="email"
              placeholder={t("Email address", "البريد الإلكتروني")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
            <RoleSelect value={isSupervisor ? "org:agent" : role} onChange={isSupervisor ? () => {} : setRole} disabled={isSupervisor} />
            {showChannelSelector && (
              <ChannelDeptSelectors
                channels={channels ?? []}
                channelId={channelId}
                departmentId={departmentId}
                departments={departments ?? []}
                onChannelChange={(id) => { setChannelId(id); setDepartmentId(null); }}
                onDepartmentChange={setDepartmentId}
                t={t}
              />
            )}
            <Button
              onClick={handleInviteEmail}
              disabled={!email.trim() || sending}
              className="w-full"
            >
              {sending ? t("Sending...", "جارٍ الإرسال...") : t("Invite", "دعوة")}
            </Button>
          </div>
        )}

        {tab === "whatsapp" && (
          <div className="space-y-3">
            <Input
              type="tel"
              placeholder="+201012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
            />
            <RoleSelect value={isSupervisor ? "org:agent" : role} onChange={isSupervisor ? () => {} : setRole} disabled={isSupervisor} />
            {showChannelSelector && (
              <ChannelDeptSelectors
                channels={channels ?? []}
                channelId={channelId}
                departmentId={departmentId}
                departments={departments ?? []}
                onChannelChange={(id) => { setChannelId(id); setDepartmentId(null); }}
                onDepartmentChange={setDepartmentId}
                t={t}
              />
            )}
            <Button
              onClick={handleInviteWhatsApp}
              disabled={!phone.trim() || sending}
              className="w-full"
            >
              {sending ? t("Sending...", "جارٍ الإرسال...") : t("Send WhatsApp", "إرسال واتساب")}
            </Button>
            {linkFallback && (
              <div className="flex items-center gap-2 min-w-0">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all min-w-0" dir="ltr">
                  {linkFallback}
                </code>
                <Button variant="outline" size="icon-sm" onClick={async () => { await navigator.clipboard.writeText(linkFallback); }}>
                  <Copy className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "link" && (
          <div className="space-y-3">
            {activeLink ? (
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all min-w-0" dir="ltr">
                    {activeLink.url}
                  </code>
                  <Button variant="outline" size="icon-sm" onClick={handleCopyActiveLink}>
                    {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t("Expires:", "تنتهي في:")} {new Date(activeLink.expiresAt).toLocaleDateString(t("en-US", "ar-EG"))}
                </div>
                <Button
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={sending}
                  className="w-full"
                >
                  {t("Revoke Link", "إلغاء الرابط")}
                </Button>
              </>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={sending}
                className="w-full"
              >
                {t("Generate Link", "إنشاء رابط")}
              </Button>
            )}
          </div>
        )}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-md p-2">
            {error}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ChannelLabel({ ch }: { ch: { displayName: string; displayPhone?: string | null; _id: string } }) {
  const hasName = Boolean(ch.displayName);
  const hasPhone = Boolean(ch.displayPhone);

  if (hasName && hasPhone) {
    return (
      <span className="flex items-center gap-1 min-w-0">
        <span className="truncate">{ch.displayName}</span>
        <span className="text-muted-foreground">·</span>
        <span dir="ltr" className="text-muted-foreground shrink-0">{ch.displayPhone}</span>
      </span>
    );
  }
  if (hasPhone) {
    return <span dir="ltr">{ch.displayPhone}</span>;
  }
  if (hasName) {
    return <span>{ch.displayName}</span>;
  }
  return <span dir="ltr">{ch._id}</span>;
}

interface ChannelDeptSelectorsProps {
  channels: Array<{ _id: Id<"channels">; displayName: string; displayPhone?: string | null }>;
  channelId: Id<"channels"> | null;
  departmentId: Id<"departments"> | null;
  departments: Array<{ _id: Id<"departments">; name: string }>;
  onChannelChange: (id: Id<"channels"> | null) => void;
  onDepartmentChange: (id: Id<"departments"> | null) => void;
  t: (en: string, ar: string) => string;
}

function ChannelDeptSelectors({
  channels,
  channelId,
  departmentId,
  departments,
  onChannelChange,
  onDepartmentChange,
  t,
}: ChannelDeptSelectorsProps) {
  const selectedChannel = channels.find((ch) => ch._id === channelId);
  const selectedDept = departments.find((d) => d._id === departmentId);
  const selectedDeptLabel = selectedDept ? (selectedDept.name || String(selectedDept._id)) : null;

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-sm font-medium leading-none">
          {t("Channel", "القناة")}
        </label>
        <Select
          value={channelId ?? "__none__"}
          onValueChange={(v) => onChannelChange(v === "__none__" ? null : v as Id<"channels">)}
        >
          <SelectTrigger className="w-full text-sm">
            <SelectValue placeholder={t("Select a channel", "اختر قناة")}>
              {selectedChannel ? (
                <ChannelLabel ch={selectedChannel} />
              ) : t("No channel", "بدون قناة")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("No channel", "بدون قناة")}</SelectItem>
            {channels.map((ch) => (
              <SelectItem key={ch._id} value={ch._id}>
                <ChannelLabel ch={ch} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {channelId && (
        <div className="space-y-1.5">
          <label className="text-sm font-medium leading-none">
            {t("Department", "القسم")}{" "}
            <span className="text-muted-foreground font-normal">
              {t("(optional)", "(اختياري)")}
            </span>
          </label>
          <Select
            value={departmentId ?? "__none__"}
            onValueChange={(v) => onDepartmentChange(v === "__none__" ? null : v as Id<"departments">)}
            disabled={departments.length === 0}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder={departments.length === 0 ? t("No departments available", "لا توجد أقسام") : t("Select a department", "اختر قسمًا")}>
                {selectedDeptLabel ?? t("No department", "بدون قسم")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("No department", "بدون قسم")}</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d._id} value={d._id}>
                  {d.name || String(d._id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
