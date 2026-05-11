"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ConvexError } from "convex/values";
import { useT } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

interface EmbeddedSignupButtonProps {
  onSuccess: (channelId: string, displayPhone: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
  label?: string;
}

declare global {
  interface Window {
    FB: {
      init: (options: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: { config_id: string; response_type: string; override_default_response_type: boolean; scope?: string; extras?: Record<string, string> }
      ) => void;
    };
  }
}

type WabaMessageData = {
  waba_id: string;
  phone_number_id: string;
  display_phone_number?: string;
};

function getErrorMessage(error: unknown, t: (en: string, ar: string) => string): string {
  if (error instanceof ConvexError) {
    const data = error.data as string | { code?: string; reason?: string } | undefined;
    const code = typeof data === "string" ? data : data?.code;
    switch (code) {
      case "FORBIDDEN":
        return t("You don't have permission to connect WhatsApp numbers", "ليس لديك صلاحية لربط أرقام واتساب");
      case "PLAN_LIMIT_REACHED":
        return t("You've reached the maximum numbers for your plan", "وصلت للحد الأقصى من الأرقام في باقتك الحالية");
      case "DUPLICATE_NUMBER":
        return t("This number is already registered in another account", "هذا الرقم مسجّل بالفعل في حساب آخر");
      case "TOKEN_EXCHANGE_FAILED":
        return t("Meta account verification failed — please try again", "فشل التحقق من حساب ميتا — حاول مرة تانية");
      case "TOKEN_REVOKED":
        return t("Token expired — please reconnect your account", "انتهت صلاحية الرمز — أعد ربط حسابك");
      case "WABA_DISCOVERY_FAILED":
        return t("Could not find a WhatsApp Business account — make sure your Meta account has a WABA with a phone number", "لم يتم العثور على حساب واتساب بيزنس — تأكد أن حساب ميتا الخاص بك يحتوي على WABA برقم هاتف");
      default:
        return t("An error occurred during connection — please try again", "حدث خطأ أثناء الربط — حاول مرة تانية");
    }
  }
  return t("Connection failed — please try again", "فشل ربط الحساب — حاول مرة تانية");
}

export function EmbeddedSignupButton({
  onSuccess,
  onError,
  disabled,
  label,
}: EmbeddedSignupButtonProps) {
  const t = useT();
  const completeSignup = useAction(api.channels.completeEmbeddedSignup);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const wabaDataRef = useRef<WabaMessageData | null>(null);

  const appId = process.env.NEXT_PUBLIC_META_APP_ID ?? "";
  const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID ?? "";

  // If FB SDK already loaded from a previous mount, mark ready immediately
  useEffect(() => {
    if (window.FB) setSdkReady(true);
  }, []);

  // Listen for postMessage from Meta's popup (WABA + phone number IDs)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      let parsed: unknown = event.data;
      if (typeof event.data === "string") {
        try {
          parsed = JSON.parse(event.data);
        } catch {
          // not JSON — ignore
        }
      }

      console.log("[WA-DEBUG] postMessage:", {
        origin: event.origin,
        rawType: typeof event.data,
        dataType: (parsed as Record<string, unknown>)?.type,
        dataEvent: (parsed as Record<string, unknown>)?.event,
      });

      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed as Record<string, unknown>)?.type === "WA_EMBEDDED_SIGNUP" &&
        ((parsed as Record<string, unknown>)?.event === "FINISH" || (parsed as Record<string, unknown>)?.event === "FINISH_AND_CLOSE")
      ) {
        wabaDataRef.current = (parsed as { data: WabaMessageData }).data;
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const processSignup = async (code: string) => {
    try {
      // Poll for postMessage data (up to 10s) — Meta sends it just before FB.login callback fires
      const wabaData = await new Promise<WabaMessageData | null>((resolve) => {
        if (wabaDataRef.current) { resolve(wabaDataRef.current); return; }
        const deadline = Date.now() + 10_000;
        const poll = setInterval(() => {
          if (wabaDataRef.current) { clearInterval(poll); resolve(wabaDataRef.current); }
          else if (Date.now() >= deadline) { clearInterval(poll); resolve(null); }
        }, 100);
      });

      if (!wabaData) {
        console.error("[WA-DEBUG] No WABA data received after 10s polling");
        onError(t("No account data received from Meta — please try again", "لم يتم استلام بيانات الحساب من ميتا — حاول مرة تانية"));
        return;
      }

      console.log("[WA-DEBUG] WABA data received:", wabaData);

      const result = await completeSignup({
        code,
        wabaId: wabaData.waba_id,
        phoneNumberId: wabaData.phone_number_id,
        displayPhone: wabaData.display_phone_number ?? wabaData.phone_number_id,
        displayName: "WhatsApp Business",
      });
      onSuccess(result.channelId, result.displayPhone);
    } catch (err) {
      onError(getErrorMessage(err, t));
    } finally {
      setLoading(false);
    }
  };

  const handleClick = () => {
    if (!sdkReady || loading || disabled) return;

    wabaDataRef.current = null;
    setLoading(true);

    console.log("[WA-DEBUG] Opening FB.login popup", { appId, configId });

    window.FB.login(
      (response) => {
        console.log("[WA-DEBUG] FB.login callback:", {
          authResponse: response.authResponse
            ? { code: response.authResponse.code ? "(present)" : "(missing)" }
            : "(missing)",
        });
        const code = response.authResponse?.code;
        if (!code) {
          setLoading(false);
          onError(t("Connection cancelled", "تم إلغاء عملية الربط"));
          return;
        }
        void processSignup(code);
      },
      {
        config_id: configId,
        response_type: "code",
        override_default_response_type: true,
        scope: "whatsapp_business_management,whatsapp_business_messaging",
        extras: {
          setup: "",
          featureType: "whatsapp_business_app_onboarding",
          sessionInfoVersion: "3",
        },
      }
    );
  };

  const isReady = sdkReady && !disabled;

  return (
    <>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="lazyOnload"
        onLoad={() => {
          window.FB.init({
            appId,
            autoLogAppEvents: true,
            xfbml: true,
            version: "v25.0",
          });
          setSdkReady(true);
        }}
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={!isReady || loading}
        className={`${DT.BTN_PRIMARY} w-full disabled:pointer-events-none font-cairo`}
      >
        {loading ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <span>{t("Connecting...", "جارٍ الاتصال...")}</span>
          </>
        ) : (
          <>
            {/* WhatsApp icon */}
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>{label ?? t("Connect WhatsApp Business", "ربط واتساب بيزنس")}</span>
          </>
        )}
      </button>
    </>
  );
}
