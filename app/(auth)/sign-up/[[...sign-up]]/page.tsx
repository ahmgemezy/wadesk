"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

export default function SignUpPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await authClient.signUp.email({ name, email, password });
    if (err) {
      setError(err.message ?? "فشل إنشاء الحساب / Sign-up failed");
      setLoading(false);
    } else {
      router.push("/onboarding");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white/90 backdrop-blur-xl border border-black/[0.08] rounded-[22px] shadow-[0_2px_6px_rgba(0,0,0,0.04),0_10px_30px_rgba(0,0,0,0.08)] p-8 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-[22px] font-semibold tracking-[-0.4px] text-[#1D1D1F]">
            إنشاء حساب
          </h1>
          <p className="text-[15px] text-[#6E6E73]">Create your WABDesk account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="name">
              الاسم / Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-black/[0.12] bg-black/[0.04] px-3.5 py-2.5 text-[15px] text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:ring-2 focus:ring-[#0071E3]/20 transition-all placeholder:text-[#6E6E73]"
              placeholder="Ahmed Mohamed"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="email">
              البريد الإلكتروني / Email
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

          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-[#1D1D1F]" htmlFor="password">
              كلمة المرور / Password
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
            <p className="text-[12px] text-[#6E6E73]">8 أحرف على الأقل / Minimum 8 characters</p>
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
            {loading ? "جارٍ الإنشاء..." : "إنشاء حساب / Create Account"}
          </button>
        </form>

        <p className="text-center text-[13px] text-[#6E6E73]">
          لديك حساب بالفعل؟{" "}
          <Link href="/sign-in" className="text-[#0071E3] hover:text-[#0077ED] font-normal">
            تسجيل الدخول / Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
