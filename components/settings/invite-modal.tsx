"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
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

interface InviteModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
}

export function InviteModal({ open, onClose, onInvited }: InviteModalProps) {
  const [tab, setTab] = useState<"email" | "whatsapp" | "link">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<OrgRole>("org:agent");
  const [error, setError] = useState<string | null>(null);
  const [linkFallback, setLinkFallback] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);

  const inviteByEmail = useAction(api.orgMembers.inviteByEmail);
  const inviteByWhatsApp = useAction(api.orgMembers.inviteByWhatsApp);
  const generateLink = useMutation(api.inviteLinks.generate);
  const revokeLink = useMutation(api.inviteLinks.revokeLink);
  const activeLink = useQuery(api.inviteLinks.getActive);

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
      await inviteByEmail({ email: email.trim(), role });
      setEmail("");
      onInvited();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("PLAN_LIMIT")) {
        setError("تم بلوغ الحد الأقصى / Plan limit reached");
      } else if (msg.includes("ALREADY_MEMBER")) {
        setError("عضو بالفعل / Already a member");
      } else if (msg.includes("FORBIDDEN")) {
        setError("غير مصرح / Forbidden");
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
      await inviteByWhatsApp({ phone: phone.trim(), role });
      setPhone("");
      onInvited();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("INVALID_PHONE")) {
        setError("رقم هاتف غير صالح / Invalid phone number (E.164: +201012345678)");
      } else if (msg.includes("PLAN_LIMIT")) {
        setError("تم بلوغ الحد الأقصى / Plan limit reached");
      } else if (msg.includes("WHATSAPP_SEND_FAILED")) {
        setError("فشل إرسال واتساب / WhatsApp send failed");
      } else if (msg.includes("FORBIDDEN")) {
        setError("غير مصرح / Forbidden");
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
    toast.success("تم النسخ / Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: Array<{ id: "email" | "whatsapp" | "link"; label: string; icon: React.ReactNode }> = [
    { id: "email", label: "بريد إلكتروني / Email", icon: <Mail className="size-4" /> },
    { id: "whatsapp", label: "واتساب / WhatsApp", icon: <MessageCircle className="size-4" /> },
    { id: "link", label: "رابط / Link", icon: <Link2 className="size-4" /> },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>دعوة عضو / Invite Member</DialogTitle>
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
              placeholder="البريد الإلكتروني / Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
            />
            <RoleSelect value={role} onChange={setRole} />
            <Button
              onClick={handleInviteEmail}
              disabled={!email.trim() || sending}
              className="w-full"
            >
              {sending ? "جارٍ الإرسال... / Sending..." : "دعوة / Invite"}
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
            <RoleSelect value={role} onChange={setRole} />
            <Button
              onClick={handleInviteWhatsApp}
              disabled={!phone.trim() || sending}
              className="w-full"
            >
              {sending ? "جارٍ الإرسال... / Sending..." : "إرسال واتساب / Send WhatsApp"}
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
                  تنتهي في / Expires: {new Date(activeLink.expiresAt).toLocaleDateString("ar-EG")}
                </div>
                <Button
                  variant="destructive"
                  onClick={handleRevoke}
                  disabled={sending}
                  className="w-full"
                >
                  إلغاء الرابط / Revoke Link
                </Button>
              </>
            ) : (
              <Button
                onClick={handleGenerate}
                disabled={sending}
                className="w-full"
              >
                إنشاء رابط / Generate Link
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
