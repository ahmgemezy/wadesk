"use client";

import Link from "next/link";
import { useMarketingLocale } from "@/lib/marketing/i18n";

export function PrivacyContent() {
  const { locale } = useMarketingLocale();
  if (locale === "ar") return <PrivacyAr />;
  return <PrivacyEn />;
}

function PrivacyAr() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">سياسة الخصوصية</h1>
        <p className="text-sm text-muted-foreground">
          <strong>آخر تحديث:</strong> 28 أبريل 2026 &nbsp;·&nbsp;{" "}
          <strong>تاريخ السريان:</strong> 28 أبريل 2026
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          تُشغّل شركة واب ديسك (&quot;واب ديسك&quot; أو &quot;نحن&quot; أو &quot;لنا&quot;) منصةً متعددة الوكلاء لخدمة عملاء واتساب للأعمال. توضّح سياسة الخصوصية هذه كيف نجمع بياناتك الشخصية ونستخدمها ونخزّنها ونشاركها ونحميها عند استخدامك لمنصتنا على{" "}
          <span className="font-medium">wabdesk.com</span>.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          تتوافق هذه السياسة مع اللائحة الأوروبية العامة لحماية البيانات (GDPR)، وقانون خصوصية المستهلك في كاليفورنيا (CCPA/CPRA)، وقانون حماية البيانات البرازيلي (LGPD)، ونظام حماية البيانات الشخصية السعودي (PDPL)، والقانون الاتحادي الإماراتي رقم 45 لسنة 2021، والقانون المصري رقم 151 لسنة 2020، والقانون الكندي (PIPEDA)، وغيرها من قوانين حماية البيانات المعمول بها عالمياً.
        </p>
      </div>

      <div className="space-y-10 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-xl font-semibold">١. من نحن وكيفية التواصل معنا</h2>
          <p className="text-muted-foreground">
            <strong className="text-foreground">متحكم في البيانات:</strong> واب ديسك (تشغّله شركة [الاسم القانوني للشركة]، المسجلة في [الدولة/الجهة القضائية])
          </p>
          <p className="text-muted-foreground mt-2">
            <strong className="text-foreground">العنوان المسجل:</strong> [عنوان الشركة]
          </p>
          <div className="mt-3 rounded-md border bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-muted-foreground"><strong className="text-foreground">استفسارات الخصوصية وطلبات البيانات:</strong> privacy@wabdesk.com</p>
            <p className="text-muted-foreground"><strong className="text-foreground">مشكلات الأمان:</strong> security@wabdesk.com</p>
            <p className="text-muted-foreground"><strong className="text-foreground">الدعم العام:</strong> support@wabdesk.com</p>
            <p className="text-muted-foreground"><strong className="text-foreground">وقت الاستجابة:</strong> خلال 30 يوماً من أي طلب لصاحب البيانات (وفقاً للمادة 12 من GDPR)</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٢. نطاق هذه السياسة</h2>
          <p className="text-muted-foreground">تسري سياسة الخصوصية هذه على:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">المستأجرون (Tenants)</strong> — الشركات المشتركة في واب ديسك ومستخدمو المشرف (Admin) لديهم</li>
            <li><strong className="text-foreground">الوكلاء (Agents)</strong> — أعضاء الفريق الذين يضيفهم المشرف لإدارة المحادثات</li>
            <li><strong className="text-foreground">جهات الاتصال (Contacts)</strong> — العملاء النهائيون الذين تُعالَج رسائل واتساب الخاصة بهم عبر واب ديسك (بوصفنا معالجاً نيابةً عن المستأجر)</li>
            <li>زوار موقع wabdesk.com</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            <strong className="text-foreground">المتحكم مقابل المعالج:</strong> فيما يخص البيانات الشخصية لجهات الاتصال (عملاؤك)، يعمل واب ديسك بوصفه <strong className="text-foreground">معالج بيانات</strong> وفق تعليماتك، وأنت (المستأجر) تُعدّ <strong className="text-foreground">متحكماً في البيانات</strong>. أما بيانات الحساب والفواتير للمستأجرين والوكلاء، فواب ديسك هو المتحكم فيها.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٣. المعلومات التي نجمعها</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">٣.١ بيانات الحساب والتسجيل</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>الاسم الكامل وعنوان البريد الإلكتروني</li>
            <li>كلمة المرور (مخزّنة كقيمة مجزّأة تشفيرية أحادية الاتجاه؛ لا نطّلع أبداً على كلمات المرور بصيغتها الصريحة)</li>
            <li>اسم المؤسسة / الشركة</li>
            <li>رقم الهاتف (اختياري؛ يُستخدم لاستعادة الحساب أو ميزات الدعوة عبر واتساب)</li>
            <li>عنوان IP ومعلومات الجهاز عند التسجيل</li>
            <li>الصورة الشخصية (اختيارية)</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٣.٢ بيانات حساب واتساب للأعمال (WABA)</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>معرّف حساب واتساب للأعمال (WABA ID) ومعرّفات أرقام الهاتف الصادرة عن ميتا</li>
            <li>رموز وصول ميتا — مشفّرة في حالة السكون باستخدام AES-256؛ لا تُعرض أبداً على جانب العميل ولا تُسجَّل في السجلات</li>
            <li>معلومات ملف تعريف واتساب للأعمال (الاسم المعروض، الوصف، العنوان، الفئة، الموقع الإلكتروني)</li>
            <li><strong className="text-foreground">محتوى الرسائل:</strong> النصوص والصور والمستندات والرسائل الصوتية وغيرها من الوسائط المتبادلة بين وكلائك وعملائك، حصراً لتقديم خدمة البريد الوارد</li>
            <li>بيانات وصف الرسائل: الطوابع الزمنية، وحالة التسليم/القراءة، ومعرّفات الرسائل، وأرقام هواتف العملاء</li>
            <li>أرقام هواتف العملاء (جهات الاتصال) بتنسيق E.164 وأسماء العرض على واتساب</li>
          </ul>
          <div className="mt-3 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3">
            <p className="text-muted-foreground">
              <strong className="text-foreground">تنبيه مهم:</strong> يعالج واب ديسك محتوى رسائل واتساب حصراً لتقديم خدمة البريد الوارد لدعم العملاء. لا نستخدم محتوى الرسائل <strong className="text-foreground">بأي حال</strong> لأغراض الإعلانات أو بناء ملفات تعريف المستخدمين لأغراض إعلانية أو بيعه لأطراف ثالثة — تماشياً الكامل مع{" "}
              <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">سياسة واتساب للأعمال الخاصة بميتا</a>.
            </p>
          </div>

          <h3 className="mb-2 mt-4 font-semibold text-base">٣.٣ بيانات الدفع</h3>
          <p className="text-muted-foreground">
            لا <strong className="text-foreground">نخزّن</strong> تفاصيل بطاقات الدفع. تُعالَج المدفوعات من قِبل <strong className="text-foreground">شركة Paddle.com Market Limited (&quot;Paddle&quot;)</strong>، وهي تاجر المدفوعات الرسمي لدينا، وفق معايير PCI-DSS. نتلقى من Paddle فقط: حالة الاشتراك، والخطة المختارة، ومعرّف عميل Paddle، ومعرّفات مرجع المعاملات.
          </p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٣.٤ بيانات الاستخدام والبيانات التقنية</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>الصفحات التي تمت زيارتها والميزات المستخدمة داخل واب ديسك</li>
            <li>عدد المحادثات ومقاييس وقت الاستجابة وإحصائيات أداء الوكلاء</li>
            <li>طوابع زمنية لتسجيل الدخول ومدة الجلسة</li>
            <li>نوع المتصفح، ونظام التشغيل، ونوع الجهاز، ودقة الشاشة</li>
            <li>URL المُحيل والموقع التقريبي المشتق من عنوان IP</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٣.٥ المراسلات مع واب ديسك</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>تذاكر الدعم والبريد الإلكتروني أو الرسائل التي ترسلها إلينا</li>
            <li>التعليقات وطلبات الميزات</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٤. الأسس القانونية للمعالجة (GDPR — مستخدمو الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية)</h2>
          <p className="mb-3 text-muted-foreground">بالنسبة للمستخدمين في الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية، نعالج البيانات الشخصية وفق الأسس القانونية التالية بموجب المادة 6 من GDPR:</p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-start font-semibold">نشاط المعالجة</th>
                  <th className="px-4 py-2 text-start font-semibold">الأساس القانوني</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["إنشاء الحساب وإدارته", "تنفيذ العقد (المادة 6(1)(ب))"],
                  ["تقديم خدمة البريد الوارد عبر واتساب", "تنفيذ العقد (المادة 6(1)(ب))"],
                  ["معالجة المدفوعات والفواتير", "تنفيذ العقد (المادة 6(1)(ب))"],
                  ["رسائل البريد الإلكتروني التعاملية (الدعوات، الإيصالات، إعادة التعيين)", "تنفيذ العقد (المادة 6(1)(ب))"],
                  ["مراقبة الأمان ومنع الاحتيال", "المصالح المشروعة (المادة 6(1)(و))"],
                  ["تحليلات المنصة وتحسينها", "المصالح المشروعة (المادة 6(1)(و))"],
                  ["الاتصالات التسويقية (بموافقة مسبقة فقط)", "الموافقة (المادة 6(1)(أ))"],
                  ["السجلات الضريبية والامتثال القانوني", "الالتزام القانوني (المادة 6(1)(ج))"],
                ].map(([activity, basis]) => (
                  <tr key={activity} className="even:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{activity}</td>
                    <td className="px-4 py-2 text-muted-foreground">{basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٥. كيف نستخدم معلوماتك</h2>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>إنشاء حسابك في واب ديسك والتحقق منه وإدارته</li>
            <li>تقديم البريد الوارد متعدد الوكلاء عبر واتساب وجميع الميزات المرتبطة به</li>
            <li>معالجة المدفوعات وإدارة اشتراكك عبر Paddle</li>
            <li>إرسال الاتصالات التعاملية: التحقق من الحساب، وإعادة تعيين كلمة المرور، وإيصالات الفواتير، ودعوات الوكلاء، وإشعارات تغيير الخطة</li>
            <li>إرسال تحديثات المنتج وإعلانات الميزات — يمكنك إلغاء الاشتراك في أي وقت عبر إعدادات الحساب أو رابط إلغاء الاشتراك في أي بريد إلكتروني</li>
            <li>تقديم دعم العملاء والرد على الاستفسارات</li>
            <li>مراقبة أمان المنصة واكتشاف الإساءة ومنع الاحتيال</li>
            <li>الامتثال للالتزامات القانونية بما في ذلك الإقرارات الضريبية وطلبات جهات إنفاذ القانون</li>
            <li>تحسين أداء المنصة وموثوقيتها وتطوير ميزات جديدة (تحليلات مجمّعة ومجهولة الهوية)</li>
            <li>تطبيق شروط الخدمة وسياسة الاستخدام المقبول</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٦. مزودو الخدمات الخارجيون — مشاركة البيانات</h2>
          <p className="mb-3 text-muted-foreground">
            نشارك البيانات الشخصية فقط مع مزودي الخدمات التاليين، المرتبطين جميعاً باتفاقيات معالجة بيانات (DPA) مناسبة وضمانات تعاقدية. لا <strong className="text-foreground">نبيع أو نؤجّر أو نتاجر</strong> بالبيانات الشخصية لأي طرف ثالث لأغراض إعلانية أو تسويقية.
          </p>
          {[
            {
              name: "شركة ميتا (واتساب Business Cloud API)",
              data: "محتوى الرسائل، بيانات وصف الرسائل، معرّف WABA، معرّفات أرقام الهاتف، أرقام هواتف جهات الاتصال",
              purpose: "تسليم رسائل واتساب واستقبالها — الوظيفة الأساسية للخدمة",
              privacy: "https://www.whatsapp.com/legal/privacy-policy/",
              note: "ميتا هي متحكمة مستقلة في بيانات منصة واتساب. باستخدامك واب ديسك، أنت وعملاؤك تخضعون أيضاً لسياسات ميتا.",
            },
            {
              name: "Paddle.com Market Limited",
              data: "الاسم، البريد الإلكتروني، عنوان الفواتير، تفاصيل الاشتراك",
              purpose: "معالجة المدفوعات وإدارة الاشتراكات (تاجر المدفوعات الرسمي)",
              privacy: "https://www.paddle.com/legal/privacy",
              note: "تتحكم Paddle باستقلالية في بيانات بطاقات الدفع وفق معايير PCI-DSS. لا نتلقى أرقام البطاقات ولا نخزّنها.",
            },
            {
              name: "Clerk, Inc.",
              data: "الاسم، البريد الإلكتروني، بيانات اعتماد الحساب (مجزّأة)، رموز الجلسة، بيانات عضوية المؤسسة",
              purpose: "مصادقة المستخدمين وإدارة المؤسسات متعددة المستأجرين",
              privacy: "https://clerk.com/privacy",
              note: null,
            },
            {
              name: "Convex, Inc.",
              data: "جميع بيانات التطبيق: المحادثات، جهات الاتصال، بيانات الوكلاء، الإعدادات، القوالب",
              purpose: "قاعدة البيانات في الوقت الفعلي والبنية التحتية للخلفية بدون خادم (البيانات مخزّنة على خوادم Convex)",
              privacy: "https://www.convex.dev/privacy",
              note: null,
            },
            {
              name: "Vercel, Inc.",
              data: "سجلات حركة الويب، بيانات وصف الطلبات، عناوين IP",
              purpose: "استضافة ونشر تطبيق واب ديسك الإلكتروني",
              privacy: "https://vercel.com/legal/privacy-policy",
              note: null,
            },
            {
              name: "Resend",
              data: "الاسم، البريد الإلكتروني، محتوى البريد الإلكتروني (التعاملي فقط)",
              purpose: "تسليم البريد الإلكتروني التعاملي: دعوات الوكلاء، إعادة تعيين كلمة المرور، إشعارات الفواتير",
              privacy: "https://resend.com/legal/privacy-policy",
              note: null,
            },
            {
              name: "Google LLC",
              data: "طلبات الخطوط عبر Google Fonts CDN (قد تتضمن عنوان IP وفق سلوك المتصفح)",
              purpose: "عرض الخطوط (خطا Cairo وTajawal العربيان)",
              privacy: "https://policies.google.com/privacy",
              note: "نستضيف الخطوط مباشرةً كلما أمكن للحد من التعرض للبيانات.",
            },
          ].map((provider) => (
            <div key={provider.name} className="mt-4 rounded-md border p-4">
              <p className="font-semibold text-foreground">{provider.name}</p>
              <p className="mt-1 text-muted-foreground"><strong className="text-foreground">البيانات المشتركة:</strong> {provider.data}</p>
              <p className="mt-1 text-muted-foreground"><strong className="text-foreground">الغرض:</strong> {provider.purpose}</p>
              <a href={provider.privacy} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-primary underline-offset-4 hover:underline">سياسة الخصوصية ←</a>
              {provider.note && <p className="mt-2 text-xs text-muted-foreground italic">{provider.note}</p>}
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٧. نقل البيانات الدولي</h2>
          <p className="text-muted-foreground">يخدم واب ديسك مستخدمين حول العالم. قد تُعالَج بياناتك في دول خارج بلد إقامتك، بما في ذلك الولايات المتحدة الأمريكية والمنطقة الاقتصادية الأوروبية. نطبّق ضمانات مناسبة لجميع عمليات النقل عبر الحدود:</p>
          <ul className="mt-3 list-disc space-y-2 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية:</strong> تُحمى عمليات النقل بالبنود التعاقدية القياسية (SCCs) المعتمدة من المفوضية الأوروبية (القرار 2021/914)، مصحوبةً بتقييمات أثر النقل حيثما لزم.</li>
            <li><strong className="text-foreground">المملكة العربية السعودية (المادة 16 من PDPL):</strong> تُحمى عمليات النقل عبر الحدود إلى الدول غير الحائزة على قرار كفاية من خلال بنود تعاقدية تضمن مستوى حماية مكافئاً لمتطلبات PDPL، بإشراف الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA).</li>
            <li><strong className="text-foreground">الإمارات العربية المتحدة (المادة 26 من القانون الاتحادي 45/2021):</strong> تمتثل عمليات النقل الدولية لمتطلبات حماية البيانات الإماراتية، بما في ذلك تقييمات الكفاية والضمانات التعاقدية.</li>
            <li><strong className="text-foreground">البرازيل (المادة 33 من LGPD):</strong> تخضع عمليات النقل للبنود التعاقدية القياسية أو تستند إلى قرارات كفاية معترف بها من هيئة حماية البيانات البرازيلية (ANPD).</li>
            <li><strong className="text-foreground">مصر (القانون 151/2020):</strong> نمتثل لمتطلبات حماية البيانات المصرية، بما يشمل الحصول على الموافقات اللازمة لنقل البيانات عبر الحدود من الجهة الوطنية لتنظيم الاتصالات حيثما طُلب ذلك.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٨. الاحتفاظ بالبيانات</h2>
          <p className="mb-3 text-muted-foreground">نحتفظ بالبيانات الشخصية فقط طالما كان ذلك ضرورياً للأغراض الموضحة في هذه السياسة أو ما يقتضيه القانون:</p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-start font-semibold">نوع البيانات</th>
                  <th className="px-4 py-2 text-start font-semibold">مدة الاحتفاظ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["بيانات الحساب (الاسم، البريد الإلكتروني، المؤسسة)", "مدة الاشتراك + 30 يوماً بعد طلب حذف الحساب"],
                  ["محادثات ورسائل واتساب", "مدة الاشتراك + 30 يوماً بعد الإلغاء"],
                  ["ملفات تعريف جهات الاتصال", "مدة الاشتراك + 30 يوماً بعد الإلغاء"],
                  ["سجلات الفواتير والمعاملات", "7 سنوات (التزام ضريبي/قانوني)"],
                  ["اتصالات الدعم", "3 سنوات"],
                  ["سجلات الخوادم والوصول", "12 شهراً"],
                  ["بيانات النسخ الاحتياطي", "90 يوماً بعد حذف البيانات"],
                  ["التحليلات المجهولة/المجمّعة", "إلى أجل غير مسمى (لا تُحتفظ ببيانات شخصية)"],
                ].map(([type, period]) => (
                  <tr key={type} className="even:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{type}</td>
                    <td className="px-4 py-2 text-muted-foreground">{period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-muted-foreground">
            بعد إلغاء اشتراك المستأجر، تظل بياناته (المحادثات، جهات الاتصال، الإعدادات) متاحةً لمدة <strong className="text-foreground">30 يوماً</strong> قبل الحذف النهائي. تُحتفظ بسجلات الفواتير لفترة أطول وفاءً لمتطلبات السلطات الضريبية في الولايات القضائية المعنية.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٩. حقوقك في الخصوصية</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.١ مستخدمو الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية — حقوق GDPR</h3>
          <p className="text-muted-foreground">بموجب المواد 15–22 من GDPR، يحق لك:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">الوصول (المادة 15):</strong> طلب نسخة من بياناتك الشخصية</li>
            <li><strong className="text-foreground">التصحيح (المادة 16):</strong> تصحيح البيانات غير الدقيقة أو الناقصة</li>
            <li><strong className="text-foreground">المحو / &quot;الحق في النسيان&quot; (المادة 17):</strong> طلب حذف بياناتك الشخصية (مع مراعاة التزامات الاحتفاظ القانونية)</li>
            <li><strong className="text-foreground">التقييد (المادة 18):</strong> الحد من معالجتنا لبياناتك</li>
            <li><strong className="text-foreground">قابلية النقل (المادة 20):</strong> استلام بياناتك بتنسيق منظم وقابل للقراءة آلياً (JSON/CSV عبر ميزة تصدير البيانات لدينا)</li>
            <li><strong className="text-foreground">الاعتراض (المادة 21):</strong> الاعتراض على المعالجة القائمة على المصالح المشروعة</li>
            <li><strong className="text-foreground">سحب الموافقة (المادة 7):</strong> سحب موافقتك في أي وقت حيثما كانت المعالجة قائمة على الموافقة</li>
            <li><strong className="text-foreground">تقديم شكوى:</strong> تقديم شكوى إلى هيئة حماية البيانات الوطنية المختصة (مثل CNIL في فرنسا، ICO في المملكة المتحدة، BfDI في ألمانيا)</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٢ مستخدمو كاليفورنيا — حقوق CCPA/CPRA</h3>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>معرفة المعلومات الشخصية التي نجمعها ونستخدمها ونفصح عنها أو نشاركها</li>
            <li>حذف المعلومات الشخصية التي نحتفظ بها عنك</li>
            <li>تصحيح المعلومات الشخصية غير الدقيقة</li>
            <li>الانسحاب من بيع المعلومات الشخصية أو مشاركتها — <strong className="text-foreground">ملاحظة: لا نبيع المعلومات الشخصية</strong></li>
            <li>تقييد استخدام ومشاركة المعلومات الشخصية الحساسة</li>
            <li>عدم التمييز عند ممارسة حقوقك</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٣ مستخدمو المملكة العربية السعودية — PDPL</h3>
          <p className="text-muted-foreground">بموجب نظام حماية البيانات الشخصية السعودي (المرسوم الملكي رقم م/19، 1443هـ/2021م)، يحق لك:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>الوصول إلى بياناتك الشخصية ومعرفة غرض معالجتها</li>
            <li>تصحيح أو تحديث البيانات غير الدقيقة أو الناقصة</li>
            <li>طلب حذف البيانات التي لم تعد هناك حاجة إليها (مع مراعاة التزامات الاحتفاظ القانونية)</li>
            <li>سحب الموافقة حيثما كانت المعالجة قائمة على الموافقة</li>
            <li>الاعتراض على المعالجة في ظروف معينة</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٤ مستخدمو الإمارات — القانون الاتحادي رقم 45 لسنة 2021</h3>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>الوصول إلى بياناتك الشخصية والحصول على نسخة منها</li>
            <li>تصحيح البيانات غير الدقيقة أو القديمة</li>
            <li>طلب إتلاف البيانات غير الضرورية لغرضها الأصلي</li>
            <li>الاعتراض على المعالجة في ظروف معينة</li>
            <li>قابلية نقل البيانات حيثما كان ذلك ممكناً تقنياً</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٥ المستخدمون البرازيليون — LGPD</h3>
          <p className="text-muted-foreground">بموجب قانون حماية البيانات البرازيلي (LGPD، القانون رقم 13,709/2018)، تتمتع بحقوق التأكيد والوصول والتصحيح وإخفاء الهوية وقابلية النقل والحذف والحصول على معلومات حول المشاركة وسحب الموافقة.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٦ المستخدمون المصريون — القانون 151/2020</h3>
          <p className="text-muted-foreground">يتمتع أصحاب البيانات المصريون بحقوق الوصول والتصحيح والحذف وتقييد المعالجة بموجب قانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.</p>

          <div className="mt-4 rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground">
              <strong className="text-foreground">لممارسة أي من الحقوق المذكورة أعلاه:</strong> راسلنا على{" "}
              <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>{" "}
              أو قدّم طلباً من صفحة الإعدادات ← البيانات والخصوصية في حسابك. سنرد خلال 30 يوماً. قد نحتاج إلى التحقق من هويتك قبل معالجة طلبك.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٠. ملفات تعريف الارتباط وتقنيات التتبع</h2>
          <p className="text-muted-foreground">نستخدم الفئات التالية من ملفات تعريف الارتباط:</p>
          <div className="mt-3 space-y-3">
            {[
              {
                name: "ملفات تعريف الارتباط الضرورية",
                desc: "مطلوبة لمصادقة المنصة وأمانها (رموز الجلسة، حماية CSRF). لا يمكن تعطيلها — لا تعمل المنصة بدونها.",
                canOptOut: false,
              },
              {
                name: "ملفات تعريف الارتباط التحليلية",
                desc: "تُستخدم لفهم كيفية تفاعل المستخدمين مع واب ديسك (الصفحات المزارة، استخدام الميزات، مدة الجلسة). تُستخدم حصراً لتحسين المنصة.",
                canOptOut: true,
              },
              {
                name: "ملفات تعريف الارتباط التفضيلية",
                desc: "تخزّن تفضيلات واجهة المستخدم مثل اختيار اللغة (العربية/الإنجليزية) وحالة الشريط الجانبي وإعدادات التخصيص الأخرى.",
                canOptOut: true,
              },
            ].map((cookie) => (
              <div key={cookie.name} className="rounded-md border p-3">
                <p className="font-semibold text-foreground">{cookie.name}</p>
                <p className="mt-1 text-muted-foreground">{cookie.desc}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <strong>إمكانية الانسحاب:</strong>{" "}
                  {cookie.canOptOut ? "نعم — عبر إعدادات المتصفح أو تفضيلات الحساب" : "لا — ضرورية لتشغيل الخدمة"}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-muted-foreground">لا <strong className="text-foreground">نستخدم</strong> ملفات تعريف ارتباط إعلانية تابعة لجهات خارجية أو تقنيات تتبع سلوكي عبر المواقع.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١١. أمان البيانات</h2>
          <p className="text-muted-foreground">نطبّق تدابير أمنية على مستوى معايير الصناعة والمتطلبات التنظيمية:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>تشفير TLS 1.2+ لجميع البيانات أثناء النقل</li>
            <li>تشفير AES-256 للبيانات الحساسة في حالة السكون (رموز وصول ميتا، مفاتيح API)</li>
            <li>رموز وصول ميتا لا تُخزَّن أبداً بصيغة نص عادي، ولا تُسجَّل في السجلات، ولا تُعرض على جانب العميل</li>
            <li>عزل صارم للمستأجرين يُطبَّق على مستوى قاعدة البيانات — الوصول إلى بيانات مستأجر آخر مستحيل هيكلياً</li>
            <li>التحقق من توقيع Webhook لجميع تطلعات Meta الواردة (HMAC-SHA256)</li>
            <li>التحكم في الوصول القائم على الأدوار (مشرف / مراقب / وكيل) يُطبَّق على جانب الخادم</li>
            <li>أرقام الهواتف مخزّنة بتنسيق E.164 فقط؛ لا تخزين نصي حر لأرقام الهواتف</li>
            <li>تجزئة كلمات المرور باستخدام معايير الصناعة bcrypt (عبر Clerk)</li>
            <li>مراجعات أمنية دورية ومراجعات التبعيات</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            في حال وقوع اختراق للبيانات يُشكّل خطراً على حقوقك وحرياتك، سنُخطر المستخدمين المتضررين والسلطات الرقابية المعنية خلال <strong className="text-foreground">72 ساعة</strong> من علمنا بالأمر، وفقاً للمادة 33 من GDPR والقوانين المعادلة.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٢. بيانات واتساب للأعمال — إشعار خاص</h2>
          <p className="text-muted-foreground">باستخدامك واب ديسك، فأنت تُقرّ بما يلي:</p>
          <ul className="mt-2 list-disc space-y-2 ps-6 text-muted-foreground">
            <li>يتكامل واب ديسك مع <strong className="text-foreground">واتساب Business Cloud API من ميتا</strong>. تمر جميع رسائل واتساب عبر بنية تحتية ميتا، وتعالج ميتا هذه البيانات بشكل مستقل وفق سياساتها الخاصة.</li>
            <li>أنت (المستأجر) <strong className="text-foreground">المتحكم في البيانات</strong> فيما يخص البيانات الشخصية لعملائك (جهات الاتصال). يعالجها واب ديسك فقط وفق تعليماتك، بوصفه معالج بيانات لك.</li>
            <li>أنت مسؤول عن الحصول على أي موافقات مطلوبة قانوناً من عملائك لرسائل واتساب ومعالجة البيانات في ولايتك القضائية.</li>
            <li>أنت مسؤول عن الامتثال لـ<a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">سياسة واتساب للأعمال من ميتا</a> فيما يخص الاستخدام المقبول لمنصة واتساب وإرشادات الرسائل.</li>
            <li>لا يستخدم واب ديسك محتوى رسائل واتساب لتدريب نماذج الذكاء الاصطناعي أو بناء ملفات تعريف إعلانية أو لأي غرض آخر غير تقديم خدمة البريد الوارد التي اشتركت فيها.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٣. خصوصية الأطفال</h2>
          <p className="text-muted-foreground">
            واب ديسك منصة من شركة إلى شركة (B2B) غير موجّهة للأفراد دون سن <strong className="text-foreground">18</strong> عاماً. لا نجمع بيانات شخصية للقاصرين عن سابق علم ودراية. إذا اكتشفنا أن قاصراً قدّم بيانات شخصية إلينا، سنحذفها فوراً. إذا كنت تعتقد أن بيانات قاصر قُدِّمت إلى منصتنا، يُرجى التواصل معنا على{" "}
            <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٤. التغييرات على سياسة الخصوصية هذه</h2>
          <p className="text-muted-foreground">قد نُحدّث سياسة الخصوصية هذه من وقت لآخر لتعكس التغييرات في ممارساتنا أو المتطلبات القانونية. سنُخطرك بالتغييرات الجوهرية عبر:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>البريد الإلكتروني على العنوان المسجّل في حسابك (قبل 14 يوماً على الأقل من سريان التغييرات)</li>
            <li>إشعار داخل التطبيق في واب ديسك</li>
            <li>تحديث تاريخ &quot;آخر تحديث&quot; في أعلى هذه الصفحة</li>
          </ul>
          <p className="mt-3 text-muted-foreground">بالنسبة للتغييرات الجوهرية التي تؤثر على مستخدمي الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية، سنطلب موافقة جديدة حيثما اشترط ذلك GDPR. استمرارك في استخدام واب ديسك بعد تاريخ السريان يُعدّ قبولاً للسياسة المحدّثة.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٥. التواصل وطلبات البيانات</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-4 space-y-2">
            <p className="text-muted-foreground"><strong className="text-foreground">استفسارات الخصوصية وطلبات أصحاب البيانات:</strong>{" "}<a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">الإفصاح عن مشكلات الأمان:</strong>{" "}<a href="mailto:security@wabdesk.com" className="text-primary underline-offset-4 hover:underline">security@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">العنوان البريدي:</strong> [الاسم القانوني للشركة]، [العنوان الكامل]</p>
            <p className="text-muted-foreground"><strong className="text-foreground">وقت الاستجابة:</strong> خلال 30 يوماً من أي طلب موثّق لصاحب البيانات</p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link href="/terms" className="text-primary underline-offset-4 hover:underline">شروط الخدمة ←</Link>
        <Link href="/" className="hover:text-foreground transition-colors">→ العودة إلى الرئيسية</Link>
      </div>
    </div>
  );
}

function PrivacyEn() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">
          <strong>Last Updated:</strong> April 28, 2026 &nbsp;·&nbsp;{" "}
          <strong>Effective Date:</strong> April 28, 2026
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          WABDesk (&ldquo;WABDesk,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates a WhatsApp Business API multi-agent customer support platform. This Privacy Policy explains how we collect, use, store, share, and protect your personal data when you use our platform at{" "}
          <span className="font-medium">wabdesk.com</span>.
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          This policy complies with the EU General Data Protection Regulation (GDPR), California Consumer Privacy Act (CCPA/CPRA), Brazil&rsquo;s LGPD, Saudi Arabia&rsquo;s PDPL, UAE Federal Law No. 45 of 2021, Egyptian Law No. 151 of 2020, Canada&rsquo;s PIPEDA, and other applicable global data protection laws.
        </p>
      </div>

      <div className="space-y-10 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. Who We Are &amp; How to Contact Us</h2>
          <p className="text-muted-foreground"><strong className="text-foreground">Data Controller:</strong> WABDesk (operated by [Company Legal Name], registered in [Jurisdiction])</p>
          <p className="text-muted-foreground mt-2"><strong className="text-foreground">Registered Address:</strong> [Company Address]</p>
          <div className="mt-3 rounded-md border bg-muted/30 px-4 py-3 space-y-1">
            <p className="text-muted-foreground"><strong className="text-foreground">Privacy &amp; Data Requests:</strong> privacy@wabdesk.com</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Security Issues:</strong> security@wabdesk.com</p>
            <p className="text-muted-foreground"><strong className="text-foreground">General Support:</strong> support@wabdesk.com</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Response Time:</strong> Within 30 days of any data subject request (GDPR Art. 12 compliant)</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">2. Scope of This Policy</h2>
          <p className="text-muted-foreground">This Privacy Policy applies to:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">Tenants</strong> — businesses that subscribe to WABDesk and their Admin users</li>
            <li><strong className="text-foreground">Agents</strong> — team members added by a Tenant Admin to manage conversations</li>
            <li><strong className="text-foreground">Contacts</strong> — end customers whose WhatsApp messages are handled through WABDesk (processed on behalf of the Tenant)</li>
            <li>Visitors to wabdesk.com</li>
          </ul>
          <p className="mt-3 text-muted-foreground">
            <strong className="text-foreground">Controller vs. Processor:</strong> For personal data of Contacts (your customers), WABDesk acts as a <strong className="text-foreground">Data Processor</strong> on your instructions, and you (the Tenant) are the <strong className="text-foreground">Data Controller</strong>. For account and billing data of Tenants and Agents, WABDesk is the Data Controller.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">3. Information We Collect</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">3.1 Account &amp; Registration Data</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Full name and email address</li>
            <li>Password (stored as a one-way cryptographic hash; we never see plaintext passwords)</li>
            <li>Organization / company name</li>
            <li>Phone number (optional; used for account recovery or WhatsApp invite features)</li>
            <li>IP address and device information at sign-up</li>
            <li>Profile photo (optional)</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">3.2 WhatsApp Business Account (WABA) Data</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>WhatsApp Business Account ID (WABA ID) and phone number IDs assigned by Meta</li>
            <li>Meta access tokens — encrypted at rest using AES-256; never exposed client-side or logged</li>
            <li>WhatsApp Business profile information (display name, description, address, category, website)</li>
            <li><strong className="text-foreground">Message content:</strong> text, images, documents, voice notes, and other media exchanged between your agents and your customers, solely to deliver the inbox service</li>
            <li>Message metadata: timestamps, delivery/read status, message IDs, customer phone numbers</li>
            <li>Customer (Contact) phone numbers in E.164 format and WhatsApp display names</li>
          </ul>
          <div className="mt-3 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Important:</strong> WABDesk processes WhatsApp message content solely to provide the customer support inbox service. We do <strong className="text-foreground">not</strong> use WhatsApp message content for advertising, for building user profiles for advertising purposes, or for sale to third parties — in full compliance with{" "}
              <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">Meta&rsquo;s WhatsApp Business Policy</a>.
            </p>
          </div>

          <h3 className="mb-2 mt-4 font-semibold text-base">3.3 Payment Data</h3>
          <p className="text-muted-foreground">We do <strong className="text-foreground">not</strong> store payment card details. Payments are processed by <strong className="text-foreground">Paddle.com Market Limited (&ldquo;Paddle&rdquo;)</strong>, our Merchant of Record, under PCI-DSS compliance. From Paddle we receive only: subscription status, plan tier, Paddle customer ID, and transaction reference IDs.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">3.4 Usage &amp; Technical Data</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Pages visited and features used within WABDesk</li>
            <li>Conversation count, response-time metrics, agent performance statistics</li>
            <li>Login timestamps and session duration</li>
            <li>Browser type, operating system, device type, screen resolution</li>
            <li>Referring URL and approximate location derived from IP address</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">3.5 Communications with WABDesk</h3>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Support tickets, emails, or chat messages you send us</li>
            <li>Feedback and feature requests</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">4. Legal Bases for Processing (GDPR — EU/EEA Users)</h2>
          <p className="mb-3 text-muted-foreground">For users in the EU/EEA, we process personal data under the following legal bases under GDPR Article 6:</p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-start font-semibold">Processing Activity</th>
                  <th className="px-4 py-2 text-start font-semibold">Legal Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["Account creation and management", "Contract performance (Art. 6(1)(b))"],
                  ["Providing the WhatsApp inbox service", "Contract performance (Art. 6(1)(b))"],
                  ["Payment processing and billing", "Contract performance (Art. 6(1)(b))"],
                  ["Transactional emails (invites, receipts, resets)", "Contract performance (Art. 6(1)(b))"],
                  ["Security monitoring and fraud prevention", "Legitimate interests (Art. 6(1)(f))"],
                  ["Platform analytics and improvement", "Legitimate interests (Art. 6(1)(f))"],
                  ["Marketing communications (opt-in only)", "Consent (Art. 6(1)(a))"],
                  ["Tax records and legal compliance", "Legal obligation (Art. 6(1)(c))"],
                ].map(([activity, basis]) => (
                  <tr key={activity} className="even:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{activity}</td>
                    <td className="px-4 py-2 text-muted-foreground">{basis}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">5. How We Use Your Information</h2>
          <ul className="list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Create, authenticate, and manage your WABDesk account</li>
            <li>Deliver the multi-agent WhatsApp inbox and all associated features</li>
            <li>Process payments and manage your subscription via Paddle</li>
            <li>Send transactional communications: account verification, password resets, billing receipts, agent invitations, plan change notifications</li>
            <li>Send product updates and feature announcements — you may opt out at any time via account settings or the unsubscribe link in any email</li>
            <li>Provide customer support and respond to inquiries</li>
            <li>Monitor platform security, detect abuse, and prevent fraud</li>
            <li>Comply with legal obligations including tax reporting and law enforcement requests</li>
            <li>Improve platform performance, reliability, and new features (aggregated/anonymized analytics)</li>
            <li>Enforce our Terms of Service and Acceptable Use Policy</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">6. Third-Party Service Providers — Data Sharing</h2>
          <p className="mb-3 text-muted-foreground">We share personal data only with the following service providers, each bound by appropriate Data Processing Agreements (DPAs) and contractual safeguards. We do <strong className="text-foreground">not</strong> sell, rent, or trade personal data to any third party for advertising or marketing.</p>
          {[
            { name: "Meta Platforms, Inc. (WhatsApp Business Cloud API)", data: "Message content, message metadata, WABA ID, phone number IDs, Contact phone numbers", purpose: "Delivery and receipt of WhatsApp messages — core service functionality", privacy: "https://www.whatsapp.com/legal/privacy-policy/", note: "Meta is an independent data controller for WhatsApp platform data. By using WABDesk, you and your customers are also subject to Meta's policies." },
            { name: "Paddle.com Market Limited", data: "Name, email, billing address, subscription details", purpose: "Payment processing and subscription management (Merchant of Record)", privacy: "https://www.paddle.com/legal/privacy", note: "Paddle independently controls payment card data under PCI-DSS. We do not receive or store card numbers." },
            { name: "Clerk, Inc.", data: "Name, email address, account credentials (hashed), session tokens, organization membership data", purpose: "User authentication and multi-tenant organization management", privacy: "https://clerk.com/privacy", note: null },
            { name: "Convex, Inc.", data: "All application data: conversations, contacts, agent data, settings, templates", purpose: "Real-time database and serverless backend infrastructure", privacy: "https://www.convex.dev/privacy", note: null },
            { name: "Vercel, Inc.", data: "Web traffic logs, request metadata, IP addresses", purpose: "Hosting and deployment of the WABDesk web application", privacy: "https://vercel.com/legal/privacy-policy", note: null },
            { name: "Resend", data: "Name, email address, email content (transactional only)", purpose: "Transactional email delivery: agent invitations, password resets, billing notifications", privacy: "https://resend.com/legal/privacy-policy", note: null },
            { name: "Google LLC", data: "Font requests via Google Fonts CDN (may include IP address per browser behavior)", purpose: "Typography rendering (Cairo/Tajawal Arabic fonts)", privacy: "https://policies.google.com/privacy", note: "We serve fonts directly where possible to minimize data exposure." },
          ].map((provider) => (
            <div key={provider.name} className="mt-4 rounded-md border p-4">
              <p className="font-semibold text-foreground">{provider.name}</p>
              <p className="mt-1 text-muted-foreground"><strong className="text-foreground">Data shared:</strong> {provider.data}</p>
              <p className="mt-1 text-muted-foreground"><strong className="text-foreground">Purpose:</strong> {provider.purpose}</p>
              <a href={provider.privacy} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-primary underline-offset-4 hover:underline">Privacy Policy →</a>
              {provider.note && <p className="mt-2 text-xs text-muted-foreground italic">{provider.note}</p>}
            </div>
          ))}
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">7. International Data Transfers</h2>
          <p className="text-muted-foreground">WABDesk serves users globally. Your data may be processed in countries outside your country of residence, including the United States and the European Economic Area. We implement appropriate safeguards for all cross-border transfers:</p>
          <ul className="mt-3 list-disc space-y-2 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">EU/EEA:</strong> Transfers are protected by Standard Contractual Clauses (SCCs) as approved by the European Commission (Decision 2021/914), supplemented by transfer impact assessments where required.</li>
            <li><strong className="text-foreground">Saudi Arabia (PDPL Art. 16):</strong> Cross-border transfers are protected via contractual clauses ensuring equivalent protection to Saudi PDPL requirements, as regulated by SDAIA.</li>
            <li><strong className="text-foreground">UAE (Federal Law No. 45/2021, Art. 26):</strong> International transfers comply with UAE data protection requirements, including adequacy assessments and contractual safeguards.</li>
            <li><strong className="text-foreground">Brazil (LGPD Art. 33):</strong> Transfers are covered by standard contractual clauses or rely on adequacy determinations recognized by Brazil&rsquo;s ANPD.</li>
            <li><strong className="text-foreground">Egypt (Law No. 151/2020):</strong> We comply with Egyptian data protection requirements for cross-border transfers from the Egyptian NLRDC where required.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">8. Data Retention</h2>
          <p className="mb-3 text-muted-foreground">We retain personal data only for as long as necessary for the purposes described in this policy or as required by law:</p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-start font-semibold">Data Type</th>
                  <th className="px-4 py-2 text-start font-semibold">Retention Period</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  ["Account data (name, email, org)", "Duration of subscription + 30 days after account deletion request"],
                  ["WhatsApp conversations and messages", "Duration of subscription + 30 days after cancellation"],
                  ["Contact profiles", "Duration of subscription + 30 days after cancellation"],
                  ["Billing and transaction records", "7 years (tax/legal compliance obligation)"],
                  ["Support communications", "3 years"],
                  ["Server and access logs", "12 months"],
                  ["Backup data", "90 days after data deletion"],
                  ["Anonymized/aggregated analytics", "Indefinitely (no personal data retained)"],
                ].map(([type, period]) => (
                  <tr key={type} className="even:bg-muted/20">
                    <td className="px-4 py-2 text-muted-foreground">{type}</td>
                    <td className="px-4 py-2 text-muted-foreground">{period}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-muted-foreground">After a Tenant cancels their subscription, their data remains accessible for <strong className="text-foreground">30 days</strong> before permanent deletion. Billing records are retained longer to satisfy tax authority requirements.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">9. Your Privacy Rights</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.1 EU/EEA Users — GDPR Rights</h3>
          <p className="text-muted-foreground">Under GDPR Articles 15–22, you have the right to:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">Access (Art. 15):</strong> Request a copy of your personal data</li>
            <li><strong className="text-foreground">Rectification (Art. 16):</strong> Correct inaccurate or incomplete data</li>
            <li><strong className="text-foreground">Erasure / &ldquo;Right to be Forgotten&rdquo; (Art. 17):</strong> Request deletion of your personal data (subject to legal retention obligations)</li>
            <li><strong className="text-foreground">Restriction (Art. 18):</strong> Limit our processing of your data</li>
            <li><strong className="text-foreground">Portability (Art. 20):</strong> Receive your data in a structured, machine-readable format (JSON/CSV via our Data Export feature)</li>
            <li><strong className="text-foreground">Object (Art. 21):</strong> Object to processing based on legitimate interests</li>
            <li><strong className="text-foreground">Withdraw Consent (Art. 7):</strong> Withdraw consent at any time where processing is consent-based</li>
            <li><strong className="text-foreground">Lodge a Complaint:</strong> File a complaint with your national data protection supervisory authority</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.2 California Users — CCPA/CPRA Rights</h3>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Know what personal information we collect, use, disclose, or share</li>
            <li>Delete personal information we hold about you</li>
            <li>Correct inaccurate personal information</li>
            <li>Opt-out of the sale or sharing of personal information — <strong className="text-foreground">Note: We do not sell personal information</strong></li>
            <li>Limit the use and disclosure of sensitive personal information</li>
            <li>Non-discrimination for exercising your rights</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.3 Saudi Arabia Users — PDPL</h3>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Access your personal data and know the purpose of its processing</li>
            <li>Correct or update inaccurate or incomplete data</li>
            <li>Request deletion of data that is no longer needed (subject to legal retention obligations)</li>
            <li>Withdraw consent where processing is consent-based</li>
            <li>Object to processing in certain circumstances</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.4 UAE Users — Federal Law No. 45 of 2021</h3>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Access and obtain a copy of your personal data</li>
            <li>Rectify incorrect or outdated personal data</li>
            <li>Request destruction of data no longer necessary for its original purpose</li>
            <li>Object to processing in certain circumstances</li>
            <li>Data portability where technically feasible</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.5 Brazilian Users — LGPD</h3>
          <p className="text-muted-foreground">Under Brazil&rsquo;s LGPD (Law No. 13,709/2018), you have the rights of confirmation, access, correction, anonymization, portability, deletion, information about sharing, and the right to withdraw consent.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.6 Egyptian Users — Law No. 151/2020</h3>
          <p className="text-muted-foreground">Egyptian data subjects have rights to access, correction, deletion, and restriction of processing under Egypt&rsquo;s Personal Data Protection Law No. 151 of 2020.</p>

          <div className="mt-4 rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground">
              <strong className="text-foreground">To exercise any of the above rights:</strong> Email us at{" "}
              <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>{" "}
              or submit a request from your account&rsquo;s Settings → Data &amp; Privacy page. We will respond within 30 days.
            </p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">10. Cookies &amp; Tracking Technologies</h2>
          <p className="text-muted-foreground">We use the following cookie categories:</p>
          <div className="mt-3 space-y-3">
            {[
              { name: "Strictly Necessary Cookies", desc: "Required for platform authentication and security (session tokens, CSRF protection). Cannot be disabled — the platform cannot function without them.", canOptOut: false },
              { name: "Analytics Cookies", desc: "Used to understand how users interact with WABDesk (pages visited, feature usage, session duration). Used solely to improve the platform.", canOptOut: true },
              { name: "Preference Cookies", desc: "Store your UI preferences such as language selection (Arabic/English), sidebar state, and other personalization settings.", canOptOut: true },
            ].map((cookie) => (
              <div key={cookie.name} className="rounded-md border p-3">
                <p className="font-semibold text-foreground">{cookie.name}</p>
                <p className="mt-1 text-muted-foreground">{cookie.desc}</p>
                <p className="mt-1 text-xs text-muted-foreground"><strong>Opt-out:</strong>{" "}{cookie.canOptOut ? "Yes — via browser settings or account preferences" : "No — essential for service operation"}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-muted-foreground">We do <strong className="text-foreground">not</strong> use third-party advertising cookies or cross-site behavioral tracking technologies.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">11. Data Security</h2>
          <p className="text-muted-foreground">We implement industry-standard and regulatory-grade security measures:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>TLS 1.2+ encryption for all data in transit</li>
            <li>AES-256 encryption for sensitive data at rest (Meta access tokens, API keys)</li>
            <li>Meta access tokens never stored in plaintext, never logged, never exposed client-side</li>
            <li>Strict tenant isolation enforced at the database layer — no cross-tenant data access is architecturally possible</li>
            <li>Webhook signature verification for all incoming Meta webhooks (HMAC-SHA256)</li>
            <li>Role-based access control (Admin / Supervisor / Agent) enforced server-side</li>
            <li>Phone numbers stored in E.164 format only; no free-text phone storage</li>
            <li>Password hashing using industry-standard bcrypt (via Clerk)</li>
            <li>Regular security reviews and dependency audits</li>
          </ul>
          <p className="mt-3 text-muted-foreground">In the event of a data breach that poses a risk to your rights and freedoms, we will notify affected users and relevant supervisory authorities within <strong className="text-foreground">72 hours</strong> of becoming aware, as required by GDPR Article 33 and equivalent laws.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">12. WhatsApp Business Data — Special Notice</h2>
          <p className="text-muted-foreground">By using WABDesk, you acknowledge:</p>
          <ul className="mt-2 list-disc space-y-2 ps-6 text-muted-foreground">
            <li>WABDesk integrates with <strong className="text-foreground">Meta&rsquo;s WhatsApp Business Cloud API</strong>. All WhatsApp messages pass through Meta&rsquo;s infrastructure, and Meta independently processes this data per their policies.</li>
            <li>You (the Tenant) are the <strong className="text-foreground">Data Controller</strong> for your customers&rsquo; (Contacts&rsquo;) personal data. WABDesk processes it only on your instructions, as your Data Processor.</li>
            <li>You are responsible for obtaining any legally required consents from your customers for WhatsApp messaging and data processing in your jurisdiction.</li>
            <li>You are responsible for complying with <a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">Meta&rsquo;s WhatsApp Business Policy</a> regarding acceptable use of the WhatsApp platform and messaging guidelines.</li>
            <li>WABDesk does not use WhatsApp message content to train AI models, build advertising profiles, or for any purpose other than delivering the inbox service you subscribed to.</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">13. Children&rsquo;s Privacy</h2>
          <p className="text-muted-foreground">WABDesk is a B2B service platform not directed at individuals under the age of <strong className="text-foreground">18</strong>. We do not knowingly collect or process personal data from minors. If you believe a minor&rsquo;s data has been submitted to our platform, please contact <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">14. Changes to This Privacy Policy</h2>
          <p className="text-muted-foreground">We may update this Privacy Policy from time to time. We will notify you of material changes by:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Email to the address on your account (at least 14 days before changes take effect)</li>
            <li>In-app notification within WABDesk</li>
            <li>Updating the &ldquo;Last Updated&rdquo; date at the top of this page</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">15. Contact &amp; Data Requests</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-4 space-y-2">
            <p className="text-muted-foreground"><strong className="text-foreground">Privacy &amp; Data Subject Requests:</strong>{" "}<a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">Security Disclosures:</strong>{" "}<a href="mailto:security@wabdesk.com" className="text-primary underline-offset-4 hover:underline">security@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">Postal Address:</strong> [Company Legal Name], [Full Address]</p>
            <p className="text-muted-foreground"><strong className="text-foreground">Response SLA:</strong> Within 30 days of any verifiable data subject request</p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link href="/terms" className="text-primary underline-offset-4 hover:underline">Terms of Service →</Link>
        <Link href="/" className="hover:text-foreground transition-colors">← Back to Home</Link>
      </div>
    </div>
  );
}
