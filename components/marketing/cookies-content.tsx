"use client";

import Link from "next/link";
import { useMarketingLocale } from "@/lib/marketing/i18n";

export function CookiesContent() {
  const { locale } = useMarketingLocale();
  if (locale === "ar") return <CookiesAr />;
  return <CookiesEn />;
}

const cookieTable = [
  { name: "__session", provider: "Clerk", purposeAr: "المصادقة وإدارة الجلسة", purposeEn: "Authentication and session management", duration: "Session", categoryAr: "أساسية", categoryEn: "Essential" },
  { name: "__client", provider: "Clerk", purposeAr: "تعريف العميل وربط الجلسة", purposeEn: "Client identification and session binding", duration: "7 days", categoryAr: "أساسية", categoryEn: "Essential" },
  { name: "__client_uat", provider: "Clerk", purposeAr: "التحقق من صحة رمز المصادقة", purposeEn: "Auth token validation", duration: "Session", categoryAr: "أساسية", categoryEn: "Essential" },
  { name: "locale", provider: "WABDesk", purposeAr: "تخزين تفضيل اللغة (عربي/إنجليزي)", purposeEn: "Stores language preference (Arabic/English)", duration: "1 year", categoryAr: "أساسية", categoryEn: "Essential" },
  { name: "klaro", provider: "WABDesk", purposeAr: "تخزين اختيارات الموافقة على ملفات الارتباط", purposeEn: "Stores cookie consent choices", duration: "365 days", categoryAr: "أساسية", categoryEn: "Essential" },
  { name: "_ga", provider: "Google", purposeAr: "تمييز المستخدمين الفريدين (Google Analytics)", purposeEn: "Distinguishes unique users (Google Analytics)", duration: "2 years", categoryAr: "تحليلات", categoryEn: "Analytics" },
  { name: "_ga_<container>", provider: "Google", purposeAr: "الحفاظ على حالة الجلسة في GA4", purposeEn: "Maintains GA4 session state", duration: "2 years", categoryAr: "تحليلات", categoryEn: "Analytics" },
  { name: "_gid", provider: "Google", purposeAr: "تمييز المستخدمين لمدة 24 ساعة", purposeEn: "Distinguishes users (24-hour window)", duration: "24 hours", categoryAr: "تحليلات", categoryEn: "Analytics" },
  { name: "_fbp", provider: "Meta", purposeAr: "تعريف المتصفح لإعلانات فيسبوك", purposeEn: "Browser identification for Facebook ads", duration: "90 days", categoryAr: "تسويق", categoryEn: "Marketing" },
  { name: "_gcl_au", provider: "Google", purposeAr: "تتبع تحويلات إعلانات Google", purposeEn: "Google Ads conversion tracking", duration: "90 days", categoryAr: "تسويق", categoryEn: "Marketing" },
];

