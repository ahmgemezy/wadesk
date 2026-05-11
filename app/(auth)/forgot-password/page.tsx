"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";
import { DT } from "@/lib/design-tokens";

export default function ForgotPasswordPage() {
  const t = useT();
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    if (err) {
      setError(err.message ?? t("Something went wrong", "حدث خطأ ما"));
      setLoading(false);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="w-full max-w-sm" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className={`${DT.CARD} p-8 space-y-6`}>
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <CheckCircle2 className="size-12 text-[#34C759] dark:text-[#30D158]" />
            <div className="space-y-1">
              <h1 className={DT.H2}>
                {t("Check your email", "تحقق من بريدك")}
              </h1>
              <p className={DT.MUTED}>
                {t(
                  `We sent a password reset link to ${email}`,
                  `أرسلنا رابط إعادة تعيين كلمة المرور إلى ${email}`
                )}
              </p>
            </div>
            <p className={`${DT.MUTED} leading-relaxed`}>
              {t(
                "Didn't receive it? Check your spam folder or try again.",
                "لم تستلمه؟ تحقق من مجلد الرسائل غير المرغوب فيها أو حاول مجدداً."
              )}
            </p>
            <Link href="/sign-in" className={DT.TEXT_BLUE_INTERACTIVE}>
              {t("Back to Sign In", "العودة لتسجيل الدخول")}
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h1 className={DT.H2}>
                {t("Forgot Password?", "نسيت كلمة المرور؟")}
              </h1>
              <p className={DT.MUTED}>
                {t(
                  "Enter your email and we'll send you a reset link",
                  "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={DT.LBL} htmlFor="email">
                  {t("Email", "البريد الإلكتروني")}
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  className={DT.INPUT}
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p className="text-[13px] text-[#FF3B30] dark:text-[#FF453A] bg-[#FF3B30]/10 dark:bg-[#FF453A]/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`${DT.BTN_PRIMARY} w-full mt-4`}
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading
                  ? t("Sending…", "جارٍ الإرسال…")
                  : t("Send Reset Link", "إرسال رابط إعادة التعيين")}
              </button>
            </form>

            <p className={`${DT.MUTED} text-center`}>
              {t("Remember your password?", "تتذكر كلمة المرور؟")}{" "}
              <Link href="/sign-in" className={DT.TEXT_BLUE_INTERACTIVE}>
                {t("Sign In", "تسجيل الدخول")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
