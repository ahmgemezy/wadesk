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
import { Plus, AlertTriangle, CheckCircle2, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { useT } from "@/lib/i18n/context";

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
  const activeCount = channels?.filter(
    (c: ChannelItem) => c.status === "active" || c.status === "connecting"
  ).length ?? 0;
  const atLimit = channelLimit !== Infinity && activeCount >= channelLimit;

  const reconnectRequired = channels?.filter((c: ChannelItem) => c.status === "reconnect_required" || c.status === "disconnected") ?? [];

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
      {/* Reconnect required banner */}
      {reconnectRequired.length > 0 && (
        <Alert className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-300 font-cairo">
            {t("One or more numbers are disconnected — reconnect to resume messages", "رقم واحد أو أكثر غير متصل — أعد الاتصال لاستئناف الرسائل")}
          </AlertDescription>
        </Alert>
      )}

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
        <div className="space-y-3">
          {channels.map((channel: ChannelItem) => {
            const needsReconnect = channel.status === "reconnect_required" || channel.status === "disconnected";
            const isReconnecting = reconnectChannelId === channel._id;

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
                    <div className="text-xs text-muted-foreground font-cairo">
                      {channel.assignmentMode === "first_reply" && t("First reply wins", "أول رد يأخذ المحادثة")}
                      {channel.assignmentMode === "manual" && t("Manual assignment", "توزيع يدوي")}
                      {channel.assignmentMode === "round_robin" && t("Round robin", "توزيع دوري")}
                    </div>
                  </Link>

                  <div className="flex items-center gap-2 shrink-0">
                    <ChannelStatusBadge
                      status={channel.status ?? (channel.isActive ? "active" : "disconnected")}
                    />
                  </div>
                </div>

                {/* Reconnect banner per channel */}
                {needsReconnect && isAdmin && (
                  <div className="pt-2 border-t space-y-2">
                    {isReconnecting && (
                      <>
                        {signupError && (
                          <Alert variant="destructive">
                            <AlertDescription className="text-xs font-cairo">{signupError}</AlertDescription>
                          </Alert>
                        )}
                        <EmbeddedSignupButton
                          onSuccess={handleSignupSuccess}
                          onError={handleSignupError}
                          label={channel.status === "disconnected"
                            ? t("Reactivate", "إعادة التفعيل")
                            : t("Reconnect", "إعادة الاتصال")
                          }
                        />
                      </>
                    )}
                    {!isReconnecting && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setReconnectChannelId(channel._id); setSignupError(null); }}
                      >
                        {channel.status === "disconnected"
                          ? t("Reactivate", "إعادة التفعيل")
                          : t("Reconnect", "إعادة الاتصال")
                        }
                      </Button>
                    )}
                  </div>
                )}

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
      )}
    </div>
  );
}
