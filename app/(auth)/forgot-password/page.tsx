"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";

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
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-[22px] shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)] p-8 space-y-6">
        {sent ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <CheckCircle2 className="size-12 text-[#34C759]" />
            <div className="space-y-1">
              <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
                {t("Check your email", "تحقق من بريدك")}
              </h1>
              <p className="text-[15px] text-[#6E6E73]">
                {t(
                  `We sent a password reset link to ${email}`,
                  `أرسلنا رابط إعادة تعيين كلمة المرور إلى ${email}`
                )}
              </p>
            </div>
            <p className="text-[13px] text-[#6E6E73] leading-relaxed">
              {t(
                "Didn't receive it? Check your spam folder or try again.",
                "لم تستلمه؟ تحقق من مجلد الرسائل غير المرغوب فيها أو حاول مجدداً."
              )}
            </p>
            <Link
              href="/sign-in"
              className="text-[14px] text-[#0071E3] hover:text-[#0077ED] transition-colors"
            >
              {t("Back to Sign In", "العودة لتسجيل الدخول")}
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
                {t("Forgot Password?", "نسيت كلمة المرور؟")}
              </h1>
              <p className="text-[15px] text-[#6E6E73]">
                {t(
                  "Enter your email and we'll send you a reset link",
                  "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة التعيين"
                )}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="email">
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
                  className="w-full rounded-xl border border-black/[0.12] bg-black/[0.04] px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] text-white font-normal py-2.5 text-[15px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading
                  ? t("Sending…", "جارٍ الإرسال…")
                  : t("Send Reset Link", "إرسال رابط إعادة التعيين")}
              </button>
            </form>

            <p className="text-center text-[13px] text-[#6E6E73]">
              {t("Remember your password?", "تتذكر كلمة المرور؟")}{" "}
              <Link href="/sign-in" className="text-[#0071E3] hover:text-[#0077ED] font-normal">
                {t("Sign In", "تسجيل الدخول")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
