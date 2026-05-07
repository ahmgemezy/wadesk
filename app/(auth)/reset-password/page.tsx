"use client";

import { useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, Loader2, CheckCircle2, Check, X } from "lucide-react";
import Link from "next/link";
import { useT, useLocale } from "@/lib/i18n/context";

type Strength = "weak" | "medium" | "strong";

function scorePassword(p: string): { strength: Strength; score: number; rules: boolean[] } {
  const rules = [
    p.length >= 8,
    /[A-Z]/.test(p),
    /[0-9]/.test(p),
    /[^A-Za-z0-9]/.test(p),
  ];
  const score = rules.filter(Boolean).length;
  const strength: Strength = score <= 2 ? "weak" : score === 3 ? "medium" : "strong";
  return { strength, score, rules };
}

const STRENGTH_COLOR: Record<Strength, string> = {
  weak: "#FF3B30",
  medium: "#FF9500",
  strong: "#34C759",
};

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const t = useT();
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { strength, score, rules } = useMemo(() => scorePassword(password), [password]);
  const showStrength = password.length > 0;

  const strengthLabel: Record<Strength, string> = {
    weak: t("Weak", "ضعيفة"),
    medium: t("Medium", "متوسطة"),
    strong: t("Strong", "قوية"),
  };

  const ruleLabels = [
    t("At least 8 characters", "8 أحرف على الأقل"),
    t("Uppercase letter (A–Z)", "حرف كبير (A–Z)"),
    t("Number (0–9)", "رقم (0–9)"),
    t("Special character (!@#…)", "رمز خاص (!@#…)"),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (strength === "weak") {
      setError(t("Password is too weak. Please follow the requirements below.", "كلمة المرور ضعيفة جداً. يرجى اتباع المتطلبات أدناه."));
      return;
    }
    if (password !== confirm) {
      setError(t("Passwords do not match", "كلمتا المرور غير متطابقتين"));
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.resetPassword({ newPassword: password, token });
    if (err) {
      setError(err.message ?? t("Something went wrong", "حدث خطأ ما"));
      setLoading(false);
    } else {
      setDone(true);
      setTimeout(() => router.push("/sign-in"), 2500);
    }
  };

  if (!token) {
    return (
      <div className="w-full max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
        <div className="bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-[22px] shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)] p-8 text-center space-y-4">
          <p className="text-[15px] text-[#FF3B30]">
            {t("Invalid or expired reset link.", "رابط إعادة التعيين غير صالح أو منتهي الصلاحية.")}
          </p>
          <Link href="/forgot-password" className="text-[14px] text-[#0071E3] hover:text-[#0077ED]">
            {t("Request a new link", "طلب رابط جديد")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm" dir={isRtl ? "rtl" : "ltr"}>
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-[22px] shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)] p-8 space-y-6">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <CheckCircle2 className="size-12 text-[#34C759]" />
            <div className="space-y-1">
              <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
                {t("Password updated!", "تم تحديث كلمة المرور!")}
              </h1>
              <p className="text-[15px] text-[#6E6E73]">
                {t("Redirecting you to sign in…", "جارٍ توجيهك لتسجيل الدخول…")}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center space-y-1">
              <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
                {t("Set New Password", "تعيين كلمة مرور جديدة")}
              </h1>
              <p className="text-[15px] text-[#6E6E73]">
                {t("Choose a strong password for your account", "اختر كلمة مرور قوية لحسابك")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="password">
                  {t("New Password", "كلمة المرور الجديدة")}
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="w-full rounded-xl border border-black/[0.12] bg-black/[0.04] px-3.5 py-2.5 pe-10 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
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

                {/* Strength bar */}
                {showStrength && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4].map((n) => (
                        <div
                          key={n}
                          className="h-1 flex-1 rounded-full transition-all duration-300"
                          style={{
                            background: n <= score ? STRENGTH_COLOR[strength] : "rgba(0,0,0,0.08)",
                          }}
                        />
                      ))}
                      <span
                        className="text-[12px] font-medium ms-1 transition-colors duration-300"
                        style={{ color: STRENGTH_COLOR[strength] }}
                      >
                        {strengthLabel[strength]}
                      </span>
                    </div>

                    {/* Rule checklist */}
                    <ul className="space-y-1" dir={isRtl ? "rtl" : "ltr"}>
                      {ruleLabels.map((label, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          {rules[i] ? (
                            <Check className="size-3 shrink-0" style={{ color: "#34C759" }} />
                          ) : (
                            <X className="size-3 shrink-0" style={{ color: "#FF3B30" }} />
                          )}
                          <span
                            className="text-[12px] transition-colors duration-200"
                            style={{ color: rules[i] ? "#34C759" : "#6E6E73" }}
                          >
                            {label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="confirm">
                  {t("Confirm Password", "تأكيد كلمة المرور")}
                </label>
                <input
                  id="confirm"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  dir="ltr"
                  className="w-full rounded-xl border border-black/[0.12] bg-black/[0.04] px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-[13px] text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || strength === "weak"}
                className="w-full rounded-full bg-[#0071E3] hover:bg-[#0077ED] active:bg-[#006CD1] text-white font-normal py-2.5 text-[15px] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {loading
                  ? t("Updating…", "جارٍ التحديث…")
                  : t("Update Password", "تحديث كلمة المرور")}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