function CookiesAr() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          سياسة ملفات تعريف الارتباط
        </h1>
        <p className="text-sm text-muted-foreground">
          <strong>آخر تحديث:</strong> 2 مايو 2026 &nbsp;·&nbsp;{" "}
          <strong>تاريخ السريان:</strong> 2 مايو 2026
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          تستخدم منصة واب ديسك ملفات تعريف الارتباط (Cookies) وتقنيات مشابهة
          لتشغيل خدماتها وتحليل الاستخدام وتحسين تجربتك. توضّح هذه السياسة ما
          نستخدمه ولماذا وكيف يمكنك التحكم في تفضيلاتك.
        </p>
      </div>

      <div className="space-y-10 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-xl font-semibold">
            ١. ما هي ملفات تعريف الارتباط؟
          </h2>
          <p className="text-muted-foreground">
            ملفات تعريف الارتباط (Cookies) هي ملفات نصية صغيرة تُخزَّن على
            جهازك عند زيارتك لموقعنا. تُستخدم لتذكّر تفضيلاتك، والحفاظ على
            جلسات تسجيل الدخول، وفهم كيفية استخدامك للموقع. يمكنك إدارة هذه
            الملفات عبر إعدادات المتصفح أو أداة الموافقة المدمجة في الموقع.
          </p>
          <p className="mt-2 text-muted-foreground">
            نستخدم أيضاً تقنيات مشابهة مثل التخزين المحلي (localStorage) لحفظ
            تفضيل اللغة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            ٢. كيف نستخدم ملفات تعريف الارتباط
          </h2>

          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  الأساسية (مطلوبة)
                </h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  لا يمكن تعطيلها
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                ضرورية لتشغيل المنصة. تشمل ملفات Clerk لجلسة تسجيل الدخول،
                وملف اختيارات الموافقة (klaro)، وملف تفضيل اللغة. بدونها لا
                يمكن تسجيل الدخول أو استخدام لوحة التحكم.
              </p>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  التحليلات (اختيارية)
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  تتطلب موافقتك
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                Google Analytics 4 و Google Tag Manager — تساعدنا في فهم كيفية
                استخدام الزوار للموقع (الصفحات المزارة، مدة الجلسة، نقاط
                الخروج). لا تُحمَّل إلا بعد موافقتك الصريحة، ولا تُستخدم لبناء
                ملفات تعريف إعلانية.
              </p>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  التسويق (اختيارية)
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  تتطلب موافقتك
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                Facebook Pixel و Google Ads — لقياس فعالية حملاتنا الإعلانية.
                لا تُحمَّل إلا بعد موافقتك الصريحة. إذا رفضت، لن يُرسل أي
                بيانات إلى هذه المنصات.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            ٣. قائمة ملفات تعريف الارتباط التفصيلية
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">الاسم</th>
                  <th className="px-3 py-2 text-start font-semibold">
                    المزوّد
                  </th>
                  <th className="px-3 py-2 text-start font-semibold">الغرض</th>
                  <th className="px-3 py-2 text-start font-semibold">
                    المدة
                  </th>
                  <th className="px-3 py-2 text-start font-semibold">
                    الفئة
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cookieTable.map((row) => (
                  <tr key={row.name} className="even:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-foreground">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.provider}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.purposeAr}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground" dir="ltr">
                      {row.duration}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.categoryAr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            ٤. إدارة تفضيلاتك
          </h2>
          <p className="text-muted-foreground">
            لديك أدوات متعددة للتحكم في ملفات تعريف الارتباط:
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-md border p-3">
              <p className="font-semibold text-foreground">
                أداة الموافقة المدمجة (الطريقة المفضّلة)
              </p>
              <p className="mt-1 text-muted-foreground">
                انقر على{" "}
                <button
                  type="button"
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const klaro = (window as any).klaro;
                    if (klaro?.show) klaro.show(undefined, true);
                  }}
                  className="text-primary underline-offset-4 hover:underline cursor-pointer"
                >
                  إعدادات ملفات تعريف الارتباط
                </button>{" "}
                في تذييل الصفحة لفتح لوحة التفضيلات وتعديل اختياراتك في أي
                وقت.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-semibold text-foreground">
                إعدادات المتصفح
              </p>
              <p className="mt-1 text-muted-foreground">
                يمكنك حذف أو منع ملفات تعريف الارتباط عبر إعدادات متصفحك.
                تنبيه: قد يؤثر منع الملفات الأساسية على وظائف المنصة.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-semibold text-foreground">
                أدوات الانسحاب من التحليلات
              </p>
              <p className="mt-1 text-muted-foreground">
                يمكنك تثبيت{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  إضافة Google Analytics Opt-out
                </a>{" "}
                للمتصفح لمنع تتبع Google Analytics حتى لو وافقت على الملفات
                التحليلية.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            ٥. الأطراف الثالثة
          </h2>
          <p className="text-muted-foreground">
            ملفات تعريف ارتباط التحليلات والتسويق تنتمي لأطراف ثالثة. راجع
            سياسات الخصوصية الخاصة بهم لمزيد من التفاصيل:
          </p>
          <ul className="mt-3 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                سياسة خصوصية Google ←
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/privacy/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                سياسة خصوصية Meta (فيسبوك) ←
              </a>
            </li>
            <li>
              <a
                href="https://clerk.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                سياسة خصوصية Clerk ←
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            ٦. تحديثات هذه السياسة
          </h2>
          <p className="text-muted-foreground">
            قد نُحدّث هذه السياسة عند إضافة خدمات تتبع جديدة أو تغيير
            ممارساتنا. سنُخطرك بالتغييرات الجوهرية عبر البريد الإلكتروني أو
            إشعار داخل التطبيق. تاريخ &quot;آخر تحديث&quot; في أعلى الصفحة يُشير
            دائماً إلى آخر مراجعة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٧. التواصل</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground">
              لأي استفسارات حول استخدامنا لملفات تعريف الارتباط، راسلنا على{" "}
              <a
                href="mailto:privacy@wabdesk.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy@wabdesk.com
              </a>
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link
          href="/privacy"
          className="text-primary underline-offset-4 hover:underline"
        >
          سياسة الخصوصية ←
        </Link>
        <Link href="/" className="hover:text-foreground transition-colors">
          → العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}

