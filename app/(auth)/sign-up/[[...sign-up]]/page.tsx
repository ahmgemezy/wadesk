"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";

export default function SignUpPage() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [consentWarning, setConsentWarning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setConsentWarning(true);
      return;
    }
    setConsentWarning(false);
    setLoading(true);
    setError(null);
    const name = `${firstName.trim()} ${lastName.trim()}`.trim();
    const { error: err } = await authClient.signUp.email({ name, email, password });
    if (err) {
      setError(err.message ?? t("Sign-up failed", "فشل إنشاء الحساب"));
      setLoading(false);
    } else {
      router.push("/onboarding");
    }
  };

  const handleSocial = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    setError(null);
    const { error: err } = await authClient.signIn.social({ provider, callbackURL: "/onboarding" });
    if (err) {
      setError(err.message ?? t("Sign-up failed", "فشل إنشاء الحساب"));
      setSocialLoading(null);
    }
  };

  const anyLoading = loading || socialLoading !== null;

  return (
    <div className="w-full max-w-sm" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-[22px] shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)] p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
            {t("Create Account", "إنشاء حساب")}
          </h1>
          <p className="text-[15px] text-[#6E6E73]">
            {t("Create your WABDesk account", "أنشئ حسابك في WABDesk")}
          </p>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => handleSocial("google")}
            disabled={anyLoading}
            className="w-full rounded-full bg-white border border-black/12 hover:bg-black/2 active:bg-black/4 text-[#1D1D1F] font-normal py-2.5 text-[15px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {socialLoading === "google" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
            )}
            {t("Sign up with Google", "إنشاء حساب بـ Google")}
          </button>

          <button
            type="button"
            onClick={() => handleSocial("facebook")}
            disabled={anyLoading}
            className="w-full rounded-full bg-[#1877F2] hover:bg-[#166FE5] active:bg-[#1470DE] text-white font-normal py-2.5 text-[15px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {socialLoading === "facebook" ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M13.397 20.997v-8.196h2.765l.411-3.209h-3.176V7.548c0-.926.258-1.56 1.587-1.56h1.684V3.127A22.336 22.336 0 0 0 14.201 3c-2.444 0-4.122 1.492-4.122 4.231v2.355H7.332v3.209h2.753v8.202h3.312z"/>
              </svg>
            )}
            {t("Sign up with Facebook", "إنشاء حساب بـ Facebook")}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-black/12" />
            <span className="text-[13px] text-[#6E6E73]">{t("or", "أو")}</span>
            <div className="flex-1 border-t border-black/12" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="firstName">
                {t("First Name", "الاسم الأول")}
              </label>
              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-black/12 bg-black/4 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
                placeholder={locale === "ar" ? "أحمد" : "Ahmed"}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="lastName">
                {t("Last Name", "اسم العائلة")}
              </label>
              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-black/12 bg-black/4 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
                placeholder={locale === "ar" ? "محمد" : "Mohamed"}
              />
            </div>
          </div>

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
              className="w-full rounded-xl border border-black/12 bg-black/4 px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="password">
              {t("Password", "كلمة المرور")}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                dir="ltr"
                className="w-full rounded-xl border border-black/12 bg-black/4 px-3.5 py-2.5 pe-10 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 end-3 flex items-center text-[#6E6E73] hover:text-[#1D1D1F] transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <p className="text-[12px] text-[#6E6E73]">
              {t("Minimum 8 characters", "8 أحرف على الأقل")}
            </p>
          </div>

          {error && (
            <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Consent checkbox — right above the submit button */}
          <div className="space-y-1.5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => {
                  setConsent(e.target.checked);
                  if (e.target.checked) setConsentWarning(false);
                }}
                className="mt-0.5 size-4 shrink-0 rounded border-black/20 accent-[#0071E3] cursor-pointer"
              />
              <span className="text-[12px] text-[#6E6E73] leading-normal">
                {locale === "ar" ? (
                  <>
                    أوافق على{" "}
                    <Link href="/terms" className="text-[#0071E3] hover:underline" target="_blank">شروط الخدمة</Link>
                    {" "}و{" "}
                    <Link href="/privacy" className="text-[#0071E3] hover:underline" target="_blank">سياسة الخصوصية</Link>
                    {" "}و{" "}
                    <Link href="/cookies" className="text-[#0071E3] hover:underline" target="_blank">سياسة ملفات تعريف الارتباط</Link>
                  </>
                ) : (
                  <>
                    I agree to the{" "}
                    <Link href="/terms" className="text-[#0071E3] hover:underline" target="_blank">Terms of Service</Link>
                    ,{" "}
                    <Link href="/privacy" className="text-[#0071E3] hover:underline" target="_blank">Privacy Policy</Link>
                    , and{" "}
                    <Link href="/cookies" className="text-[#0071E3] hover:underline" target="_blank">Cookie Policy</Link>
                  </>
                )}
              </span>
            </label>
            {consentWarning && (
              <p className="text-[12px] text-[#FF3B30]">
                {t(
                  "Please accept the terms to continue.",
                  "يرجى قبول الشروط والسياسات للمتابعة."
                )}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={anyLoading}
            className="w-full rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] text-white font-normal py-2.5 text-[15px] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            {loading ? t("Creating account…", "جارٍ الإنشاء…") : t("Create Account", "إنشاء حساب")}
          </button>
        </form>

        <p className="text-center text-[13px] text-[#6E6E73]">
          {t("Already have an account?", "لديك حساب بالفعل؟")}{" "}
          <Link href="/sign-in" className="text-[#0071E3] hover:text-[#0077ED] font-normal">
            {t("Sign In", "تسجيل الدخول")}
          </Link>
        </p>
      </div>
    </div>
  );
}
