"use client";

import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { useAuth } from "@/lib/auth-hooks";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { DT } from "@/lib/design-tokens";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { ChannelStatusBadge } from "@/components/onboarding/channel-status-badge";
import { EmbeddedSignupButton } from "@/components/onboarding/embedded-signup-button";
import { Plus, AlertTriangle, CheckCircle2, PhoneCall, Clock, Terminal } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MANUAL_CONNECT === "true";

const CHANNEL_LIMITS: Record<string, number> = {
  free: 1,
  starter: 1,
  growth: 5,
  business: Infinity,
};

export default function ChannelsListPage() {
  const t = useT();
  const { isLoaded, orgId, orgRole } = useAuth();
  const isAdmin = orgRole === "org:admin";
  const router = useRouter();

  const channels = useQuery(api.channels.listForTenant, isLoaded && orgId ? {} : "skip");
  const plan = useQuery(api.lib.tenants.getCurrentPlan, isLoaded && orgId ? {} : "skip");
  const disconnectChannel = useMutation(api.channels.disconnect);

  const devConnect = useAction(api.channels.devConnectWithCredentials);

  const [showSignup, setShowSignup] = useState(false);
  const [showDevForm, setShowDevForm] = useState(false);
  const [devFields, setDevFields] = useState({ phoneNumberId: "", wabaId: "", displayPhone: "", displayName: "" });
  const [devLoading, setDevLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [reconnectChannelId, setReconnectChannelId] = useState<string | null>(null);

  async function handleDevConnect() {
    if (!devFields.phoneNumberId || !devFields.wabaId || !devFields.displayPhone || !devFields.displayName) {
      toast.error("Fill in all fields");
      return;
    }
    setDevLoading(true);
    try {
      const { displayPhone } = await devConnect(devFields);
      setShowDevForm(false);
      setDevFields({ phoneNumberId: "", wabaId: "", displayPhone: "", displayName: "" });
      setSuccessMessage(`Connected: ${displayPhone}`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setDevLoading(false);
    }
  }

  const channelLimit = plan ? (CHANNEL_LIMITS[plan] ?? 1) : 1;
  type ChannelItem = NonNullable<typeof channels>[number];
  const activeChannels = channels?.filter(
    (c: ChannelItem) => c.status === "active" || c.status === "connecting"
  ) ?? [];
  const pendingDeletion = channels?.filter(
    (c: ChannelItem) => c.status === "disconnected" || c.status === "reconnect_required"
  ) ?? [];
  const activeCount = activeChannels.length;
  const atLimit = channelLimit !== Infinity && activeCount >= channelLimit;

  const reconnectRequired = pendingDeletion;

  const handleDisconnect = async (channelId: Id<"channels">, name: string) => {
    if (!confirm(t(`Disconnect "${name}"? No new messages will arrive on this number.`, `قطع اتصال "${name}"؟ لن تصل رسائل جديدة لهذا الرقم.`))) return;
    try {
      await disconnectChannel({ channelId });
      toast.success(t("Disconnected", "تم قطع الاتصال"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("An error occurred", "حدث خطأ"));
    }
  };

  const handleSignupSuccess = (channelId: string, displayPhone: string) => {
    setShowSignup(false);
    setReconnectChannelId(null);
    setSignupError(null);
    setSuccessMessage(t(`Connected successfully! ${displayPhone}`, `تم الربط بنجاح! ${displayPhone}`));
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleSignupError = (error: string) => {
    setSignupError(error);
  };

  function daysLeft(disconnectedAt?: number) {
    if (!disconnectedAt) return null;
    return Math.max(0, 30 - Math.floor((Date.now() - disconnectedAt) / 86_400_000));
  }

  if (channels === undefined || plan === undefined) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <div className="h-8 rounded bg-muted animate-pulse w-48" />
        <div className="space-y-3">
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
          <div className="h-16 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Success message */}
      {successMessage && (
        <Alert className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-800 dark:text-green-300 font-cairo">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-cairo">{t("WhatsApp Numbers", "أرقام واتساب")}</h1>
        {isAdmin && (
          atLimit ? (
            <button className={DT.BTN_OUTLINE} onClick={() => router.push("/settings/billing")}>
              <Plus className="size-4 me-1" />
              {t("Upgrade Plan to Add Number", "ترقية الباقة لإضافة رقم جديد")}
            </button>
          ) : (
            <button className={DT.BTN_PRIMARY} onClick={() => { setShowSignup(true); setSignupError(null); }}>
              <Plus className="size-4 me-1" />
              {t("Connect Number", "ربط رقم جديد")}
            </button>
          )
        )}
      </div>

      {/* Embedded Signup panel */}
      {showSignup && !reconnectChannelId && (
        <div className="mb-6 rounded-lg border p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold font-cairo">{t("Connect WhatsApp Business", "ربط حساب واتساب بيزنس")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 font-cairo">
              {t("You'll own the WABA directly — WABDesk never locks you in", "ستمتلك حساب WABA مباشرة — WABDesk لا يقيدك أبداً")}
            </p>
          </div>

          {signupError && (
            <Alert variant="destructive">
              <AlertDescription className="font-cairo">{signupError}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center gap-3">
            <EmbeddedSignupButton
              onSuccess={handleSignupSuccess}
              onError={handleSignupError}
            />
            <button className={DT.BTN_OUTLINE} onClick={() => setShowSignup(false)}>
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        </div>
      )}

      {/* Dev-only: manual credentials form */}
      {IS_DEV && isAdmin && (
        <div className="mb-6">
          {!showDevForm ? (
            <button className={`${DT.BTN_OUTLINE} gap-2 text-muted-foreground border-dashed`} onClick={() => setShowDevForm(true)}>
              <Terminal className="size-3.5" />
              Dev: Connect with credentials
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Dev Mode — Manual Connect</span>
                <span className="text-xs text-muted-foreground ms-auto">Get these from Meta Developer Console → Testing</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Phone Number ID</Label>
                  <input placeholder="123456789012345" value={devFields.phoneNumberId} onChange={e => setDevFields(f => ({ ...f, phoneNumberId: e.target.value }))} className={DT.INPUT} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">WABA ID</Label>
                  <input placeholder="123456789012345" value={devFields.wabaId} onChange={e => setDevFields(f => ({ ...f, wabaId: e.target.value }))} className={DT.INPUT} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Display Phone</Label>
                  <input placeholder="+20 100 000 0000" dir="ltr" value={devFields.displayPhone} onChange={e => setDevFields(f => ({ ...f, displayPhone: e.target.value }))} className={DT.INPUT} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Display Name</Label>
                  <input placeholder="My Business" value={devFields.displayName} onChange={e => setDevFields(f => ({ ...f, displayName: e.target.value }))} className={DT.INPUT} />
                </div>
              </div>
              <div className="flex gap-2">
                <button className={DT.BTN_SM} disabled={devLoading} onClick={handleDevConnect}>
                  {devLoading ? "Connecting…" : "Connect"}
                </button>
                <button className={DT.BTN_OUTLINE} onClick={() => setShowDevForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Channel list */}
      {channels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center space-y-3">
          <PhoneCall className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="font-semibold font-cairo">{t("No numbers connected", "لا توجد أرقام مرتبطة")}</p>
          <p className="text-sm text-muted-foreground font-cairo">
            {t("Connect a WhatsApp Business number to start receiving messages", "اربط رقم واتساب بيزنس لتبدأ في استقبال الرسائل")}
          </p>
          {isAdmin && !atLimit && (
            <button onClick={() => setShowSignup(true)} className={`${DT.BTN_PRIMARY} mt-2`}>
              <Plus className="size-4 me-1" />
              {t("Connect Now", "ربط رقم الآن")}
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Active channels */}
          <div className="space-y-3">
            {activeChannels.map((channel: ChannelItem) => {
              return (
                <div
                  key={channel._id}
                  className="rounded-lg border p-4 space-y-3 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/settings/channels/${channel._id}`}
                      className="flex-1 min-w-0 space-y-1"
                    >
                      <div className="font-medium font-cairo">{channel.displayName}</div>
                      {channel.displayPhone && (
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {channel.displayPhone}
                        </div>
                      )}
                    </Link>

                    <div className="flex items-center gap-2 shrink-0">
                      <ChannelStatusBadge
                        status={channel.status ?? (channel.isActive ? "active" : "disconnected")}
                      />
                    </div>
                  </div>

                  {/* Admin actions */}
                  {isAdmin && channel.status !== "disconnected" && channel.status !== "reconnect_required" && (
                    <div className="pt-2 border-t flex justify-end">
                      <button
                        className="text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1"
                        onClick={() => handleDisconnect(channel._id as Id<"channels">, channel.displayName)}
                      >
                        {t("Disconnect", "قطع الاتصال")}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pending Deletion section */}
          {pendingDeletion.length > 0 && (
            <div className="mt-8 space-y-3">
              <h2 className="text-lg font-semibold text-destructive font-cairo flex items-center gap-2">
                <AlertTriangle className="size-5" />
                {t("Pending Deletion", "في انتظار الحذف")}
              </h2>
              <div className="space-y-3">
                {pendingDeletion.map((channel: ChannelItem) => {
                  const dl = daysLeft(channel.disconnectedAt ?? undefined);
                  const isReconnecting = reconnectChannelId === channel._id;

                  return (
                    <div
                      key={channel._id}
                      className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="font-medium font-cairo">{channel.displayName}</div>
                          {channel.displayPhone && (
                            <div className="text-xs text-muted-foreground" dir="ltr">
                              {channel.displayPhone}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground font-cairo">
                            {t(
                              "Automations, templates, and settings are preserved",
                              "قواعد الأتمتة والقوالب والإعدادات محفوظة"
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge
                            variant="destructive"
                            className="text-[10px] flex items-center gap-1"
                          >
                            <Clock className="size-3" />
                            {dl !== null
                              ? dl === 0
                                ? t("Deletes today", "يُحذف اليوم")
                                : t(`Deletes in ${dl} days`, `يُحذف خلال ${dl} أيام`)
                              : t("Disconnected", "غير متصل")}
                          </Badge>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="pt-2 border-t border-destructive/20 space-y-2">
                          {isReconnecting ? (
                            <>
                              {signupError && (
                                <Alert variant="destructive">
                                  <AlertDescription className="text-xs font-cairo">{signupError}</AlertDescription>
                                </Alert>
                              )}
                              <EmbeddedSignupButton
                                onSuccess={handleSignupSuccess}
                                onError={handleSignupError}
                                label={t("Reconnect to prevent deletion", "أعد الاتصال لمنع الحذف")}
                              />
                            </>
                          ) : (
                            <button
                              className={`${DT.BTN_OUTLINE} border-destructive/50 text-destructive hover:bg-destructive/10`}
                              onClick={() => { setReconnectChannelId(channel._id); setSignupError(null); }}
                            >
                              {t("Reconnect to prevent deletion", "أعد الاتصال لمنع الحذف")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