function CookiesEn() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">
          Cookie Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          <strong>Last Updated:</strong> May 2, 2026 &nbsp;·&nbsp;{" "}
          <strong>Effective Date:</strong> May 2, 2026
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          WABDesk uses cookies and similar technologies to operate its services,
          analyze usage, and improve your experience. This policy explains what
          we use, why, and how you can control your preferences.
        </p>
      </div>

      <div className="space-y-10 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. What Are Cookies?</h2>
          <p className="text-muted-foreground">
            Cookies are small text files stored on your device when you visit
            our site. They are used to remember your preferences, maintain
            sign-in sessions, and understand how you use the site. You can
            manage cookies through your browser settings or the consent tool
            built into the site.
          </p>
          <p className="mt-2 text-muted-foreground">
            We also use similar technologies such as localStorage to save
            language preferences.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            2. How We Use Cookies
          </h2>

          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  Essential (Required)
                </h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  Cannot be disabled
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                Required for the platform to function. Includes Clerk
                authentication session cookies, the consent preferences cookie
                (klaro), and the language preference cookie. Without these,
                sign-in and the dashboard cannot work.
              </p>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  Analytics (Optional)
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Requires your consent
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                Google Analytics 4 and Google Tag Manager — help us understand
                how visitors use the site (pages visited, session duration, exit
                points). Only loaded after your explicit consent. Not used for
                advertising profiling.
              </p>
            </div>

            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">
                  Marketing (Optional)
                </h3>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  Requires your consent
                </span>
              </div>
              <p className="mt-2 text-muted-foreground">
                Facebook Pixel and Google Ads — to measure the effectiveness of
                our advertising campaigns. Only loaded after your explicit
                consent. If you decline, no data is sent to these platforms.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            3. Detailed Cookie List
          </h2>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">Name</th>
                  <th className="px-3 py-2 text-start font-semibold">
                    Provider
                  </th>
                  <th className="px-3 py-2 text-start font-semibold">
                    Purpose
                  </th>
                  <th className="px-3 py-2 text-start font-semibold">
                    Duration
                  </th>
                  <th className="px-3 py-2 text-start font-semibold">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {cookieTable.map((row) => (
                  <tr key={row.name} className="even:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-foreground">
                      {row.name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.provider}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.purposeEn}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.duration}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {row.categoryEn}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            4. Managing Your Preferences
          </h2>
          <p className="text-muted-foreground">
            You have multiple tools to control cookies:
          </p>
          <div className="mt-3 space-y-3">
            <div className="rounded-md border p-3">
              <p className="font-semibold text-foreground">
                Built-in Consent Tool (Preferred)
              </p>
              <p className="mt-1 text-muted-foreground">
                Click{" "}
                <button
                  type="button"
                  onClick={() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const klaro = (window as any).klaro;
                    if (klaro?.show) klaro.show(undefined, true);
                  }}
                  className="text-primary underline-offset-4 hover:underline cursor-pointer"
                >
                  Cookie Settings
                </button>{" "}
                in the page footer to open the preferences panel and change your
                choices at any time.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-semibold text-foreground">
                Browser Settings
              </p>
              <p className="mt-1 text-muted-foreground">
                You can delete or block cookies via your browser settings. Note:
                blocking essential cookies may affect platform functionality.
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="font-semibold text-foreground">
                Analytics Opt-out Tools
              </p>
              <p className="mt-1 text-muted-foreground">
                Install the{" "}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Google Analytics Opt-out Add-on
                </a>{" "}
                to prevent Google Analytics tracking even if you have consented
                to analytics cookies.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">5. Third Parties</h2>
          <p className="text-muted-foreground">
            Analytics and marketing cookies belong to third parties. See their
            privacy policies for full details:
          </p>
          <ul className="mt-3 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Google Privacy Policy →
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/privacy/policy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Meta (Facebook) Privacy Policy →
              </a>
            </li>
            <li>
              <a
                href="https://clerk.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-4 hover:underline"
              >
                Clerk Privacy Policy →
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">
            6. Changes to This Policy
          </h2>
          <p className="text-muted-foreground">
            We may update this policy when we add new tracking services or
            change our practices. We will notify you of material changes by
            email or in-app notification. The &ldquo;Last Updated&rdquo; date at
            the top of this page always reflects the most recent revision.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">7. Contact</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground">
              For any questions about our use of cookies, email us at{" "}
              <a
                href="mailto:privacy@wabdesk.com"
                className="text-primary underline-offset-4 hover:underline"
              >
                privacy@wabdesk.com
              </a>
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link
          href="/privacy"
          className="text-primary underline-offset-4 hover:underline"
        >
          Privacy Policy →
        </Link>
        <Link href="/" className="hover:text-foreground transition-colors">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}
