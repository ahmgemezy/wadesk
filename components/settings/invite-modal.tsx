"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useOrganization, useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [error, setError] = useState<string | null>(null);
  const [linkFallback, setLinkFallback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

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

  const handleInviteEmail = async () => {
    if (!email.trim()) return;
    clearState();
    setSending(true);
    try {
      await inviteByEmail({ email: email.trim(), role: effectiveRole });
      setEmail("");
      onInvited();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("PLAN_LIMIT")) {
        setError(t("Plan limit reached", "تم بلوغ الحد الأقصى"));
      } else if (msg.includes("ALREADY_MEMBER")) {
        setError(t("Already a member", "عضو بالفعل"));
      } else if (msg.includes("LAST_ADMIN")) {
        setError(t("Cannot change the role of the last admin", "لا يمكن تغيير دور آخر مدير"));
      } else if (msg.includes("FORBIDDEN")) {
        setError(t("Forbidden", "غير مصرح"));
      } else if (msg.includes("SUPERVISOR_CAN_ONLY_INVITE_AGENTS")) {
        setError(t("Supervisors can only invite agents", "المشرف يمكنه دعوة وكلاء فقط"));
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
      await inviteByWhatsApp({ phone: phone.trim(), role: effectiveRole });
      setPhone("");
      onInvited();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("INVALID_PHONE")) {
        setError(t("Invalid phone number (E.164: +201012345678)", "رقم هاتف غير صالح (مثال: +201012345678)"));
      } else if (msg.includes("PLAN_LIMIT")) {
        setError(t("Plan limit reached", "تم بلوغ الحد الأقصى"));
      } else if (msg.includes("WHATSAPP_SEND_FAILED")) {
        setError(t("WhatsApp send failed. You can share this link instead:", "فشل إرسال واتساب. يمكنك مشاركة هذا الرابط:"));
        if (activeLink?.url) {
          setLinkFallback(activeLink.url);
        }
      } else if (msg.includes("FORBIDDEN")) {
        setError(t("Forbidden", "غير مصرح"));
      } else if (msg.includes("SUPERVISOR_CAN_ONLY_INVITE_AGENTS")) {
        setError(t("Supervisors can only invite agents", "المشرف يمكنه دعوة وكلاء فقط"));
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Invite Member", "دعوة عضو")}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-1 border-b pb-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); clearState(); }}
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
            <Button
              onClick={handleInviteWhatsApp}
              disabled={!phone.trim() || sending}
              className="w-full"
            >
              {sending ? t("Sending...", "جارٍ الإرسال...") : t("Send WhatsApp", "إرسال واتساب")}
            </Button>
            {linkFallback && (
              <div className="flex items-center gap-2">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate" dir="ltr">
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
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate" dir="ltr">
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
