"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChannelStatusBadge } from "@/components/onboarding/channel-status-badge";
import { EmbeddedSignupButton } from "@/components/onboarding/embedded-signup-button";
import { Plus, AlertTriangle, CheckCircle2, PhoneCall, Clock } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";
import { Badge } from "@/components/ui/badge";

const CHANNEL_LIMITS: Record<string, number> = {
  free: 1,
  starter: 2,
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

  const [showSignup, setShowSignup] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [reconnectChannelId, setReconnectChannelId] = useState<string | null>(null);

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
            <Button size="sm" variant="outline" onClick={() => router.push("/settings/billing")}>
              <Plus className="size-4 me-1" />
              {t("Upgrade Plan to Add Number", "ترقية الباقة لإضافة رقم جديد")}
            </Button>
          ) : (
            <Button size="sm" onClick={() => { setShowSignup(true); setSignupError(null); }}>
              <Plus className="size-4 me-1" />
              {t("Connect Number", "ربط رقم جديد")}
            </Button>
          )
        )}
      </div>

      {/* Embedded Signup panel */}
      {showSignup && !reconnectChannelId && (
        <div className="mb-6 rounded-lg border p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold font-cairo">{t("Connect WhatsApp Business", "ربط حساب واتساب بيزنس")}</h2>
            <p className="text-sm text-muted-foreground mt-0.5 font-cairo">
              {t("You'll own the WABA directly — WaDesk never locks you in", "ستمتلك حساب WABA مباشرة — WaDesk لا يقيدك أبداً")}
            </p>
          </div>

          {signupError && (
            <Alert variant="destructive">
              <AlertDescription className="font-cairo">{signupError}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <EmbeddedSignupButton
              onSuccess={handleSignupSuccess}
              onError={handleSignupError}
            />
            <Button variant="ghost" size="sm" onClick={() => setShowSignup(false)}>
              {t("Cancel", "إلغاء")}
            </Button>
          </div>
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
            <Button size="sm" onClick={() => setShowSignup(true)} className="mt-2">
              <Plus className="size-4 me-1" />
              {t("Connect Now", "ربط رقم الآن")}
            </Button>
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => handleDisconnect(channel._id as Id<"channels">, channel.displayName)}
                      >
                        {t("Disconnect", "قطع الاتصال")}
                      </Button>
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-destructive/50 text-destructive hover:bg-destructive/10"
                              onClick={() => { setReconnectChannelId(channel._id); setSignupError(null); }}
                            >
                              {t("Reconnect to prevent deletion", "أعد الاتصال لمنع الحذف")}
                            </Button>
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
