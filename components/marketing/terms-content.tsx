"use client";

import Link from "next/link";
import { useMarketingLocale } from "@/lib/marketing/i18n";

export function TermsContent() {
  const { locale } = useMarketingLocale();
  if (locale === "ar") return <TermsAr />;
  return <TermsEn />;
}

function TermsAr() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">شروط الخدمة</h1>
        <p className="text-sm text-muted-foreground">
          <strong>آخر تحديث:</strong> 28 أبريل 2026 &nbsp;·&nbsp;{" "}
          <strong>تاريخ السريان:</strong> 28 أبريل 2026
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          تُشكّل شروط الخدمة هذه (&quot;الشروط&quot;) اتفاقيةً ملزمةً قانونياً بينك (&quot;العميل&quot; أو &quot;أنت&quot; أو &quot;المستأجر&quot;) وبين واب ديسك (&quot;واب ديسك&quot; أو &quot;نحن&quot; أو &quot;لنا&quot;)، التي تشغّلها شركة [الاسم القانوني للشركة]، المسجّلة في [الدولة/الجهة القضائية].
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          بإنشائك حساباً أو اشتراكك في أي خطة أو وصولك إلى واب ديسك أو استخدامه بأي شكل، فأنت توافق على الالتزام بهذه الشروط و{" "}
          <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">سياسة الخصوصية</Link> الخاصة بنا. إذا كنت لا توافق على ذلك، فيجب عليك عدم استخدام واب ديسك.
        </p>
        <div className="mt-4 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">إذا كنت تقبل هذه الشروط نيابةً عن شركة أو كيان قانوني آخر،</strong> فأنت تُقرّ بأنك تمتلك الصلاحية القانونية لإلزام ذلك الكيان بهذه الشروط. إذا كنت تفتقر إلى هذه الصلاحية، فيجب عليك عدم قبول هذه الشروط أو استخدام واب ديسك.
          </p>
        </div>
      </div>

      <div className="space-y-10 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-xl font-semibold">١. التعريفات</h2>
          <div className="space-y-2">
            {[
              ["المستأجر / العميل", "كيان تجاري أو فرد مشترك في خدمة واب ديسك"],
              ["المشرف (Admin)", "صاحب الحساب الأساسي الذي يتمتع بالتحكم الإداري الكامل في حساب المستأجر"],
              ["الوكيل (Agent)", "عضو في الفريق يضيفه المشرف لإدارة محادثات العملاء"],
              ["المشرف المتقدم (Supervisor)", "عضو في الفريق يتمتع بصلاحيات مرتفعة لإدارة الوكلاء وعرض التحليلات"],
              ["جهة الاتصال (Contact)", "عميل نهائي تُدار رسائله على واتساب من خلال واب ديسك"],
              ["القناة (Channel)", "رقم هاتف واتساب متصل بواب ديسك"],
              ["WABA", "حساب واتساب للأعمال — حساب صادر عن ميتا مرتبط برقم هاتف واتساب"],
              ["ميتا", "شركة Meta Platforms, Inc.، مشغّلة واتساب ومزوّدة واجهة برمجة تطبيقات واتساب Business Cloud"],
              ["الخدمة / المنصة", "تطبيق واب ديسك الإلكتروني وجميع الميزات وواجهات برمجة التطبيقات والبنية التحتية المرتبطة به"],
              ["الاشتراك", "خطة مدفوعة أو مجانية تمنح الوصول إلى ميزات واب ديسك وفق الفئة المختارة"],
              ["المحتوى", "أي بيانات أو نصوص أو صور أو مستندات أو مواد أخرى يتم تحميلها إلى واب ديسك أو إرسالها من خلاله"],
            ].map(([term, def]) => (
              <div key={term} className="flex gap-2">
                <span className="font-semibold text-foreground shrink-0">&quot;{term}&quot;:</span>
                <span className="text-muted-foreground">{def}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٢. الأهلية</h2>
          <p className="text-muted-foreground">باستخدامك واب ديسك، فأنت تُقرّ وتضمن ما يلي:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>أنك لا تقل عن 18 عاماً من العمر</li>
            <li>أنك تمتلك الأهلية القانونية الكاملة لإبرام عقد ملزم</li>
            <li>أن استخدامك لواب ديسك يمتثل لجميع القوانين واللوائح المعمول بها في ولايتك القضائية</li>
            <li>أن أعمالك التجارية واستخدامها لواتساب يمتثل لسياسة واتساب للأعمال من ميتا</li>
            <li>أنك لست مقيماً في أو تعمل من دولة خاضعة للعقوبات أو قيود التصدير المعمول بها</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٣. تسجيل الحساب والأمان</h2>
          <p className="text-muted-foreground">أنت توافق على:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>تقديم معلومات تسجيل دقيقة وكاملة ومحدّثة في جميع الأوقات</li>
            <li>الحفاظ على سرية بيانات تسجيل الدخول وأمانها</li>
            <li>إخطارنا فوراً على <a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a> بأي وصول غير مصرّح به إلى حسابك</li>
            <li>عدم مشاركة بيانات اعتماد حسابك مع أطراف غير مصرّح لها</li>
            <li>تحمّل المسؤولية الكاملة عن جميع الأنشطة التي تجري ضمن حسابك</li>
            <li>عدم إنشاء حسابات بهدف انتهاك هذه الشروط</li>
          </ul>
          <p className="mt-3 text-muted-foreground">نحتفظ بالحق في تعليق أو إنهاء الحسابات التي تُقدّم معلومات كاذبة أو التي يُعقل الاعتقاد بأنها تُستخدم في انتهاك هذه الشروط.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٤. وصف الخدمة</h2>
          <p className="text-muted-foreground">يوفّر واب ديسك:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>بريداً وارداً مشتركاً متعدد الوكلاء لمحادثات واتساب Business API</li>
            <li>إدارة المحادثات والتعيين والتوجيه في الوقت الفعلي (الأوضاع: اليدوي، أول رد، والتوزيع الدائري)</li>
            <li>إدارة جهات الاتصال (CRM مخففة) مع حقول مخصصة وعلامات وملاحظات</li>
            <li>إدارة الفريق القائمة على الأدوار (مشرف، مشرف متقدم، وكيل)</li>
            <li>قوالب رسائل مع متغيرات ديناميكية</li>
            <li>التحليلات وتقارير الأداء</li>
            <li>ميزات تصدير البيانات</li>
            <li>إدارة ملف تعريف واتساب للأعمال</li>
            <li>قواعد الأتمتة (تعتمد على الخطة)</li>
            <li>التكامل مع واتساب Business Cloud API من ميتا عبر Meta Embedded Signup</li>
          </ul>
          <p className="mt-3 text-muted-foreground">يعتمد توافر الخدمة على اتفاقية مستوى الخدمة لـ WhatsApp Business API من ميتا، ومزودي البنية التحتية لدينا (Convex وVercel وClerk)، وحالة اشتراكك النشط. نسعى لتوافر عالٍ لكننا لا نضمن وقت تشغيل 100%.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٥. الامتثال لواجهة برمجة تطبيقات واتساب للأعمال</h2>
          <div className="mb-4 rounded-md border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">هذا القسم بالغ الأهمية.</strong> قد يؤدي انتهاك سياسات ميتا إلى تعليق حساب واتساب للأعمال (WABA) الخاص بك من قِبل ميتا — بصورة مستقلة عن واب ديسك. لا يتحمّل واب ديسك أي مسؤولية عن مثل هذه التعليقات.
            </p>
          </div>

          <h3 className="mb-2 mt-4 font-semibold text-base">٥.١ التزامات الامتثال الخاصة بك</h3>
          <p className="text-muted-foreground">بربطك حساب WABA بواب ديسك، فأنت توافق على الامتثال لما يلي، وضمان التزام جميع الوكلاء بها:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">سياسة واتساب للأعمال من ميتا</a></li>
            <li><a href="https://www.facebook.com/policies/commerce/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">سياسة التجارة من ميتا</a></li>
            <li>إرشادات الرسائل من ميتا، بما في ذلك متطلبات الاشتراك لرسائل التسويق</li>
            <li>جميع القوانين المعمول بها التي تحكم الرسائل التجارية والتسويق الهاتفي والاتصالات الإلكترونية في ولايتك القضائية</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٥.٢ السلوك المحظور على واتساب</h3>
          <p className="text-muted-foreground">يُحظر عليك استخدام واب ديسك لـ:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>إرسال رسائل غير مرغوب فيها أو رسائل جماعية غير مطلوبة أو رسائل لمستخدمين لم يشتركوا فيها</li>
            <li>إرسال رسائل تنتهك سياسات المحتوى المحظور لدى ميتا (محتوى للبالغين، بضائع غير قانونية، عمليات احتيال مالية، إلخ)</li>
            <li>حصد أو جمع بيانات مستخدمي واتساب خارج نطاق ما يُستقبل في المحادثات العادية</li>
            <li>بناء ملفات تعريف إعلانية أو استهداف الإعلانات باستخدام بيانات رسائل واتساب</li>
            <li>إرسال رسائل نيابةً عن شركة لا تملك صلاحية تمثيلها</li>
            <li>استخدام الرسائل الجماعية أو الآلية بما يخالف حدود المعدل أو سياسات ميتا</li>
            <li>التحايل على التشفير الكامل لواتساب أو تعطيله أو التدخل فيه</li>
            <li>التصيّد الاحتيالي أو انتحال الهوية أو الاحتيال أو أي رسائل مضللة</li>
            <li>إرسال رسائل للقاصرين بما يخالف قوانين حماية الأطفال المعمول بها</li>
            <li>استخدام واب ديسك لأي غرض يتسبب في تعليق حساب WABA من قِبل ميتا أو يُعرّضه للخطر</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٥.٣ سلطة ميتا المستقلة</h3>
          <p className="text-muted-foreground">يصل واب ديسك إلى واجهة برمجة تطبيقات واتساب Business Cloud من ميتا نيابةً عنك. تتحكم ميتا بشكل مستقل في منصة واتساب ويمكنها تعليق أو تقييد أو إنهاء حساب WABA الخاص بك في أي وقت لانتهاك سياساتها، دون إشعار مسبق ودون أي وسيلة انتصاف ضد واب ديسك. لا يتحمّل واب ديسك مسؤولية:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>قرارات ميتا بشأن الموافقة على حساب WABA أو تعليقه أو إنهائه</li>
            <li>التغييرات على ميزات أو أسعار أو سياسات واجهة برمجة تطبيقات واتساب للأعمال من ميتا</li>
            <li>انقطاع الخدمة أو التعطل في البنية التحتية لميتا</li>
            <li>التكاليف التي تتكبّدها نتيجة لنموذج التسعير لكل محادثة من ميتا</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٥.٤ التحقق من الأعمال على ميتا</h3>
          <p className="text-muted-foreground">تفرض ميتا حدوداً شهرية للمحادثات على حسابات WABA غير المُتحقق منها. يفتح إتمام التحقق من الأعمال على ميتا في حساب Meta Business Manager الخاص بك حدوداً أعلى. هذا التحقق من مسؤوليتك ويُجرى مباشرةً مع ميتا. قد يرشدك واب ديسك لكنه لا يستطيع إتمامه نيابةً عنك.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٦. خطط الاشتراك والفواتير</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.١ الخطط المتاحة</h3>
          <p className="text-muted-foreground">يوفّر واب ديسك فئات الاشتراك التالية، بميزات وحدود موضّحة في <Link href="/#pricing" className="text-primary underline-offset-4 hover:underline">صفحة الأسعار</Link>: <strong className="text-foreground">مجاني</strong>، و<strong className="text-foreground">Starter</strong>، و<strong className="text-foreground">Growth</strong>، و<strong className="text-foreground">Business</strong>. نحتفظ بالحق في تعديل ميزات وحدود الخطط بإشعار مسبق مدته 30 يوماً للمشتركين الحاليين.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٢ Paddle بوصفها تاجر المدفوعات الرسمي</h3>
          <p className="text-muted-foreground">تُعالَج جميع المدفوعات من خلال <strong className="text-foreground">شركة Paddle.com Market Limited (&quot;Paddle&quot;)</strong>، التي تعمل بوصفها تاجر المدفوعات الرسمي لجميع معاملات واب ديسك. بالاشتراك في خطة مدفوعة، فأنت توافق أيضاً على <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">شروط خدمة Paddle</a>. تتولى Paddle مسؤولية:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>جمع ومعالجة تفاصيل بطاقات الدفع وفق معايير PCI-DSS</li>
            <li>احتساب وتحويل الضرائب المعمول بها (ضريبة القيمة المضافة، GST، ضريبة المبيعات) في جميع الولايات القضائية المطلوبة عالمياً</li>
            <li>إصدار الفواتير والإيصالات المتوافقة ضريبياً</li>
            <li>معالجة النزاعات وعمليات رد المبالغ</li>
            <li>تحويل العملات والتسعير المحلي (جنيه مصري، ريال سعودي، درهم إماراتي، دولار أمريكي حسب موقعك)</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٣ الفواتير المتكررة</h3>
          <p className="text-muted-foreground">تُصدَر فواتير الاشتراكات المدفوعة بصفة دورية (شهرياً أو سنوياً) في تاريخ دورة الفوترة التي اخترتها. بالاشتراك، فأنت تُفوّض Paddle بخصم رسوم طريقة الدفع الخاصة بك تلقائياً في كل تاريخ تجديد. تحصل الاشتراكات السنوية على خصم يبلغ تقريباً 20% مقارنةً بالأسعار الشهرية.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٤ الخطة المجانية</h3>
          <p className="text-muted-foreground">توفّر الخطة المجانية وصولاً محدوداً إلى ميزات واب ديسك بدون رسوم. نحتفظ بالحق في تعديل حدود الخطة المجانية أو إيقافها بإشعار مسبق مدته 30 يوماً. قد تُعلَّق الحسابات ذات الخطة المجانية الغير نشطة لأكثر من 90 يوماً متتالية.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٥ الترقية والخفض</h3>
          <p className="text-muted-foreground">يمكنك ترقية خطتك في أي وقت؛ تسري الترقية فوراً مع إصدار فاتورة بالحصة المتناسبة للمدة المتبقية من فترة الفوترة الحالية. تسري عمليات الخفض في بداية دورة الفوترة التالية. قد يؤدي الخفض إلى خطة ذات حدود أقل إلى فقدان الوصول إلى ميزات أو بيانات تتجاوز حدود الخطة الجديدة.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٦ الإلغاء</h3>
          <p className="text-muted-foreground">يمكنك إلغاء اشتراكك في أي وقت من خلال <strong className="text-foreground">الإعدادات ← الفواتير</strong> في حسابك على واب ديسك. عند الإلغاء:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>يستمر وصولك إلى الميزات المدفوعة حتى نهاية فترة الفوترة الحالية</li>
            <li>لن تُجرى أي رسوم إضافية بعد فترة الفوترة الحالية</li>
            <li>تُحتفظ ببياناتك لمدة 30 يوماً بعد انتهاء فترة الفوترة</li>
            <li>بعد 30 يوماً، تُحذف بياناتك بصورة دائمة وغير قابلة للاسترداد</li>
            <li>نوصيك بتصدير بياناتك (الإعدادات ← البيانات والخصوصية) قبل الإلغاء</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٧ سياسة الاسترداد</h3>
          <p className="text-muted-foreground">جميع المدفوعات نهائية وغير قابلة للاسترداد إلا في الحالات التالية:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>عند اشتراط ذلك بموجب قانون حماية المستهلك المعمول به في ولايتك القضائية</li>
            <li>الرسوم المكررة بالخطأ</li>
            <li>وفق تقديرنا المطلق في الظروف الاستثنائية (مثل انقطاعات المنصة الممتدة بسبب واب ديسك)</li>
          </ul>
          <p className="mt-2 text-muted-foreground">طلبات الاسترداد: راسلنا على <a href="mailto:billing@wabdesk.com" className="text-primary underline-offset-4 hover:underline">billing@wabdesk.com</a> خلال 14 يوماً من تاريخ الرسوم.</p>
          <p className="mt-2 text-muted-foreground"><strong className="text-foreground">المستهلكون في الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية:</strong> يحق لك قانونياً الانسحاب خلال 14 يوماً من تاريخ الاشتراك الأولي، شريطة ألا تكون قد استخدمت الخدمة بعد. بتفعيلك لواب ديسك واستخدامه، فأنت تطلب صراحةً الأداء الفوري وتُقرّ بأن حق الانسحاب يسقط عند التفعيل.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٨ الضرائب</h3>
          <p className="text-muted-foreground">بوصفها تاجر المدفوعات الرسمي، تتولى Paddle جمع الضرائب وتحويلها عالمياً. قد تتضمن الأسعار المعروضة الضرائب المحلية أو تستثنيها وفقاً لمتطلبات القانون المحلي في ولايتك القضائية.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.٩ فشل الدفع</h3>
          <p className="text-muted-foreground">في حال فشل الدفع، سنُخطرك عبر البريد الإلكتروني ونحاول إعادة الخصم. بعد فترة سماح مدتها <strong className="text-foreground">7 أيام</strong> من استمرار فشل الدفع، قد يُخفَّض حسابك تلقائياً إلى الخطة المجانية. تُحتفظ ببياناتك خلال هذه الفترة. في حال تسوية الدفع خلال 30 يوماً، يُستعاد الوصول الكامل.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٦.١٠ تغييرات الأسعار</h3>
          <p className="text-muted-foreground">سنوفّر ما لا يقل عن <strong className="text-foreground">30 يوماً من الإشعار الكتابي المسبق</strong> (عبر البريد الإلكتروني لعنوان حسابك المسجّل) قبل سريان أي زيادة في الأسعار. يمكنك إلغاء اشتراكك قبل سريان زيادة الأسعار إذا لم توافق على التسعير الجديد.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٧. سياسة الاستخدام المقبول</h2>
          <p className="text-muted-foreground">أنت توافق على عدم استخدام واب ديسك لـ:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>انتهاك أي قوانين أو لوائح معمول بها أو هذه الشروط</li>
            <li>التعدي على حقوق الملكية الفكرية أو الخصوصية أو الدعاية أو غيرها من الحقوق القانونية لأي طرف ثالث</li>
            <li>إرسال أو تخزين أو معالجة البرامج الضارة أو الفيروسات أو برامج الفدية أو برامج التجسس أو أي شفرة خبيثة</li>
            <li>محاولة الوصول غير المصرّح به إلى أنظمة واب ديسك أو حسابات المستخدمين الآخرين أو الأنظمة الخارجية</li>
            <li>شنّ هجمات حجب الخدمة أو التدهور بأي شكل من أشكال أداء واب ديسك</li>
            <li>الهندسة العكسية أو فكّ الترجمة أو التفكيك أو استخراج الكود المصدري من واب ديسك</li>
            <li>إعادة بيع أو ترخيص أو وضع علامة تجارية بيضاء أو إعادة توزيع واب ديسك تجارياً دون موافقة كتابية مسبقة منا</li>
            <li>استخدام النصوص البرمجية الآلية أو الروبوتات أو أدوات الاستخراج لجمع البيانات من واب ديسك بما يتجاوز الاستخدام الطبيعي</li>
            <li>المضايقة أو التهديد أو الإساءة أو التمييز ضد أي شخص</li>
            <li>تخزين أو إرسال أو معالجة مواد الإساءة الجنسية للأطفال (CSAM) أو أي محتوى يستغل القاصرين</li>
            <li>تسهيل القمار غير القانوني أو المواد الخاضعة للرقابة أو تجارة الأسلحة غير المشروعة أو الاتجار بالبشر</li>
            <li>التحايل على أي حدود للخطة أو قيود الاستخدام أو آليات الفواتير</li>
            <li>إنشاء حسابات وهمية أو تزوير هويتك أو صلاحياتك</li>
            <li>استخدام واب ديسك للتواصل مع أفراد أبدوا صراحةً عدم رغبتهم في تلقي اتصالات من شركتك</li>
          </ul>
          <p className="mt-3 text-muted-foreground">نحتفظ بالحق في التحقيق في أي انتهاك واتخاذ الإجراء المناسب، بما يشمل التعليق الفوري للحساب دون استرداد وإحالة الأمر إلى السلطات المختصة.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٨. أدوار الوكلاء والصلاحيات</h2>
          <p className="text-muted-foreground">يطبّق واب ديسك ثلاث مستويات من الأدوار ضمن كل حساب مستأجر: <strong className="text-foreground">المشرف (Admin)</strong>، و<strong className="text-foreground">المشرف المتقدم (Supervisor)</strong>، و<strong className="text-foreground">الوكيل (Agent)</strong>. يُطبَّق التحكم في الوصول القائم على الأدوار على جانب الخادم ولا يمكن تجاوزه من جانب العميل.</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">المشرف:</strong> تحكم كامل في جميع إعدادات المستأجر والفواتير والوكلاء والقنوات والبيانات</li>
            <li><strong className="text-foreground">المشرف المتقدم:</strong> يمكنه إدارة الوكلاء (دعوة وإزالة)، وعرض جميع المحادثات والتحليلات؛ لا يمكنه تعديل الفواتير أو إعدادات WABA</li>
            <li><strong className="text-foreground">الوكيل:</strong> يمكنه فقط الوصول إلى المحادثات المعيّنة له والرد عليها؛ لا يمكنه عرض محادثات الوكلاء الآخرين</li>
          </ul>
          <p className="mt-3 text-muted-foreground">يتحمّل المشرفون مسؤولية ضمان امتثال جميع الوكلاء والمشرفين المتقدمين المضافين إلى حساباتهم لهذه الشروط وسياسة الاستخدام المقبول لواب ديسك. انتهاكات الوكلاء تُنسب إلى المستأجر.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٩. البيانات والخصوصية ومسؤولياتك</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.١ ملكية البيانات</h3>
          <p className="text-muted-foreground">تحتفظ بالملكية الكاملة لجميع البيانات التي تحمّلها إلى واب ديسك أو تُنشئها بداخله (المحادثات وجهات الاتصال والقوالب والإعدادات). تمنح واب ديسك ترخيصاً محدوداً وغير حصري وعالمي النطاق لمعالجة هذه البيانات حصراً لتقديم الخدمة لك.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٢ اتفاقية معالجة البيانات (DPA)</h3>
          <p className="text-muted-foreground">بالنسبة لمستخدمي الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية، يعمل واب ديسك بوصفه معالج بياناتك لبيانات جهات الاتصال الشخصية. بالموافقة على هذه الشروط، فأنت توافق أيضاً على اتفاقية معالجة البيانات (DPA) الخاصة بنا المدرجة بالإشارة. نسخة منها متاحة على <Link href="/dpa" className="text-primary underline-offset-4 hover:underline">wabdesk.com/dpa</Link> أو عند الطلب على <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٣ مسؤولياتك بوصفك متحكماً في البيانات</h3>
          <p className="text-muted-foreground">أنت المسؤول وحدك عن:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>الحصول على جميع الموافقات المطلوبة قانونياً من عملائك (جهات الاتصال) لرسائل واتساب ومعالجة البيانات في ولايتك القضائية</li>
            <li>الامتثال لجميع قوانين حماية البيانات المعمول بها (GDPR وCCPA والـPDPL السعودي والقانون الاتحادي الإماراتي رقم 45/2021 والقانون المصري 151/2020 وغيرها) فيما يخص بيانات جهات اتصالك</li>
            <li>عدم تحميل الفئات الخاصة من البيانات الشخصية الحساسة (السجلات الصحية والبيانات البيومترية وبيانات الحسابات المالية وبيانات الأطفال) دون أساس قانوني ضمانات مناسبة</li>
            <li>ضمان امتثال استخدامك لرسائل واتساب لجميع قوانين مكافحة الرسائل غير المرغوب فيها والاتصالات الإلكترونية المعمول بها</li>
            <li>امتلاك أساس قانوني للمعالجة والتواصل مع كل جهة اتصال</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٤ سياسة الخصوصية</h3>
          <p className="text-muted-foreground"><Link href="/privacy" className="text-primary underline-offset-4 hover:underline">سياسة الخصوصية</Link> الخاصة بنا مدرجة في هذه الشروط بالإشارة وتُشكّل جزءاً من هذه الاتفاقية.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">٩.٥ تصدير البيانات وقابليتها للنقل</h3>
          <p className="text-muted-foreground">يوفّر واب ديسك وظيفة تصدير البيانات (الإعدادات ← البيانات والخصوصية) المتاحة لجميع فئات الخطط بما فيها المجانية. يمكنك تصدير جهات اتصالك (CSV) وسجل المحادثات (JSON) في أي وقت. نشجّعك على تصدير بياناتك قبل إلغاء اشتراكك.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٠. الملكية الفكرية</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٠.١ الملكية الفكرية لواب ديسك</h3>
          <p className="text-muted-foreground">واب ديسك وتقنياته وواجهة مستخدمه وعلامته التجارية وشعاراته وجميع الملكية الفكرية المرتبطة به مملوكة لـ[الاسم القانوني للشركة] أو مرخّصة لها. تمنحك هذه الشروط ترخيصاً محدوداً وغير حصري وغير قابل للنقل وقابلاً للإلغاء لاستخدام واب ديسك حصراً لأغراضك التجارية الداخلية خلال فترة الاشتراك النشط. لا تنقل هذه الشروط أي حقوق ملكية فكرية إليك.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٠.٢ محتواك</h3>
          <p className="text-muted-foreground">تحتفظ بجميع الحقوق على المحتوى الذي تُنشئه داخل واب ديسك (قوالب الرسائل وملاحظات جهات الاتصال والحقول المخصصة وما إلى ذلك). أنت تُقرّ بأنك تمتلك حقوق جميع المحتوى الذي تحمّله أو الحقوق اللازمة لذلك، وأن تحميله لا ينتهك حقوق أي طرف ثالث.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٠.٣ التغذية الراجعة</h3>
          <p className="text-muted-foreground">إذا قدّمت تعليقات أو اقتراحات أو أفكاراً حول واب ديسك، فأنت تمنحنا ترخيصاً دائماً وخالياً من حقوق الملكية وعالمي النطاق لاستخدام هذه التغذية الراجعة وتعديلها ودمجها في منتجاتنا دون أي التزام بالتعويض أو الإسناد.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٠.٤ علامة واب ديسك التجارية</h3>
          <p className="text-muted-foreground">لا يجوز لك استخدام اسم واب ديسك أو شعاره أو علامته التجارية في أي اتصال عام أو بيان صحفي أو مواد تسويقية دون موافقة كتابية مسبقة منا. يجوز لك الإشارة إلى أن شركتك تستخدم واب ديسك بوصفه أداة تقنية.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١١. السرية</h2>
          <p className="text-muted-foreground">تتفق كلتا الجهتين على الحفاظ على سرية جميع المعلومات غير العامة للجهة الأخرى المفصح عنها في سياق واب ديسك، بما في ذلك بيانات اعتماد API ورموز الوصول والبيانات التجارية وشروط التسعير غير المتاحة للعموم. ولا تسري هذه الالتزام على المعلومات التي: (أ) أصبحت متاحة للعموم دون أي خطأ من الطرف المستقبل؛ (ب) طُوّرت بشكل مستقل؛ أو (ج) يجب الإفصاح عنها بموجب القانون أو أمر قضائي.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٢. مستوى الخدمة والتوافر</h2>
          <p className="text-muted-foreground">نسعى جاهدين للحفاظ على توافر عالٍ لواب ديسك. غير أن:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>لا نضمن وقت تشغيل 100% أو وصولاً غير متقطع</li>
            <li>قد ننفّذ صيانة مجدولة بإشعار مسبق حيثما أمكن ذلك</li>
            <li>انقطاعات الخدمة الناجمة عن واجهة برمجة تطبيقات ميتا أو Convex أو Vercel أو Clerk أو غيرها من مزودي البنية التحتية خارجة عن سيطرتنا</li>
            <li>سنبذل جهوداً تجارية معقولة لاستعادة الخدمة فوراً بعد أي انقطاع</li>
          </ul>
          <p className="mt-3 text-muted-foreground">التزامات SLA الرسمية متاحة لمشتركي خطة Business — تواصل معنا على <a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a>.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٣. إخلاء المسؤولية والضمانات</h2>
          <h3 className="mb-2 mt-4 font-semibold text-base">١٣.١ ضماننا</h3>
          <p className="text-muted-foreground">نضمن أن واب ديسك سيعمل بشكل جوهري كما هو موضح في وثائقنا في ظل الاستخدام الطبيعي خلال فترة اشتراكك.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">١٣.٢ إخلاء المسؤولية من الضمانات الأخرى</h3>
          <div className="rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground">باستثناء ما هو صريح في القسم ١٣.١، يُقدَّم واب ديسك &quot;كما هو&quot; و&quot;كما هو متاح&quot; دون أي ضمانات من أي نوع، صريحة كانت أم ضمنية، بما في ذلك ضمانات القابلية للتسويق أو الملاءمة لغرض معين أو عدم الانتهاك، أو أن الخدمة ستكون خالية من الأخطاء أو غير منقطعة أو تلبّي متطلباتك المحددة. لا نضمن دقة التحليلات أو التقارير أو إحصاءات التسليم. ولا نضمن بقاء واجهة برمجة تطبيقات واتساب من ميتا متاحةً أو ثابتةً أو قابلةً للوصول في أي وقت معين.</p>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٤. تحديد المسؤولية</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground">إلى أقصى حد يسمح به القانون المعمول به:</p>
            <ol className="mt-2 list-decimal space-y-2 ps-6 text-muted-foreground">
              <li>لا تتجاوز المسؤولية التراكمية الإجمالية لواب ديسك تجاهك عن جميع المطالبات الناشئة عن أو المتعلقة بهذه الشروط أو الخدمة إجمالي المبلغ الذي دفعته لواب ديسك في الـ<strong className="text-foreground">12 شهراً</strong> السابقة للحدث المُنشئ للمطالبة.</li>
              <li>لا يتحمّل واب ديسك مسؤولية الأضرار غير المباشرة أو العرضية أو الخاصة أو التبعية أو التأديبية، بما في ذلك الأرباح الفائتة أو الإيرادات الضائعة أو فقدان البيانات أو فقدان الشهرة التجارية أو انقطاع الأعمال.</li>
              <li>لا يتحمّل واب ديسك مسؤولية أي إجراءات أو قرارات أو تغييرات سياسية من ميتا بشأن حساب WABA الخاص بك، بما في ذلك التعليق أو الإنهاء أو تقييد المعدل.</li>
              <li>لا يتحمّل واب ديسك مسؤولية انقطاعات الخدمة الناجمة عن مزودي البنية التحتية الخارجيين (Convex وVercel وClerk وميتا وPaddle وما إلى ذلك).</li>
              <li>لا يتحمّل واب ديسك مسؤولية إخفاقك في الامتثال لقوانين حماية البيانات المعمول بها أو سياسة واتساب للأعمال من ميتا.</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٥. التعويض</h2>
          <p className="text-muted-foreground">أنت توافق على تعويض واب ديسك و[الاسم القانوني للشركة] ومديريها وموظفيها ومقاوليها ووكلائها المعنيين والدفاع عنهم وإبراء ذمّتهم من أي مطالبات ومسؤوليات وأضرار وأحكام وأتعاب محامين معقولة من أطراف ثالثة تنشأ عن أو تتعلق بـ:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>استخدامك لواب ديسك بما يخالف هذه الشروط أو القانون المعمول به</li>
            <li>انتهاكك لسياسة واتساب للأعمال من ميتا أو غيرها من سياسات ميتا</li>
            <li>المحتوى الذي تحمّله أو ترسله أو تعالجه من خلال واب ديسك</li>
            <li>إخفاقك في الحصول على الموافقات المطلوبة من جهات اتصالك</li>
            <li>تصرفات وكلائك ضمن حساب واب ديسك الخاص بك</li>
            <li>انتهاكك لحقوق أي طرف ثالث، بما في ذلك حقوق الملكية الفكرية أو الخصوصية</li>
            <li>مطالبات عملائك (جهات الاتصال) الناشئة عن ممارساتك التجارية</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٦. الإنهاء</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٦.١ الإنهاء من قِبلك</h3>
          <p className="text-muted-foreground">يمكنك إنهاء حسابك على واب ديسك في أي وقت عبر: (أ) إلغاء اشتراكك من الإعدادات ← الفواتير؛ و(ب) طلب حذف الحساب بمراسلتنا على <a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a>. يسري الإلغاء كما هو موضح في القسم ٦.٦.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٦.٢ الإنهاء أو التعليق من قِبلنا</h3>
          <p className="text-muted-foreground">يجوز لنا تعليق حسابك أو إنهاؤه فوراً (مع إشعار مسبق أو دونه) في الحالات التالية:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>انتهاكك الجوهري لهذه الشروط أو سياسة الاستخدام المقبول</li>
            <li>انتهاكك لسياسة واتساب للأعمال من ميتا بطريقة تُعرّض منصتنا أو المستأجرين الآخرين للخطر</li>
            <li>ممارستك لأنشطة احتيالية أو مضللة أو غير قانونية</li>
            <li>إخفاقك في الدفع بعد فترة السماح المدتها 7 أيام إثر فشل الدفع</li>
            <li>طلب جهة تنظيمية أو سلطة إنفاذ قانون منا القيام بذلك</li>
            <li>استمرار تقديم الخدمة لك سيُعرّضنا لمخاطر قانونية أو تنظيمية</li>
          </ul>
          <p className="mt-2 text-muted-foreground">بالنسبة للانتهاكات غير الجوهرية، سنوفّر إشعاراً كتابياً وفرصة معقولة للتصحيح قبل الإنهاء.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٦.٣ آثار الإنهاء</h3>
          <p className="text-muted-foreground">عند الإنهاء لأي سبب:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>يُلغى وصولك إلى واب ديسك فوراً</li>
            <li>تُحتفظ ببياناتك لمدة 30 يوماً ثم تُحذف نهائياً (باستثناء سجلات الفواتير المحتفظ بها وفق القسم ٨)</li>
            <li>تنتهي جميع التراخيص الممنوحة لك بموجب هذه الشروط</li>
            <li>تبقى الأقسام ٩–١٨ سارية المفعول بعد الإنهاء</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٧. القانون الحاكم وتسوية النزاعات</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٧.١ القانون الحاكم</h3>
          <p className="text-muted-foreground">تخضع هذه الشروط وتُفسَّر وفقاً لقوانين <strong className="text-foreground">[الولاية القضائية الحاكمة — مثلاً: جمهورية مصر العربية / الإمارات العربية المتحدة / إنجلترا وويلز]</strong>، بصرف النظر عن مبادئ تعارض القوانين.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٧.٢ الحل غير الرسمي</h3>
          <p className="text-muted-foreground">قبل الشروع في أي إجراء رسمي لتسوية النزاعات، تتفق على التواصل معنا على <a href="mailto:legal@wabdesk.com" className="text-primary underline-offset-4 hover:underline">legal@wabdesk.com</a> ومحاولة تسوية النزاع وديّاً بحسن نية. سنبذل جهداً معقولاً لحله خلال 30 يوماً.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٧.٣ التحكيم الملزم</h3>
          <p className="text-muted-foreground">إذا فشل الحل الودي، تُحال النزاعات إلى التحكيم الملزم وفق قواعد <strong className="text-foreground">المركز الإقليمي للقاهرة للتحكيم التجاري الدولي (CRCICA)</strong> للعملاء في منطقة الشرق الأوسط وشمال أفريقيا، أو وفق قواعد <strong className="text-foreground">غرفة التجارة الدولية (ICC)</strong> للعملاء الدوليين. يُجرى التحكيم باللغة الإنجليزية (أو العربية بالاتفاق المتبادل) ومقره [المدينة]. يتحمّل كل طرف تكاليفه الخاصة ما لم يُقرّر المحكّم خلاف ذلك.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">١٧.٤ حقوق مستهلكي الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية</h3>
          <p className="text-muted-foreground">لا يُقيّد أي شيء في هذه الشروط الحقوق القانونية لمستهلكي الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية بموجب قانون حماية المستهلك المعمول به. يمكن لمستهلكي الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية أيضاً تقديم شكاوى إلى هيئة حماية المستهلك الوطنية المختصة أو استخدام منصة تسوية النزاعات الإلكترونية للاتحاد الأوروبي على <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">ec.europa.eu/consumers/odr/</a>.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٨. التغييرات على هذه الشروط</h2>
          <p className="text-muted-foreground">نحتفظ بالحق في تعديل هذه الشروط في أي وقت. للتغييرات الجوهرية (بما في ذلك التغييرات على الأسعار أو المسؤولية أو تسوية النزاعات أو معالجة البيانات)، سنقوم بـ:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>توفير ما لا يقل عن <strong className="text-foreground">14 يوماً من الإشعار المسبق</strong> عبر البريد الإلكتروني لعنوان حسابك المسجّل</li>
            <li>نشر إشعار داخل التطبيق في واب ديسك</li>
            <li>تحديث تاريخ &quot;آخر تحديث&quot; في أعلى هذه الصفحة</li>
          </ul>
          <p className="mt-3 text-muted-foreground">استمرارك في استخدام واب ديسك بعد تاريخ سريان التغييرات يُعدّ موافقتك عليها. إذا كنت لا توافق على الشروط المعدّلة، فيجب عليك إلغاء اشتراكك قبل سريان التغييرات.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٩. أحكام عامة</h2>
          <div className="space-y-4">
            {[
              ["١٩.١ الاتفاقية الكاملة", "تُشكّل هذه الشروط مع سياسة الخصوصية وأي اتفاقية معالجة بيانات معمول بها الاتفاقية الكاملة بينك وبين واب ديسك فيما يخص الخدمة، وتحلّ محل جميع الاتفاقيات والتفاهمات السابقة."],
              ["١٩.٢ قابلية الفصل", "إذا وجدت محكمة مختصة أن أي حكم من هذه الشروط غير صالح أو غير قابل للتنفيذ، فسيُعدَّل ذلك الحكم بالحد الأدنى اللازم، وتظل الأحكام المتبقية سارية المفعول."],
              ["١٩.٣ عدم التنازل", "إخفاقنا في تطبيق أي حق أو حكم من هذه الشروط لا يُعدّ تنازلاً عن ذلك الحق أو الحكم في أي مناسبة مستقبلية."],
              ["١٩.٤ التنازل", "لا يجوز لك التنازل عن حقوقك بموجب هذه الشروط أو نقلها دون موافقة كتابية مسبقة منا. يجوز لنا التنازل عن حقوقنا والتزاماتنا لكيان خلف (مثلاً في حالة الاندماج أو الاستحواذ أو بيع الأصول) مع إشعارك."],
              ["١٩.٥ القوة القاهرة", "لا يتحمّل أي طرف مسؤولية الإخفاق في الأداء أو التأخر الناجمين عن أحداث خارجة عن سيطرته المعقولة، بما في ذلك انقطاعات منصة ميتا والكوارث الطبيعية والحروب والأوبئة وإجراءات الحكومة وإخفاقات البنية التحتية للإنترنت."],
              ["١٩.٦ العلاقة بين الطرفين", "الطرفان مقاولان مستقلان. لا يُنشئ أي شيء في هذه الشروط شراكةً أو مشروعاً مشتركاً أو وكالةً أو امتيازاً أو علاقة عمل أو علاقة ائتمانية."],
            ].map(([title, text]) => (
              <div key={title as string}>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="mt-1 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٢٠. معلومات التواصل</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-4 space-y-2">
            <p className="text-muted-foreground"><strong className="text-foreground">استفسارات قانونية / استفسارات الشروط:</strong>{" "}<a href="mailto:legal@wabdesk.com" className="text-primary underline-offset-4 hover:underline">legal@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">الفواتير والمدفوعات:</strong>{" "}<a href="mailto:billing@wabdesk.com" className="text-primary underline-offset-4 hover:underline">billing@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">الخصوصية والبيانات:</strong>{" "}<a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">الدعم العام:</strong>{" "}<a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">امتثال واتساب:</strong>{" "}<a href="mailto:compliance@wabdesk.com" className="text-primary underline-offset-4 hover:underline">compliance@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">العنوان المسجّل:</strong> [الاسم القانوني للشركة]، [العنوان الكامل]</p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">→ سياسة الخصوصية</Link>
        <Link href="/" className="hover:text-foreground transition-colors">العودة إلى الرئيسية ←</Link>
      </div>
    </div>
  );
}

function TermsEn() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">
          <strong>Last Updated:</strong> April 28, 2026 &nbsp;·&nbsp;{" "}
          <strong>Effective Date:</strong> April 28, 2026
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          These Terms of Service (&ldquo;Terms&rdquo;) constitute a legally binding agreement between you (&ldquo;Customer,&rdquo; &ldquo;you,&rdquo; or &ldquo;Tenant&rdquo;) and WABDesk (&ldquo;WABDesk,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;), operated by [Company Legal Name], registered in [Jurisdiction].
        </p>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          By creating an account, subscribing to any plan, or otherwise accessing or using WABDesk, you agree to be bound by these Terms and our{" "}
          <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">Privacy Policy</Link>. If you do not agree, you must not use WABDesk.
        </p>
        <div className="mt-4 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">If you are accepting on behalf of a company or other legal entity,</strong> you represent that you have the authority to bind that entity to these Terms. If you lack such authority, you must not accept these Terms or use WABDesk.
          </p>
        </div>
      </div>

      <div className="space-y-10 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. Definitions</h2>
          <div className="space-y-2">
            {[
              ["Tenant / Customer", "A business entity or individual that subscribes to WABDesk"],
              ["Admin", "The primary account holder with full administrative control over a Tenant account"],
              ["Agent", "A team member added by an Admin to manage customer conversations"],
              ["Supervisor", "A team member with elevated permissions to manage Agents and view analytics"],
              ["Contact", "An end customer whose WhatsApp messages are managed through WABDesk"],
              ["Channel", "A WhatsApp phone number connected to WABDesk"],
              ["WABA", "WhatsApp Business Account — a Meta-issued account linked to a WhatsApp phone number"],
              ["Meta", "Meta Platforms, Inc., operator of WhatsApp and provider of the WhatsApp Business Cloud API"],
              ["Service / Platform", "The WABDesk web application and all associated features, APIs, and infrastructure"],
              ["Subscription", "A paid or free plan granting access to WABDesk features under the selected tier"],
              ["Content", "Any data, text, images, documents, or other materials uploaded to or transmitted through WABDesk"],
            ].map(([term, def]) => (
              <div key={term} className="flex gap-2">
                <span className="font-semibold text-foreground shrink-0">&ldquo;{term}&rdquo;:</span>
                <span className="text-muted-foreground">{def}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">2. Eligibility</h2>
          <p className="text-muted-foreground">By using WABDesk, you represent and warrant that:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>You are at least 18 years old</li>
            <li>You have the full legal authority to enter into a binding contract</li>
            <li>Your use of WABDesk complies with all applicable laws and regulations in your jurisdiction</li>
            <li>Your business and its WhatsApp use comply with Meta&rsquo;s WhatsApp Business Policy</li>
            <li>You are not located in or operating from a country subject to applicable sanctions or export restrictions</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">3. Account Registration &amp; Security</h2>
          <p className="text-muted-foreground">You agree to:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Provide accurate, complete, and current registration information at all times</li>
            <li>Keep your login credentials confidential and secure</li>
            <li>Immediately notify us at <a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a> of any unauthorized access to your account</li>
            <li>Not share your account credentials with unauthorized parties</li>
            <li>Be responsible and liable for all activities that occur under your account</li>
            <li>Not create accounts for the purpose of violating these Terms</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">4. Service Description</h2>
          <p className="text-muted-foreground">WABDesk provides:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>A multi-agent shared inbox for WhatsApp Business API conversations</li>
            <li>Real-time conversation management, assignment, and routing (manual, first-reply, and round-robin modes)</li>
            <li>Contact management (CRM-lite) with custom fields, tags, and notes</li>
            <li>Role-based team management (Admin, Supervisor, Agent)</li>
            <li>Message templates with dynamic variables</li>
            <li>Analytics and performance reporting</li>
            <li>Data export features</li>
            <li>WhatsApp Business profile management</li>
            <li>Automation rules (plan-dependent)</li>
            <li>Integration with Meta&rsquo;s WhatsApp Business Cloud API via Meta Embedded Signup</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">5. WhatsApp Business API Compliance</h2>
          <div className="mb-4 rounded-md border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">This section is critical.</strong> Violation of Meta&rsquo;s policies may result in suspension of your WhatsApp Business Account (WABA) by Meta — independent of WABDesk. WABDesk is not responsible for such suspensions.
            </p>
          </div>

          <h3 className="mb-2 mt-4 font-semibold text-base">5.1 Your Compliance Obligations</h3>
          <p className="text-muted-foreground">By connecting a WABA to WABDesk, you agree to comply with, and ensure all Agents comply with:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><a href="https://www.whatsapp.com/legal/business-policy/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">Meta&rsquo;s WhatsApp Business Policy</a></li>
            <li><a href="https://www.facebook.com/policies/commerce/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">Meta&rsquo;s Commerce Policy</a></li>
            <li>Meta&rsquo;s Messaging Guidelines, including opt-in requirements for marketing messages</li>
            <li>All applicable laws governing commercial messaging and electronic communications in your jurisdiction</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">5.2 Prohibited WhatsApp Conduct</h3>
          <p className="text-muted-foreground">You must NOT use WABDesk to:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Send spam, bulk unsolicited messages, or messages to users who have not opted in</li>
            <li>Send messages that violate Meta&rsquo;s prohibited content policies</li>
            <li>Harvest or collect WhatsApp user data beyond what is received through normal conversation</li>
            <li>Build advertising profiles or target advertising using WhatsApp message data</li>
            <li>Send messages on behalf of a business you are not authorized to represent</li>
            <li>Use bulk or automated messaging in violation of Meta&rsquo;s rate limits or policies</li>
            <li>Circumvent, disable, or interfere with WhatsApp&rsquo;s end-to-end encryption</li>
            <li>Conduct phishing, impersonation, fraud, or any deceptive messaging</li>
            <li>Send messages to minors in violation of applicable child protection laws</li>
            <li>Use WABDesk for any purpose that causes or risks suspension of your WABA by Meta</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">5.3 Meta&rsquo;s Independent Authority</h3>
          <p className="text-muted-foreground">Meta independently controls the WhatsApp platform and may suspend, restrict, or terminate your WABA at any time for violations of its policies, without notice and without any recourse against WABDesk. WABDesk is not responsible for Meta&rsquo;s decisions regarding your WABA, changes to Meta&rsquo;s API, Meta infrastructure downtime, or costs from Meta&rsquo;s per-conversation pricing.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">5.4 Meta Business Verification</h3>
          <p className="text-muted-foreground">Meta imposes monthly conversation limits on unverified WABA accounts. Completing Meta Business Verification unlocks higher limits. This verification is your responsibility and is conducted directly with Meta.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">6. Subscription Plans &amp; Billing</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.1 Available Plans</h3>
          <p className="text-muted-foreground">WABDesk offers the following subscription tiers as described on our <Link href="/#pricing" className="text-primary underline-offset-4 hover:underline">Pricing page</Link>: <strong className="text-foreground">Free</strong>, <strong className="text-foreground">Starter</strong>, <strong className="text-foreground">Growth</strong>, and <strong className="text-foreground">Business</strong>. We reserve the right to modify plan features and limits with 30 days notice to existing subscribers.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.2 Paddle as Merchant of Record</h3>
          <p className="text-muted-foreground">All payments are processed by <strong className="text-foreground">Paddle.com Market Limited (&ldquo;Paddle&rdquo;)</strong>, who acts as Merchant of Record for all WABDesk transactions. By subscribing to a paid plan, you also agree to <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">Paddle&rsquo;s Terms of Service</a>.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.3 Recurring Billing</h3>
          <p className="text-muted-foreground">Paid subscriptions are billed on a recurring basis (monthly or annually). By subscribing, you authorize Paddle to charge your payment method automatically on each renewal date. Annual subscriptions receive approximately 20% off compared to monthly pricing.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.4 Free Plan</h3>
          <p className="text-muted-foreground">The Free plan provides limited access to WABDesk features at no charge. We reserve the right to modify Free plan limits or discontinue it with 30 days notice. Accounts inactive for more than 90 consecutive days may be suspended.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.5 Upgrades &amp; Downgrades</h3>
          <p className="text-muted-foreground">You may upgrade your plan at any time; the upgrade takes effect immediately with prorated billing. Downgrades take effect at the start of the next billing cycle.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.6 Cancellation</h3>
          <p className="text-muted-foreground">You may cancel your subscription at any time through <strong className="text-foreground">Settings → Billing</strong>. Upon cancellation:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Your access to paid features continues until the end of your current billing period</li>
            <li>No further charges will be made after the current billing period</li>
            <li>Your data is retained for 30 days after the billing period ends</li>
            <li>After 30 days, your data is permanently and irrecoverably deleted</li>
            <li>We recommend exporting your data (Settings → Data &amp; Privacy) before cancellation</li>
          </ul>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.7 Refund Policy</h3>
          <p className="text-muted-foreground">All payments are final and non-refundable except where required by applicable consumer protection law, for accidental duplicate charges, or at our sole discretion for exceptional circumstances. Refund requests: email <a href="mailto:billing@wabdesk.com" className="text-primary underline-offset-4 hover:underline">billing@wabdesk.com</a> within 14 days of the charge.</p>
          <p className="mt-2 text-muted-foreground"><strong className="text-foreground">EU/EEA consumers:</strong> You have a statutory 14-day right of withdrawal, provided you have not yet used the Service. By activating WABDesk, you expressly request immediate performance and acknowledge that the right of withdrawal is waived upon activation.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.8 Failed Payments</h3>
          <p className="text-muted-foreground">If a payment fails, we will notify you and attempt to retry. After a grace period of <strong className="text-foreground">7 days</strong>, your account may be automatically downgraded to the Free plan. Full access is restored upon payment resolution within 30 days.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">6.9 Pricing Changes</h3>
          <p className="text-muted-foreground">We will provide at least <strong className="text-foreground">30 days&rsquo; written notice</strong> before any price increase. You may cancel before the price increase takes effect if you do not accept the new pricing.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">7. Acceptable Use Policy</h2>
          <p className="text-muted-foreground">You agree that you will NOT use WABDesk to:</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Violate any applicable laws, regulations, or these Terms</li>
            <li>Infringe on any third party&rsquo;s intellectual property, privacy, or other legal rights</li>
            <li>Transmit, store, or process malware, viruses, or any malicious code</li>
            <li>Attempt to gain unauthorized access to WABDesk systems or other users&rsquo; accounts</li>
            <li>Conduct denial-of-service attacks or degrade WABDesk&rsquo;s performance</li>
            <li>Reverse engineer, decompile, or derive source code from WABDesk</li>
            <li>Resell, sublicense, or commercially redistribute WABDesk without prior written consent</li>
            <li>Use automated scripts or scrapers to extract data beyond normal use</li>
            <li>Engage in harassment, threats, abuse, or discrimination against any person</li>
            <li>Store, transmit, or process child sexual abuse material (CSAM)</li>
            <li>Facilitate illegal gambling, controlled substances, illegal weapons, or human trafficking</li>
            <li>Circumvent any plan limits, usage restrictions, or billing mechanisms</li>
            <li>Use WABDesk to contact individuals who have explicitly opted out of your communications</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">8. Agent Roles &amp; Permissions</h2>
          <p className="text-muted-foreground">WABDesk enforces three role tiers: <strong className="text-foreground">Admin</strong>, <strong className="text-foreground">Supervisor</strong>, and <strong className="text-foreground">Agent</strong>. Role-based access controls are enforced server-side and cannot be bypassed client-side.</p>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li><strong className="text-foreground">Admin:</strong> Full control over all Tenant settings, billing, agents, channels, and data</li>
            <li><strong className="text-foreground">Supervisor:</strong> Can manage Agents, view all conversations and analytics; cannot modify billing or WABA settings</li>
            <li><strong className="text-foreground">Agent:</strong> Can only access and reply to conversations assigned to them</li>
          </ul>
          <p className="mt-3 text-muted-foreground">Admins are responsible for ensuring all Agents and Supervisors comply with these Terms. Violations by Agents are attributable to the Tenant.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">9. Data, Privacy &amp; Your Responsibilities</h2>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.1 Data Ownership</h3>
          <p className="text-muted-foreground">You retain full ownership of all data you upload to or generate within WABDesk. You grant WABDesk a limited, non-exclusive, worldwide license to process this data solely to provide the Service to you.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.2 Data Processing Agreement (DPA)</h3>
          <p className="text-muted-foreground">For users in the EU/EEA, WABDesk acts as your Data Processor for your Contacts&rsquo; personal data. By agreeing to these Terms, you also agree to our DPA, available at <Link href="/dpa" className="text-primary underline-offset-4 hover:underline">wabdesk.com/dpa</Link> or upon request at <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.</p>

          <h3 className="mb-2 mt-4 font-semibold text-base">9.3 Your Responsibilities as Data Controller</h3>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>Obtaining all legally required consents from your customers for WhatsApp messaging and data processing</li>
            <li>Complying with all applicable data protection laws in relation to your Contacts&rsquo; data</li>
            <li>Not uploading special categories of sensitive personal data without appropriate legal basis</li>
            <li>Ensuring your use of WhatsApp messaging complies with all applicable anti-spam laws</li>
            <li>Having a lawful basis to process and message each Contact</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">10. Intellectual Property</h2>
          <h3 className="mb-2 mt-4 font-semibold text-base">10.1 WABDesk&rsquo;s IP</h3>
          <p className="text-muted-foreground">WABDesk, its technology, UI, branding, and all associated intellectual property are owned by or licensed to [Company Legal Name]. These Terms grant you a limited, non-exclusive, non-transferable, revocable license to use WABDesk solely for your internal business purposes during an active subscription.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">10.2 Your Content</h3>
          <p className="text-muted-foreground">You retain all rights to Content you create within WABDesk. You represent that you own or have the necessary rights to all Content you upload.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">10.3 Feedback</h3>
          <p className="text-muted-foreground">If you provide feedback or suggestions about WABDesk, you grant us a perpetual, royalty-free, worldwide license to use, modify, and incorporate such feedback without any obligation of compensation.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">11. Confidentiality</h2>
          <p className="text-muted-foreground">Each party agrees to keep confidential all non-public information of the other party disclosed in connection with WABDesk, including API credentials, access tokens, business data, and pricing terms. This obligation does not apply to information that: (a) is or becomes publicly available through no fault of the receiving party; (b) was independently developed; or (c) must be disclosed by law or court order.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">12. Service Level &amp; Availability</h2>
          <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
            <li>We do not guarantee 100% uptime or uninterrupted access</li>
            <li>We may perform scheduled maintenance with advance notice where practicable</li>
            <li>Service disruptions caused by Meta&rsquo;s API, Convex, Vercel, Clerk, or other providers are outside our control</li>
            <li>We will make commercially reasonable efforts to restore service promptly after any outage</li>
          </ul>
          <p className="mt-3 text-muted-foreground">Formal SLA commitments are available for Business plan subscribers — contact <a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a>.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">13. Disclaimers &amp; Warranties</h2>
          <p className="text-muted-foreground">We warrant that WABDesk will perform materially as described in our documentation under normal use. Except as expressly stated, WABDesk is provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant the accuracy of analytics, reports, or delivery statistics, nor that Meta&rsquo;s WhatsApp API will remain available at any particular time.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">14. Limitation of Liability</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-3">
            <p className="text-muted-foreground">TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</p>
            <ol className="mt-2 list-decimal space-y-2 ps-6 text-muted-foreground">
              <li>WABDESK&rsquo;S TOTAL CUMULATIVE LIABILITY SHALL NOT EXCEED THE TOTAL AMOUNT YOU PAID TO WABDESK IN THE <strong className="text-foreground">12 MONTHS</strong> PRECEDING THE EVENT GIVING RISE TO THE CLAIM.</li>
              <li>WABDESK IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOSS OF DATA, OR BUSINESS INTERRUPTION.</li>
              <li>WABDESK IS NOT LIABLE FOR META&rsquo;S ACTIONS REGARDING YOUR WABA, INCLUDING SUSPENSION OR TERMINATION.</li>
              <li>WABDESK IS NOT LIABLE FOR SERVICE INTERRUPTIONS CAUSED BY THIRD-PARTY INFRASTRUCTURE PROVIDERS.</li>
              <li>WABDESK IS NOT LIABLE FOR YOUR FAILURE TO COMPLY WITH APPLICABLE DATA PROTECTION LAWS OR META&rsquo;S WHATSAPP BUSINESS POLICY.</li>
            </ol>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">15. Indemnification</h2>
          <p className="text-muted-foreground">You agree to indemnify, defend, and hold harmless WABDesk, [Company Legal Name], and their respective officers, directors, employees, and agents from any third-party claims arising from or relating to: your use of WABDesk in violation of these Terms; your violation of Meta&rsquo;s WhatsApp Business Policy; Content you upload or process; your failure to obtain required consents; your Agents&rsquo; actions; or claims by your customers arising from your business practices.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">16. Termination</h2>
          <h3 className="mb-2 mt-4 font-semibold text-base">16.1 Termination by You</h3>
          <p className="text-muted-foreground">You may terminate your WABDesk account at any time by canceling your subscription in Settings → Billing and requesting account deletion by emailing <a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a>.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">16.2 Termination or Suspension by Us</h3>
          <p className="text-muted-foreground">We may immediately suspend or terminate your account if you materially breach these Terms, violate Meta&rsquo;s policies, engage in fraudulent activity, fail to pay after the 7-day grace period, or if required by law enforcement. For non-material breaches, we will provide written notice and a reasonable opportunity to cure.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">16.3 Effect of Termination</h3>
          <p className="text-muted-foreground">Upon termination: access is immediately revoked; data is retained for 30 days then permanently deleted (except billing records); all licenses are terminated; Sections 9–18 survive termination.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">17. Governing Law &amp; Dispute Resolution</h2>
          <h3 className="mb-2 mt-4 font-semibold text-base">17.1 Governing Law</h3>
          <p className="text-muted-foreground">These Terms are governed by the laws of <strong className="text-foreground">[Governing Jurisdiction — e.g., the Arab Republic of Egypt / the UAE / England and Wales]</strong>, without regard to its conflict of law principles.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">17.2 Informal Resolution</h3>
          <p className="text-muted-foreground">Before initiating any formal dispute process, contact us at <a href="mailto:legal@wabdesk.com" className="text-primary underline-offset-4 hover:underline">legal@wabdesk.com</a> and attempt in good faith to resolve the dispute informally within 30 days.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">17.3 Binding Arbitration</h3>
          <p className="text-muted-foreground">If informal resolution fails, disputes shall be submitted to binding arbitration under the rules of the <strong className="text-foreground">Cairo Regional Centre for International Commercial Arbitration (CRCICA)</strong> for MENA-based customers, or the <strong className="text-foreground">International Chamber of Commerce (ICC)</strong> for international customers.</p>
          <h3 className="mb-2 mt-4 font-semibold text-base">17.4 EU/EEA Consumer Rights</h3>
          <p className="text-muted-foreground">Nothing in these Terms limits the statutory rights of EU/EEA consumers. EU/EEA consumers may use the EU Online Dispute Resolution platform at <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">ec.europa.eu/consumers/odr/</a>.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">18. Changes to These Terms</h2>
          <p className="text-muted-foreground">For material changes, we will provide at least <strong className="text-foreground">14 days&rsquo; advance notice</strong> by email and in-app notification. Your continued use of WABDesk after the effective date constitutes your acceptance. If you do not agree to the revised Terms, you must cancel your subscription before the changes take effect.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">19. General Provisions</h2>
          <div className="space-y-4">
            {[
              ["19.1 Entire Agreement", "These Terms, together with the Privacy Policy and any applicable DPA, constitute the entire agreement between you and WABDesk regarding the Service."],
              ["19.2 Severability", "If any provision is found invalid, it will be modified to the minimum extent necessary, and the remaining provisions continue in full force."],
              ["19.3 No Waiver", "Failure to enforce any right or provision does not constitute a waiver of that right or provision in any future instance."],
              ["19.4 Assignment", "You may not assign your rights under these Terms without our prior written consent. We may assign our rights and obligations to a successor entity upon notice to you."],
              ["19.5 Force Majeure", "Neither party is liable for failure or delay in performance caused by events beyond their reasonable control, including Meta platform outages, natural disasters, war, pandemics, or government actions."],
              ["19.6 Relationship of Parties", "The parties are independent contractors. Nothing in these Terms creates a partnership, joint venture, agency, franchise, employment, or fiduciary relationship."],
            ].map(([title, text]) => (
              <div key={title as string}>
                <h3 className="font-semibold text-base">{title}</h3>
                <p className="mt-1 text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">20. Contact Information</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-4 space-y-2">
            <p className="text-muted-foreground"><strong className="text-foreground">Legal / Terms Inquiries:</strong>{" "}<a href="mailto:legal@wabdesk.com" className="text-primary underline-offset-4 hover:underline">legal@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">Billing &amp; Payments:</strong>{" "}<a href="mailto:billing@wabdesk.com" className="text-primary underline-offset-4 hover:underline">billing@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">Privacy &amp; Data:</strong>{" "}<a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">General Support:</strong>{" "}<a href="mailto:support@wabdesk.com" className="text-primary underline-offset-4 hover:underline">support@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">Registered Address:</strong> [Company Legal Name], [Full Address]</p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">← Privacy Policy</Link>
        <Link href="/" className="hover:text-foreground transition-colors">Back to Home →</Link>
      </div>
    </div>
  );
}
