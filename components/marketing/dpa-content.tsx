"use client";

import Link from "next/link";
import { useMarketingLocale } from "@/lib/marketing/i18n";

export function DpaContent() {
  const { locale } = useMarketingLocale();
  if (locale === "ar") return <DpaAr />;
  return <DpaEn />;
}

function DpaAr() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">اتفاقية معالجة البيانات</h1>
        <p className="text-sm text-muted-foreground">
          <strong>الإصدار:</strong> 1.0 &nbsp;·&nbsp;{" "}
          <strong>آخر تحديث:</strong> 28 أبريل 2026 &nbsp;·&nbsp;{" "}
          <strong>تاريخ السريان:</strong> 28 أبريل 2026
        </p>

        <div className="mt-4 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">كيف تعمل هذه الاتفاقية:</strong> تُدرج اتفاقية معالجة البيانات هذه (&quot;DPA&quot;) بالإشارة وتُشكّل جزءاً من{" "}
            <Link href="/terms" className="text-primary underline-offset-4 hover:underline">شروط الخدمة</Link> الخاصة بواب ديسك. بقبولك لشروط الخدمة، فأنت (المتحكم) تقبل هذه الاتفاقية في الوقت ذاته. لا يلزم أي توقيع منفصل. إذا كانت مؤسستك تحتاج إلى نسخة موقّعة للسجلات، راسلنا على{" "}
            <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.
          </p>
        </div>

        <p className="mt-4 text-muted-foreground leading-relaxed">
          تحكم هذه الاتفاقية معالجة البيانات الشخصية من قِبل واب ديسك (&quot;المعالج&quot;) نيابةً عن الشركة المشتركة (&quot;المتحكم&quot;) في سياق خدمة واب ديسك. تستوفي هذه الاتفاقية متطلبات المادة 28 من GDPR ونظام حماية البيانات الشخصية السعودي (PDPL) والقانون الاتحادي الإماراتي رقم 45/2021 وقانون LGPD البرازيلي والتشريعات المعادلة لحماية البيانات على مستوى العالم.
        </p>
      </div>

      <div className="space-y-10 text-sm leading-7">

        <section>
          <h2 className="mb-3 text-xl font-semibold">١. التعريفات</h2>
          <div className="space-y-2">
            {[
              ["المتحكم", "عميل واب ديسك (المستأجر) الذي يحدد أغراض ووسائل معالجة البيانات الشخصية للعملاء النهائيين (جهات الاتصال)"],
              ["المعالج", "واب ديسك ([الاسم القانوني للشركة])، الذي يعالج البيانات الشخصية نيابةً عن المتحكم لتقديم خدمة واب ديسك"],
              ["صاحب البيانات", "شخص طبيعي محدد الهوية أو قابل للتحديد تُعالَج بياناته الشخصية — بصفة رئيسية العملاء النهائيون للمتحكم (جهات الاتصال) الذين يتواصلون معه عبر واتساب"],
              ["البيانات الشخصية", "أي معلومات تتعلق بشخص طبيعي محدد الهوية أو قابل للتحديد، وفقاً لتعريفها في قانون حماية البيانات المعمول به"],
              ["المعالجة", "أي عملية تُجرى على البيانات الشخصية، بما في ذلك الجمع والتخزين والاسترداد والاستخدام والإفصاح أو الحذف"],
              ["المعالج الفرعي", "أي طرف ثالث يستعين به المعالج لتنفيذ أنشطة المعالجة نيابةً عن المتحكم"],
              ["حادثة الأمان / اختراق البيانات الشخصية", "أي تدمير أو فقدان أو تعديل أو إفصاح غير مصرّح به أو وصول غير مصرّح به إلى البيانات الشخصية، عرضياً كان أم غير مشروع"],
              ["GDPR", "اللائحة الأوروبية العامة لحماية البيانات (اللائحة (EU) 2016/679)"],
              ["SCCs", "البنود التعاقدية القياسية — البنود المعتمدة من المفوضية الأوروبية لنقل البيانات الدولي (القرار 2021/914)"],
              ["الخدمات / المنصة", "منصة واب ديسك متعددة الوكلاء لبريد واتساب الوارد وجميع الميزات المرتبطة كما هو موضح في شروط الخدمة"],
            ].map(([term, def]) => (
              <div key={term} className="flex gap-2">
                <span className="font-semibold text-foreground shrink-0">&quot;{term}&quot;:</span>
                <span className="text-muted-foreground">{def}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٢. وصف المعالجة (الملحق الأول — المادة 28 من GDPR)</h2>
          <p className="mb-4 text-muted-foreground">يوثّق الجدول التالي موضوع المعالجة وطبيعتها وغرضها ونطاقها وفقاً لما تشترطه المادة 28(3) من GDPR والملحق الأول من بنود SCCs الأوروبية.</p>

          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">موضوع المعالجة</p>
              <p className="mt-1 text-muted-foreground">البيانات الشخصية للعملاء النهائيين للمتحكم (جهات اتصال واتساب) وأعضاء الفريق (الوكلاء)، التي تُعالَج عبر منصة واب ديسك لتقديم خدمة البريد الوارد المشترك متعدد الوكلاء عبر واتساب للأعمال.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">مدة المعالجة</p>
              <p className="mt-1 text-muted-foreground">طوال مدة الاشتراك النشط للمتحكم في واب ديسك، بالإضافة إلى 30 يوماً بعد إنهاء الاشتراك أو طلب حذف الحساب (فترة الاحتفاظ لاستعادة البيانات). تُحتفظ بسجلات الفواتير لمدة 7 سنوات للامتثال الضريبي.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">طبيعة المعالجة</p>
              <p className="mt-1 text-muted-foreground">جمع البيانات الشخصية وتخزينها واسترجاعها وعرضها وهيكلتها وأرشفتها وحذفها عبر منصة واب ديسك. إرسال الرسائل إلى واجهة برمجة تطبيقات واتساب Business Cloud من ميتا واستقبالها نيابةً عن المتحكم.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">غرض المعالجة</p>
              <p className="mt-1 text-muted-foreground">تزويد المتحكم ببريد وارد مشترك في الوقت الفعلي متعدد الوكلاء لمحادثات واتساب للأعمال؛ وإدارة جهات الاتصال؛ وإدارة الفريق؛ والتحليلات وإعداد التقارير؛ وقواعد الأتمتة؛ وتصدير البيانات — حصراً وفق تعليمات المتحكم.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">فئات البيانات الشخصية المعالجة</p>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
                <li>أرقام هواتف واتساب (بتنسيق E.164)</li>
                <li>أسماء العرض على واتساب (كما ضبطها صاحب البيانات على جهازه)</li>
                <li>محتوى الرسائل: النصوص والصور والمستندات والرسائل الصوتية وغيرها من الوسائط المرسلة عبر واتساب</li>
                <li>بيانات وصف الرسائل: الطوابع الزمنية وحالة التسليم ومعرّفات الرسائل</li>
                <li>بيانات ملف تعريف جهات الاتصال التي يضيفها وكلاء المتحكم: الأسماء المخصصة والعلامات والملاحظات والحقول المخصصة (مثل معرّفات الطلبات والمدينة)</li>
                <li>بيانات حسابات الوكلاء: الاسم وعنوان البريد الإلكتروني والدور ضمن مؤسسة المستأجر</li>
                <li>بيانات ملف تعريف واتساب للأعمال: اسم الشركة والوصف والعنوان والفئة (لحساب واتساب للمتحكم)</li>
              </ul>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">الفئات الخاصة من البيانات الشخصية</p>
              <p className="mt-1 text-muted-foreground">لا يعالج واب ديسك عمداً الفئات الخاصة من البيانات الشخصية (المادة 9 من GDPR) كالبيانات الصحية أو البيانات البيومترية أو الأصل العرقي أو الآراء السياسية أو المعتقدات الدينية أو التوجه الجنسي. يجب ألا يوجّه المتحكم واب ديسك لمعالجة هذه البيانات دون اتفاقية كتابية مسبقة وضمانات مناسبة. يتحمّل المتحكم وحده مسؤولية ضمان عدم قيام وكلائه بجمع هذه البيانات أو تخزينها من خلال واب ديسك.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">فئات أصحاب البيانات</p>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
                <li><strong className="text-foreground">جهات الاتصال:</strong> العملاء النهائيون للمتحكم الذين يتواصلون عبر واتساب — الفئة الرئيسية لأصحاب البيانات</li>
                <li><strong className="text-foreground">الوكلاء / أعضاء الفريق:</strong> موظفو المتحكم أو مقاولوه الذين يستخدمون واب ديسك لإدارة المحادثات</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٣. التزامات المعالج (المادة 28(3) من GDPR)</h2>
          <p className="mb-3 text-muted-foreground">يتعهد واب ديسك، بوصفه معالجاً، بالالتزامات التالية:</p>

          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-base">٣.١ المعالجة وفق تعليمات المتحكم فقط</h3>
              <p className="mt-1 text-muted-foreground">يعالج واب ديسك البيانات الشخصية فقط وفق التعليمات الموثّقة من المتحكم، بما في ذلك ما هو منصوص عليه في هذه الاتفاقية وشروط الخدمة. إذا اشترط قانون أوروبي أو قانون دولة عضو على واب ديسك معالجة البيانات الشخصية خارج تعليمات المتحكم، فسيُخطر واب ديسك المتحكم بهذا المتطلب القانوني قبل المعالجة، ما لم يحظر القانون ذلك. سيُخطر واب ديسك المتحكم فوراً إذا رأى أن أي تعليمة تنتهك قانون حماية البيانات المعمول به.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٢ سرية المعالجة</h3>
              <p className="mt-1 text-muted-foreground">يضمن واب ديسك أن جميع الموظفين المفوّضين بمعالجة البيانات الشخصية بموجب هذه الاتفاقية ملتزمون بالتزامات سرية مناسبة (تعاقدية كانت أم قانونية). يُقيَّد الوصول إلى البيانات الشخصية على أساس الحاجة إلى المعرفة. لا يصل أعضاء فريق واب ديسك إلى محتوى محادثات المتحكم إلا حيثما كان ذلك ضرورياً لتقديم الدعم الفني وبموافقة المتحكم فحسب.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٣ التدابير الأمنية التقنية والتنظيمية</h3>
              <p className="mt-1 text-muted-foreground">يطبّق واب ديسك ويحافظ على التدابير الأمنية التقنية والتنظيمية الموضّحة في <strong className="text-foreground">الملحق الثاني</strong> من هذه الاتفاقية (القسم ٦ أدناه)، وفقاً لدرجة المخاطر، كما تشترط المادة 32 من GDPR.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٤ الاستعانة بمعالجين فرعيين</h3>
              <p className="mt-1 text-muted-foreground">لا يستعين واب ديسك بأي معالج فرعي جديد لمعالجة البيانات الشخصية للمتحكم دون إشعار كتابي مسبق للمتحكم (لا يقل عن <strong className="text-foreground">14 يوماً</strong>). يُقدَّم الإشعار عبر البريد الإلكتروني لمشرف الحساب وبتحديث <strong className="text-foreground">الملحق الثالث</strong> (القسم ٧ أدناه). يجوز للمتحكم الاعتراض على معالج فرعي جديد خلال 14 يوماً من الإشعار. إذا تعذّر حل اعتراض مشروع، يجوز للمتحكم إنهاء الخدمات المعنية بإشعار كتابي خلال 30 يوماً من الاعتراض. يفرض واب ديسك على جميع المعالجين الفرعيين التزامات حماية بيانات مكافئة لتلك الواردة في هذه الاتفاقية، بموجب عقد. يظل واب ديسك مسؤولاً بالكامل تجاه المتحكم عن وفاء المعالجين الفرعيين بالتزاماتهم. يمنح المتحكم تفويضاً كتابياً عاماً لواب ديسك للاستعانة بالمعالجين الفرعيين المدرجين في الملحق الثالث (القسم ٧)، مع إجراء الإشعار المذكور أعلاه لأي إضافات جديدة.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٥ المساعدة في حقوق أصحاب البيانات</h3>
              <p className="mt-1 text-muted-foreground">مراعاةً لطبيعة المعالجة، يساعد واب ديسك المتحكم في الوفاء بالتزاماته للاستجابة لطلبات أصحاب البيانات بموجب القانون المعمول به (الوصول والتصحيح والمحو والتقييد وقابلية النقل والاعتراض)، وذلك بـ:</p>
              <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
                <li>توفير وظيفة تصدير البيانات (الإعدادات ← البيانات والخصوصية) التي تمكّن المتحكم من تصدير جميع بيانات جهات الاتصال وسجل المحادثات بصيغ منظّمة (CSV وJSON) لتلبية طلبات قابلية النقل والوصول</li>
                <li>تمكين المتحكم من حذف سجلات جهات اتصال فردية وسجلات المحادثات من داخل منصة واب ديسك</li>
                <li>الاستجابة للطلبات الكتابية من المتحكم للمساعدة في طلبات أصحاب بيانات محددة خلال <strong className="text-foreground">7 أيام عمل</strong></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٦ المساعدة في الأمان وإشعار الاختراق</h3>
              <p className="mt-1 text-muted-foreground">يساعد واب ديسك المتحكم في ضمان الامتثال للمواد 32–36 من GDPR (الأمان وإشعار الاختراق وتقييمات الأثر على حماية البيانات والتشاور المسبق).</p>
              <p className="mt-2 text-muted-foreground"><strong className="text-foreground">إشعار الاختراق:</strong> في حال إدراك واب ديسك لوقوع حادثة أمنية تؤثر على البيانات الشخصية للمتحكم، سيقوم واب ديسك بـ:</p>
              <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
                <li>إخطار المتحكم دون تأخير لا مبرر له وفي جميع الأحوال خلال <strong className="text-foreground">48 ساعة</strong> من إدراك الحادثة (مما يتيح للمتحكم الوفاء بالتزام الإشعار التنظيمي البالغ 72 ساعة)</li>
                <li>تقديم ما يلي كحد أدنى: طبيعة الاختراق، وفئات وعدد أصحاب البيانات والسجلات المتأثرة تقريباً، والعواقب المحتملة، والتدابير المتخذة أو المقترحة لمعالجة الاختراق</li>
                <li>التعاون الكامل مع جهود تحقيق المتحكم ومعالجة الحادثة</li>
              </ul>
              <p className="mt-2 text-muted-foreground">تُرسل إشعارات الاختراق إلى عنوان البريد الإلكتروني المسجّل لحساب مشرف المتحكم. يتحمّل المتحكم مسؤولية الحفاظ على تحديث هذا العنوان.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٧ المساعدة في تقييمات الأثر على حماية البيانات (DPIAs)</h3>
              <p className="mt-1 text-muted-foreground">إذا اضطر المتحكم إلى إجراء تقييم أثر على حماية البيانات (DPIA) بموجب المادة 35 من GDPR فيما يخص أنشطة المعالجة بموجب هذه الاتفاقية، فسيقدّم واب ديسك مساعدة معقولة، تشمل: توثيق أنشطة المعالجة والتدابير الأمنية التقنية والتنظيمية المطبّقة وتفاصيل المعالجين الفرعيين ومعلومات تدفق البيانات. تُرسل طلبات مساعدة DPIA إلى <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.</p>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٨ حذف البيانات أو إعادتها عند انتهاء الخدمة</h3>
              <p className="mt-1 text-muted-foreground">عند إنهاء اشتراك المتحكم أو انتهائه:</p>
              <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
                <li>يمكن للمتحكم تصدير جميع البيانات الشخصية (جهات الاتصال والمحادثات) عبر الإعدادات ← البيانات والخصوصية لمدة تصل إلى <strong className="text-foreground">30 يوماً</strong> بعد انتهاء الاشتراك</li>
                <li>بعد فترة الاحتفاظ البالغة 30 يوماً، يحذف واب ديسك جميع البيانات الشخصية بصورة دائمة وآمنة (باستثناء سجلات الفواتير المحتفظ بها للامتثال القانوني/الضريبي)</li>
                <li>يجوز للمتحكم طلب تأكيد كتابي بالحذف عبر مراسلة <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a></li>
                <li>تُحذف النسخ الاحتياطية كلياً خلال <strong className="text-foreground">90 يوماً</strong> من تاريخ الحذف</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.٩ حقوق التدقيق وإثبات الامتثال</h3>
              <p className="mt-1 text-muted-foreground">يُتيح واب ديسك للمتحكم جميع المعلومات المعقولة اللازمة لإثبات الامتثال للمادة 28 من GDPR، ويسمح بإجراء عمليات التدقيق والتفتيش من قِبل المتحكم أو مدقق مفوَّض، مع مراعاة ما يلي:</p>
              <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
                <li>يوفّر المتحكم ما لا يقل عن <strong className="text-foreground">30 يوماً من الإشعار الكتابي المسبق</strong> قبل أي تدقيق</li>
                <li>تُجرى عمليات التدقيق خلال ساعات العمل الرسمية ويجب ألا تُعطّل بشكل غير معقول عمليات واب ديسك أو بيانات العملاء الآخرين</li>
                <li>يوقّع المتحكم ومدققه اتفاقية سرية قبل الوصول إلى أي أنظمة أو وثائق واب ديسك</li>
                <li>يتحمّل المتحكم تكاليف أي تدقيق ما لم يكشف التدقيق عن عدم امتثال جوهري من جانب واب ديسك</li>
                <li>يجوز لواب ديسك تلبية طلبات التدقيق بتقديم شهادات أمنية حالية من طرف ثالث أو ملخصات اختبار الاختراق أو وثائق مكافئة بدلاً من التدقيق الميداني</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-base">٣.١٠ عدم استخدام البيانات خارج نطاق الخدمة</h3>
              <p className="mt-1 text-muted-foreground">لا يعالج واب ديسك البيانات الشخصية للمتحكم لأي غرض آخر غير تقديم الخدمات الموضّحة في هذه الاتفاقية وشروط الخدمة. على وجه التحديد، لن يقوم واب ديسك بـ:</p>
              <ul className="mt-2 list-disc space-y-1 ps-6 text-muted-foreground">
                <li>استخدام البيانات الشخصية للمتحكم لأغراض التسويق أو الإعلان الخاصة بواب ديسك</li>
                <li>بيع أو تأجير البيانات الشخصية للمتحكم لأي طرف ثالث</li>
                <li>استخدام محتوى رسائل واتساب لتدريب نماذج التعلم الآلي</li>
                <li>دمج أو تجميع البيانات الشخصية للمتحكم مع بيانات عملاء آخرين لأي غرض آخر غير التحليلات المجمّعة ومجهولة الهوية للمنصة</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٤. التزامات المتحكم</h2>
          <p className="mb-2 text-muted-foreground">بقبوله لهذه الاتفاقية، يُقرّ المتحكم ويضمن ويوافق على ما يلي:</p>
          <ul className="list-disc space-y-2 ps-6 text-muted-foreground">
            <li>يمتلك <strong className="text-foreground">أساساً قانونياً</strong> (المادة 6 من GDPR) لكل نشاط معالجة يوجّه واب ديسك للقيام به نيابةً عنه</li>
            <li>حصل على جميع <strong className="text-foreground">الموافقات</strong> المطلوبة قانوناً من عملائه النهائيين (جهات الاتصال) لرسائل واتساب ومعالجة بياناتهم الشخصية كما هو موضح في هذه الاتفاقية</li>
            <li>نشر إشعار خصوصية لجهات اتصاله يصف بدقة أنشطة المعالجة التي تُنفَّذ عبر واب ديسك، بما في ذلك دور واب ديسك كمعالج بيانات وميتا كمتحكم مستقل</li>
            <li>لن يوجّه واب ديسك لمعالجة <strong className="text-foreground">الفئات الخاصة من البيانات</strong> (المادة 9 من GDPR) أو بيانات متعلقة بالإدانات الجنائية دون اتفاقية كتابية مسبقة وضمانات مناسبة</li>
            <li>سيضمن تدريب جميع الوكلاء والمشرفين المتقدمين المستخدمين لواب ديسك على التزامات حماية البيانات والامتثال لها</li>
            <li>يمتثل لجميع قوانين حماية البيانات المعمول بها في الولايات القضائية التي يعمل فيها وفي الولايات القضائية التي توجد فيها جهات اتصاله</li>
            <li>سيُخطر واب ديسك فوراً بأي ظروف قد تؤثر على قدرة واب ديسك على الامتثال لهذه الاتفاقية</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٥. نقل البيانات الدولي</h2>
          <p className="mb-3 text-muted-foreground">قد تُنقل البيانات الشخصية المعالجة بموجب هذه الاتفاقية إلى دول خارج ولاية المتحكم القضائية ومعالجتها فيها، بما في ذلك الولايات المتحدة الأمريكية حيث يوجد مزودو البنية التحتية لواب ديسك (Convex وVercel وClerk).</p>

          <div className="space-y-4">
            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">متحكمو الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية — البنود التعاقدية القياسية</p>
              <p className="mt-1 text-muted-foreground">بالنسبة لعمليات نقل البيانات الشخصية من متحكمي الاتحاد الأوروبي/المنطقة الاقتصادية الأوروبية إلى واب ديسك أو معالجيه الفرعيين في دول ثالثة، تُدرج <strong className="text-foreground">البنود التعاقدية القياسية للاتحاد الأوروبي (النموذج الثاني: من المتحكم إلى المعالج)</strong> المعتمدة بموجب قرار المفوضية الأوروبية 2021/914 في هذه الاتفاقية بالإشارة وتسري على هذه التحويلات. في حال وجود تعارض بين البنود التعاقدية القياسية وهذه الاتفاقية، تكون الأولوية للبنود التعاقدية القياسية. نسخة من البنود التعاقدية القياسية متاحة من المفوضية الأوروبية وعند الطلب على <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>. أجرى واب ديسك تقييمات أثر النقل (TIAs) لجميع المعالجين الفرعيين الواقعين في دول ثالثة وتُتاح للمتحكمين عند الطلب.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">متحكمو المملكة المتحدة — الملحق البريطاني (UK IDTA)</p>
              <p className="mt-1 text-muted-foreground">بالنسبة لعمليات النقل من متحكمي المملكة المتحدة، يسري <strong className="text-foreground">ملحق نقل البيانات الدولي (UK IDTA)</strong> الصادر عن هيئة ICO البريطانية بموجب المادة 119A من قانون حماية البيانات لعام 2018 ويُدرج بالإشارة في هذه الاتفاقية.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">متحكمو المملكة العربية السعودية — الامتثال لنقل البيانات عبر الحدود وفق PDPL</p>
              <p className="mt-1 text-muted-foreground">بالنسبة للمتحكمين في المملكة العربية السعودية، تمتثل عمليات نقل البيانات الشخصية عبر الحدود لمتطلبات الهيئة السعودية للبيانات والذكاء الاصطناعي (SDAIA) بموجب المادة 16 من نظام PDPL، مع بنود تعاقدية تضمن مستوى حماية مكافئاً. يضمن واب ديسك أن الدول المستقبلة والمعالجين الفرعيين يوفّرون حماية كافية من خلال الالتزامات التعاقدية.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">متحكمو الإمارات — الامتثال لنقل البيانات وفق القانون الاتحادي 45/2021</p>
              <p className="mt-1 text-muted-foreground">تمتثل عمليات النقل من المتحكمين في الإمارات للقانون الاتحادي رقم 45 لسنة 2021، المادة 26، من خلال ضمانات تعاقدية تضمن أن البيانات الشخصية المنقولة خارج الإمارات تتلقى مستوى حماية كافياً مكافئاً لمتطلبات القانون الإماراتي.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">المتحكمون البرازيليون — الامتثال لنقل البيانات وفق LGPD</p>
              <p className="mt-1 text-muted-foreground">تمتثل عمليات النقل من المتحكمين البرازيليين للمادة 33 من LGPD من خلال البنود التعاقدية القياسية أو قرارات الكفاية المعترف بها من هيئة حماية البيانات البرازيلية (ANPD).</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">تدفقات بيانات ميتا / واتساب</p>
              <p className="mt-1 text-muted-foreground">يمر محتوى الرسائل المرسلة عبر واتساب عبر البنية التحتية العالمية لميتا. تعمل ميتا وفق آليات نقل البيانات الخاصة بها وهي متحكمة مستقلة في بيانات منصة واتساب. يتحمّل المتحكم مسؤولية ضمان أن استخدامه لواتساب يمتثل لقيود النقل المعمول بها في ولايته القضائية.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٦. الملحق الثاني — التدابير الأمنية التقنية والتنظيمية (المادة 32 من GDPR)</h2>
          <p className="mb-4 text-muted-foreground">التدابير التالية مطبّقة ومحافَظ عليها من قِبل واب ديسك بوصفه معالجاً، وفقاً لما تشترطه المادة 32 من GDPR والأحكام المعادلة في قوانين حماية البيانات المعمول بها.</p>

          <div className="space-y-4">
            {[
              {
                title: "التشفير",
                measures: [
                  "TLS 1.2+ لجميع البيانات أثناء النقل بين العملاء والخوادم والمعالجين الفرعيين",
                  "تشفير AES-256 للبيانات الحساسة في حالة السكون، بما في ذلك رموز وصول Meta API وأسرار Webhook ومفاتيح API",
                  "جميع رموز وصول ميتا مخزّنة مشفّرة على مستوى قاعدة البيانات؛ لا تُسجَّل أبداً ولا تُعرض على جانب العميل",
                  "HTTPS مفروض على جميع نقاط الاتصال مع رؤوس HSTS",
                ],
              },
              {
                title: "التحكم في الوصول والمصادقة",
                measures: [
                  "التحكم في الوصول القائم على الأدوار (مشرف، مشرف متقدم، وكيل) مُطبَّق على جانب الخادم على جميع استعلامات Convex والتحويلات",
                  "عزل صارم للمستأجرين مُطبَّق على مستوى هيكل قاعدة البيانات — الوصول إلى بيانات مستأجر آخر مستحيل هيكلياً",
                  "المصادقة متعددة العوامل (MFA) متاحة ومُشجَّع عليها لجميع حسابات المستخدمين (عبر Clerk)",
                  "وصول جميع الوكلاء مقيَّد بالمحادثات المعيّنة لهم (مُطبَّق على جانب الخادم وليس جانب العميل فحسب)",
                  "تُطبَّق مبدأ الحد الأدنى من الامتيازات على وصول فريق واب ديسك الداخلي إلى الأنظمة الإنتاجية",
                ],
              },
              {
                title: "سلامة البيانات وتوافرها",
                measures: [
                  "نسخ احتياطي تلقائي لقاعدة البيانات وفق جدول منتظم (تديره بنية تحتية Convex)",
                  "بيانات النسخ الاحتياطي مشفّرة بالكامل ومخزّنة في مواقع جغرافية متعددة",
                  "إجراءات الاستجابة للحوادث والتعافي من الكوارث جاهزة",
                  "مراقبة وتنبيه على الشذوذات في البنية التحتية",
                ],
              },
              {
                title: "إخفاء الهوية وتقليل البيانات",
                measures: [
                  "أرقام الهواتف مخزّنة بتنسيق E.164 الموحّد فقط؛ لا تخزين نصي حر لأرقام الهواتف",
                  "التحليلات مشتقة من بيانات مجمّعة ومجهولة الهوية حيثما لا تكون المعرّفات ضرورية",
                  "لا يُستخدم محتوى الرسائل لأي غرض آخر غير تقديم الخدمة",
                ],
              },
              {
                title: "المرونة والتعافي",
                measures: [
                  "البنية التحتية مصمّمة لتوافر عالٍ عبر منصتي Vercel وConvex",
                  "التحقق من توقيع Webhook (HMAC-SHA256) على جميع Webhooks الواردة من ميتا للحماية من الطلبات المزوّرة",
                  "تحديد المعدل والتحقق من صحة المدخلات على جميع نقاط اتصال API المواجهة للعموم",
                ],
              },
              {
                title: "الموظفون والتدابير التنظيمية",
                measures: [
                  "جميع موظفي واب ديسك الذين يصلون إلى البيانات الشخصية ملتزمون بالتزامات سرية",
                  "الوصول إلى بيانات الإنتاج مقيَّد للموظفين المصرّح لهم على أساس الحاجة إلى المعرفة",
                  "التوعية الأمنية المنتظمة ضمن فريق التطوير",
                  "إجراء مراجعات الاعتماد والثغرات الأمنية كجزء من التطوير المستمر",
                ],
              },
              {
                title: "الإشراف على المعالجين الفرعيين والأطراف الثالثة",
                measures: [
                  "اتفاقيات معالجة البيانات (DPAs) مبرمة مع جميع المعالجين الفرعيين المدرجين في الملحق الثالث",
                  "اختيار المعالجين الفرعيين على أساس وضعهم الأمني والامتثالي الموثّق (SOC 2 أو ISO 27001 أو ما يعادلهما)",
                  "مراجعة قائمة المعالجين الفرعيين وتحديثها بانتظام",
                ],
              },
            ].map((category) => (
              <div key={category.title} className="rounded-md border p-4">
                <p className="font-semibold text-foreground">{category.title}</p>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground">
                  {category.measures.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٧. الملحق الثالث — المعالجون الفرعيون المعتمدون</h2>
          <p className="mb-4 text-muted-foreground">يمنح المتحكم تفويضاً كتابياً عاماً لواب ديسك للاستعانة بالمعالجين الفرعيين التاليين. سيوفّر واب ديسك إشعاراً مسبقاً مدته 14 يوماً قبل إضافة أي معالج فرعي جديد. يجوز للمتحكم الاعتراض خلال فترة الإشعار كما هو موضح في القسم ٣.٤.</p>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">المعالج الفرعي</th>
                  <th className="px-3 py-2 text-start font-semibold">الدولة</th>
                  <th className="px-3 py-2 text-start font-semibold">غرض المعالجة</th>
                  <th className="px-3 py-2 text-start font-semibold">البيانات المنقولة</th>
                  <th className="px-3 py-2 text-start font-semibold">آلية النقل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { name: "Meta Platforms, Inc.", country: "الولايات المتحدة", purpose: "واجهة برمجة تطبيقات واتساب Business Cloud — إرسال الرسائل واستقبالها", data: "محتوى الرسائل والبيانات الوصفية وأرقام الهواتف وبيانات WABA", mechanism: "إطار النقل عبر الحدود الخاص بميتا؛ ميتا متحكم مستقل" },
                  { name: "Convex, Inc.", country: "الولايات المتحدة", purpose: "قاعدة البيانات في الوقت الفعلي والبنية التحتية للخلفية", data: "جميع بيانات التطبيق: المحادثات وجهات الاتصال والإعدادات والقوالب", mechanism: "SCCs (الاتحاد الأوروبي)، ضمانات تعاقدية (الولايات القضائية الأخرى)" },
                  { name: "Vercel, Inc.", country: "الولايات المتحدة", purpose: "استضافة تطبيق الويب وشبكة توصيل المحتوى (CDN)", data: "سجلات حركة الويب وعناوين IP وبيانات وصف الطلبات", mechanism: "SCCs (الاتحاد الأوروبي)، ضمانات تعاقدية (الولايات القضائية الأخرى)" },
                  { name: "Clerk, Inc.", country: "الولايات المتحدة", purpose: "مصادقة المستخدمين والجلسات وإدارة المؤسسات", data: "الاسم والبريد الإلكتروني وكلمات المرور المجزّأة ورموز الجلسة وعضوية المؤسسة", mechanism: "SCCs (الاتحاد الأوروبي)، ضمانات تعاقدية (الولايات القضائية الأخرى)" },
                  { name: "Resend", country: "الولايات المتحدة", purpose: "تسليم البريد الإلكتروني التعاملي", data: "الاسم وعنوان البريد الإلكتروني ومحتوى البريد (الدعوات والإيصالات)", mechanism: "SCCs (الاتحاد الأوروبي)، ضمانات تعاقدية (الولايات القضائية الأخرى)" },
                  { name: "Paddle.com Market Limited", country: "المملكة المتحدة", purpose: "معالجة المدفوعات وإدارة الاشتراكات (تاجر المدفوعات الرسمي)", data: "الاسم والبريد الإلكتروني وعنوان الفواتير وحالة الاشتراك", mechanism: "UK IDTA / SCCs (الاتحاد الأوروبي)؛ Paddle متحكم مستقل في بيانات الدفع" },
                  { name: "Google LLC (Google Fonts)", country: "الولايات المتحدة", purpose: "تسليم الخطوط (خطا Cairo وTajawal العربيان)", data: "عنوان IP (طلبات CDN يُبدؤها المتصفح)", mechanism: "SCCs (الاتحاد الأوروبي)؛ يُقلَّل التعرض عبر الاستضافة الذاتية حيثما أمكن" },
                ].map((sp) => (
                  <tr key={sp.name} className="even:bg-muted/20">
                    <td className="px-3 py-2 font-medium text-foreground">{sp.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.country}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.purpose}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.data}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.mechanism}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            آخر تحديث: 28 أبريل 2026. للاطلاع على القائمة الحالية أو لتلقّي إشعارات التغييرات، راسلنا على <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.
          </p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٨. المسؤولية</h2>
          <p className="text-muted-foreground">تخضع مسؤولية كل طرف بموجب هذه الاتفاقية (بما في ذلك انتهاكات البنود التعاقدية القياسية) للقيود والاستثناءات المنصوص عليها في <Link href="/terms" className="text-primary underline-offset-4 hover:underline">شروط الخدمة</Link> القسم 14 (تحديد المسؤولية)، بالقدر الذي يسمح به القانون المعمول به.</p>
          <p className="mt-3 text-muted-foreground">عندما يفرض GDPR أو البنود التعاقدية القياسية مسؤولية لا يمكن تقييدها تعاقدياً (مثل مطالبات أصحاب البيانات بموجب المادة 82 من GDPR)، فإن هذه المسؤولية غير مقيّدة بشروط الخدمة. فيما بين الطرفين، يتحمّل كل منهما المسؤولية عن أفعاله وإغفالاته التي تُسهم في أي ضرر يلحق بصاحب البيانات.</p>
          <p className="mt-3 text-muted-foreground">إذا أُلزم واب ديسك بالتعويض عن أضرار ناجمة عن تعليمات المعالجة غير المشروعة من المتحكم أو عدم امتثاله لقانون حماية البيانات، يجوز لواب ديسك المطالبة بالتعويض من المتحكم بالقدر الذي لم يكن واب ديسك مسؤولاً فيه عن الضرر.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">٩. القانون الحاكم</h2>
          <p className="text-muted-foreground">تخضع هذه الاتفاقية للقانون ذاته الذي يحكم شروط الخدمة (<strong className="text-foreground">[الولاية القضائية الحاكمة — مثلاً: جمهورية مصر العربية]</strong>)، باستثناء أن البنود التعاقدية القياسية تخضع للقانون المحدد فيها (قانون الاتحاد الأوروبي للنموذج الثاني)، ويخضع الملحق البريطاني للقانون الإنجليزي.</p>
          <p className="mt-3 text-muted-foreground">في حال وجود تعارض بين هذه الاتفاقية والبنود التعاقدية القياسية، تكون الأولوية للبنود التعاقدية القياسية فيما يخص عمليات النقل الخاضعة لها.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">١٠. التواصل وطلبات النسخة الموقّعة</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-4 space-y-2">
            <p className="text-muted-foreground">تسري هذه الاتفاقية تلقائياً عند قبول شروط الخدمة لواب ديسك. لا يلزم أي توقيع أو إجراء منفصل.</p>
            <p className="text-muted-foreground"><strong className="text-foreground">لطلب نسخة PDF موقّعة</strong> من هذه الاتفاقية لسجلاتك الامتثالية:</p>
            <p className="text-muted-foreground ps-4">
              أرسل بريداً إلكترونياً إلى{" "}
              <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>{" "}
              بالموضوع:{" "}
              <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">طلب نسخة موقّعة من اتفاقية DPA — [اسم شركتك]</span>
            </p>
            <p className="text-muted-foreground"><strong className="text-foreground">لطلبات مساعدة DPIA أو طلبات التدقيق:</strong>{" "}<a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">العنوان المسجّل:</strong> [الاسم القانوني للشركة]، [العنوان الكامل]</p>
          </div>
        </section>

      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">→ سياسة الخصوصية</Link>
        <Link href="/terms" className="text-primary underline-offset-4 hover:underline">شروط الخدمة ←</Link>
      </div>
    </div>
  );
}

function DpaEn() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 pb-24">
      <div className="mb-10 border-b pb-8">
        <h1 className="mb-2 text-4xl font-bold tracking-tight">Data Processing Agreement</h1>
        <p className="text-sm text-muted-foreground">
          <strong>Version:</strong> 1.0 &nbsp;·&nbsp;{" "}
          <strong>Last Updated:</strong> April 28, 2026 &nbsp;·&nbsp;{" "}
          <strong>Effective Date:</strong> April 28, 2026
        </p>

        <div className="mt-4 rounded-md border-l-4 border-primary bg-primary/5 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">How this DPA works:</strong> This Data Processing Agreement (&ldquo;DPA&rdquo;) is incorporated by reference into and forms part of WABDesk&rsquo;s{" "}
            <Link href="/terms" className="text-primary underline-offset-4 hover:underline">Terms of Service</Link>. By accepting the Terms of Service, you (the Controller) simultaneously accept this DPA. No separate signature is required. If your organization requires a countersigned copy for your records, email{" "}
            <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.
          </p>
        </div>

        <p className="mt-4 text-muted-foreground leading-relaxed">
          This DPA governs the processing of personal data by WABDesk (&ldquo;Processor&rdquo;) on behalf of the subscribing business (&ldquo;Controller&rdquo;) in connection with the WABDesk service. It satisfies the requirements of GDPR Article 28, Saudi Arabia&rsquo;s PDPL, UAE Federal Law No. 45/2021, Brazil&rsquo;s LGPD, and equivalent data protection legislation globally.
        </p>
      </div>

      <div className="space-y-10 text-sm leading-7">
        <section>
          <h2 className="mb-3 text-xl font-semibold">1. Definitions</h2>
          <div className="space-y-2">
            {[
              ["Controller", "The WABDesk customer (Tenant) who determines the purposes and means of processing personal data of their end customers (Contacts)"],
              ["Processor", "WABDesk ([Company Legal Name]), which processes personal data on behalf of the Controller to provide the WABDesk Service"],
              ["Data Subject", "An identified or identifiable natural person whose personal data is processed — primarily the Controller's end customers (Contacts) who message the Controller via WhatsApp"],
              ["Personal Data", "Any information relating to an identified or identifiable natural person, as defined under applicable data protection law"],
              ["Processing", "Any operation performed on personal data, including collection, storage, retrieval, use, disclosure, or deletion"],
              ["Sub-processor", "Any third party engaged by the Processor to carry out processing activities on behalf of the Controller"],
              ["Security Incident / Personal Data Breach", "Any accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to, personal data"],
              ["GDPR", "EU General Data Protection Regulation (Regulation (EU) 2016/679)"],
              ["SCCs", "Standard Contractual Clauses — the European Commission's approved clauses for international data transfers (Decision 2021/914)"],
              ["Services / Platform", "The WABDesk multi-agent WhatsApp inbox platform and all associated features as described in the Terms of Service"],
            ].map(([term, def]) => (
              <div key={term} className="flex gap-2">
                <span className="font-semibold text-foreground shrink-0">&ldquo;{term}&rdquo;:</span>
                <span className="text-muted-foreground">{def}</span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">2. Description of Processing (Annex I — GDPR Art. 28)</h2>
          <p className="mb-4 text-muted-foreground">The following table documents the subject matter, nature, purpose, and scope of processing as required by GDPR Article 28(3) and Annex I of the EU SCCs.</p>

          <div className="space-y-4">
            {[
              { title: "Subject Matter of Processing", body: "Personal data of the Controller's end customers (WhatsApp Contacts) and team members (Agents), processed through the WABDesk platform to deliver a shared multi-agent WhatsApp Business inbox service." },
              { title: "Duration of Processing", body: "For the duration of the Controller's active subscription to WABDesk, plus 30 days following subscription termination or account deletion request (retention period for data recovery). Billing records are retained for 7 years for tax compliance." },
              { title: "Nature of Processing", body: "Collection, storage, retrieval, display, structuring, archiving, and deletion of personal data via the WABDesk platform. Transmission of messages to and from Meta's WhatsApp Business Cloud API on the Controller's behalf." },
              { title: "Purpose of Processing", body: "Providing the Controller with a real-time, multi-agent shared inbox for WhatsApp Business conversations; contact management; team management; analytics and reporting; automation rules; and data export — solely as instructed by the Controller." },
            ].map((item) => (
              <div key={item.title} className="rounded-md border p-4">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-muted-foreground">{item.body}</p>
              </div>
            ))}

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">Categories of Personal Data Processed</p>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
                <li>WhatsApp phone numbers (E.164 format)</li>
                <li>WhatsApp display names (as set by the Contact on their device)</li>
                <li>Message content: text, images, documents, voice notes, and other media sent via WhatsApp</li>
                <li>Message metadata: timestamps, delivery status, message IDs</li>
                <li>Contact profile data added by the Controller&rsquo;s agents: custom names, tags, notes, custom fields (e.g., order IDs, city)</li>
                <li>Agent account data: name, email address, role within the Tenant organization</li>
                <li>WhatsApp Business profile data: business name, description, address, category (of the Controller&rsquo;s WhatsApp account)</li>
              </ul>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">Special Categories of Personal Data</p>
              <p className="mt-1 text-muted-foreground">WABDesk does not intentionally process special categories of personal data (GDPR Art. 9) such as health data, biometric data, racial or ethnic origin, political opinions, religious beliefs, or sexual orientation. The Controller must not instruct WABDesk to process such data without explicit prior written agreement and appropriate safeguards.</p>
            </div>

            <div className="rounded-md border p-4">
              <p className="font-semibold text-foreground">Categories of Data Subjects</p>
              <ul className="mt-1 list-disc space-y-1 ps-5 text-muted-foreground">
                <li><strong className="text-foreground">Contacts:</strong> End customers of the Controller who communicate via WhatsApp — the primary category of data subjects</li>
                <li><strong className="text-foreground">Agents / Team Members:</strong> Employees or contractors of the Controller who use WABDesk to manage conversations</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">3. Processor Obligations (GDPR Art. 28(3))</h2>
          <p className="mb-3 text-muted-foreground">WABDesk, as Processor, undertakes the following obligations:</p>
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold text-base">3.1 Process Only on Controller&rsquo;s Instructions</h3>
              <p className="mt-1 text-muted-foreground">WABDesk will process personal data only on documented instructions from the Controller. If required by EU or Member State law to process personal data beyond the Controller&rsquo;s instructions, WABDesk will inform the Controller before processing, unless prohibited by law. WABDesk will immediately inform the Controller if an instruction infringes applicable data protection law.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.2 Confidentiality of Processing</h3>
              <p className="mt-1 text-muted-foreground">WABDesk ensures that all personnel authorized to process personal data are bound by appropriate confidentiality obligations. Access to personal data is restricted on a strict need-to-know basis. WABDesk team members do not access Controller&rsquo;s conversation content except where necessary to provide technical support and only with the Controller&rsquo;s consent.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.3 Technical and Organizational Security Measures</h3>
              <p className="mt-1 text-muted-foreground">WABDesk implements and maintains the technical and organizational security measures described in <strong className="text-foreground">Annex II</strong> of this DPA (Section 6 below), appropriate to the risk, as required by GDPR Article 32.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.4 Sub-processor Engagement</h3>
              <p className="mt-1 text-muted-foreground">WABDesk shall not engage any new sub-processor without giving the Controller prior written notice (minimum <strong className="text-foreground">14 days</strong>). Notice will be provided via email to the account Admin and by updating <strong className="text-foreground">Annex III</strong> (Section 7 below). The Controller may object within 14 days. If a legitimate objection cannot be resolved, the Controller may terminate the applicable services within 30 days of the objection. WABDesk imposes equivalent data protection obligations on all sub-processors by contract and remains fully liable for their performance.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.5 Assistance with Data Subject Rights</h3>
              <p className="mt-1 text-muted-foreground">WABDesk will assist the Controller in fulfilling its obligations to respond to data subject requests (access, rectification, erasure, restriction, portability, objection) by: providing data export functionality (Settings → Data &amp; Privacy) in structured formats (CSV, JSON); enabling deletion of individual Contact records; and responding to written requests for assistance within <strong className="text-foreground">7 business days</strong>.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.6 Breach Notification</h3>
              <p className="mt-1 text-muted-foreground">In the event WABDesk becomes aware of a Security Incident, WABDesk will notify the Controller within <strong className="text-foreground">48 hours</strong> (allowing the Controller to meet its 72-hour GDPR obligation), providing: nature of the breach, categories and approximate number of data subjects and records affected, likely consequences, and measures taken or proposed to address the breach.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.7 Assistance with DPIAs</h3>
              <p className="mt-1 text-muted-foreground">WABDesk will provide reasonable assistance for any DPIA under GDPR Article 35, including documentation of processing activities, technical and organizational measures, sub-processor details, and data flow information. Requests should be sent to <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.8 Deletion or Return of Data at End of Service</h3>
              <p className="mt-1 text-muted-foreground">Upon termination: the Controller may export all data for up to <strong className="text-foreground">30 days</strong> after subscription end; after the 30-day retention window, WABDesk will permanently and securely delete all personal data; the Controller may request written confirmation of deletion at <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>; backup copies are fully purged within <strong className="text-foreground">90 days</strong> of the deletion date.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.9 Audit &amp; Compliance Demonstration Rights</h3>
              <p className="mt-1 text-muted-foreground">WABDesk will make available all information necessary to demonstrate compliance with GDPR Article 28, and will allow for audits and inspections, subject to: <strong className="text-foreground">30 days&rsquo; written notice</strong> before any audit; audits conducted during normal business hours without unreasonable disruption; the Controller and auditor signing a confidentiality agreement; the Controller bearing audit costs unless a material non-compliance is found. WABDesk may satisfy audit requests by providing current third-party security certifications or penetration test summaries.</p>
            </div>
            <div>
              <h3 className="font-semibold text-base">3.10 No Data Use Beyond Service Scope</h3>
              <p className="mt-1 text-muted-foreground">WABDesk will not: use the Controller&rsquo;s personal data for WABDesk&rsquo;s own marketing; sell or rent the Controller&rsquo;s personal data; use WhatsApp message content to train machine learning models; or aggregate the Controller&rsquo;s personal data with other customers&rsquo; data for any purpose other than anonymized, aggregated platform analytics.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">4. Controller Obligations</h2>
          <p className="mb-2 text-muted-foreground">By accepting this DPA, the Controller represents, warrants, and agrees that:</p>
          <ul className="list-disc space-y-2 ps-6 text-muted-foreground">
            <li>It has a <strong className="text-foreground">lawful basis</strong> (GDPR Art. 6) for each processing activity it instructs WABDesk to perform on its behalf</li>
            <li>It has obtained all legally required <strong className="text-foreground">consents</strong> from its end customers (Contacts) for WhatsApp messaging and for the processing of their personal data</li>
            <li>It has published a privacy notice to its Contacts that accurately describes the processing activities carried out via WABDesk, including WABDesk as a data processor and Meta as an independent data controller</li>
            <li>It will not instruct WABDesk to process <strong className="text-foreground">special categories of data</strong> (GDPR Art. 9) without explicit prior agreement and appropriate safeguards</li>
            <li>It will ensure all Agents and Supervisors are trained on and comply with applicable data protection obligations</li>
            <li>It complies with all applicable data protection laws in the jurisdictions in which it operates and in which its Contacts are located</li>
            <li>It will promptly notify WABDesk of any circumstances that could affect WABDesk&rsquo;s ability to comply with this DPA</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">5. International Data Transfers</h2>
          <p className="mb-3 text-muted-foreground">Personal data processed under this DPA may be transferred to and processed in countries outside the Controller&rsquo;s jurisdiction, including the United States, where WABDesk&rsquo;s infrastructure providers (Convex, Vercel, Clerk) are based.</p>
          <div className="space-y-4">
            {[
              { title: "EU/EEA Controllers — Standard Contractual Clauses", body: "For transfers from EU/EEA Controllers, the EU Standard Contractual Clauses (Module Two: Controller to Processor) as adopted by European Commission Decision 2021/914 are incorporated into this DPA by reference. In the event of a conflict, the SCCs take precedence. WABDesk has conducted Transfer Impact Assessments (TIAs) for all sub-processors in third countries, available to Controllers upon request." },
              { title: "UK Controllers — UK Addendum", body: "For transfers from UK Controllers, the International Data Transfer Addendum (UK IDTA) issued by the UK ICO under Section 119A of the Data Protection Act 2018 applies and is incorporated by reference into this DPA." },
              { title: "Saudi Arabia Controllers — PDPL Cross-Border Transfer Compliance", body: "For Controllers in Saudi Arabia, cross-border transfers comply with SDAIA's requirements under Saudi PDPL Article 16, with contractual clauses ensuring equivalent protection." },
              { title: "UAE Controllers — Federal Law No. 45/2021 Transfer Compliance", body: "Transfers from UAE Controllers comply with UAE Federal Law No. 45 of 2021, Article 26, through contractual safeguards ensuring adequate protection equivalent to UAE law requirements." },
              { title: "Brazilian Controllers — LGPD Transfer Compliance", body: "Transfers from Brazilian Controllers comply with LGPD Article 33 through standard contractual clauses or adequacy determinations recognized by Brazil's ANPD." },
              { title: "Meta / WhatsApp Data Flows", body: "Message content transmitted via WhatsApp passes through Meta's global infrastructure. Meta operates its own data transfer mechanisms and is an independent data controller for WhatsApp platform data. The Controller is responsible for ensuring their use of WhatsApp complies with applicable transfer restrictions in their jurisdiction." },
            ].map((item) => (
              <div key={item.title} className="rounded-md border p-4">
                <p className="font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">6. Annex II — Technical &amp; Organizational Security Measures (GDPR Art. 32)</h2>
          <p className="mb-4 text-muted-foreground">The following measures are implemented and maintained by WABDesk as Processor, as required by GDPR Article 32 and equivalent provisions in applicable data protection laws.</p>
          <div className="space-y-4">
            {[
              { title: "Encryption", measures: ["TLS 1.2+ for all data in transit between clients, servers, and sub-processors", "AES-256 encryption for sensitive data at rest, including Meta API access tokens, webhook secrets, and API keys", "All Meta access tokens stored encrypted at the database layer; never logged, never exposed client-side", "HTTPS enforced on all endpoints with HSTS headers"] },
              { title: "Access Control & Authentication", measures: ["Role-based access control (Admin, Supervisor, Agent) enforced server-side on all Convex queries and mutations", "Strict tenant isolation enforced at the database architecture level — cross-tenant data access is architecturally impossible", "Multi-factor authentication (MFA) available and encouraged for all user accounts (via Clerk)", "All agent access limited to conversations assigned to them (enforced server-side)", "Principle of least privilege applied to internal WABDesk team access to production systems"] },
              { title: "Data Integrity & Availability", measures: ["Automated database backups on a regular schedule (managed by Convex infrastructure)", "Backup data fully encrypted and stored in geographically redundant locations", "Incident response and disaster recovery procedures in place", "Monitoring and alerting on infrastructure anomalies"] },
              { title: "Pseudonymization & Minimization", measures: ["Phone numbers stored in standardized E.164 format only; no free-text phone storage", "Analytics derived from aggregated and anonymized data where identifiers are not required", "Message content not used for any purpose beyond service delivery"] },
              { title: "Resilience & Recovery", measures: ["Infrastructure designed for high availability across Vercel and Convex platforms", "Webhook signature verification (HMAC-SHA256) on all incoming Meta webhooks to prevent forged requests", "Rate limiting and input validation on all public-facing API endpoints"] },
              { title: "Personnel & Organizational Measures", measures: ["All WABDesk personnel with access to personal data are bound by confidentiality obligations", "Access to production data restricted to authorized personnel on a need-to-know basis", "Regular security awareness within the development team", "Dependency and security vulnerability audits conducted as part of ongoing development"] },
              { title: "Third-Party & Sub-processor Oversight", measures: ["Data Processing Agreements (DPAs) in place with all sub-processors listed in Annex III", "Sub-processors selected based on their demonstrated security and compliance posture (SOC 2, ISO 27001, or equivalent)", "Sub-processor list reviewed and updated on a regular basis"] },
            ].map((category) => (
              <div key={category.title} className="rounded-md border p-4">
                <p className="font-semibold text-foreground">{category.title}</p>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-muted-foreground">
                  {category.measures.map((m) => <li key={m}>{m}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">7. Annex III — Approved Sub-processors</h2>
          <p className="mb-4 text-muted-foreground">The Controller grants general written authorization for WABDesk to engage the following sub-processors. WABDesk will provide 14 days&rsquo; advance notice before adding any new sub-processor. The Controller may object within the notice period as described in Section 3.4.</p>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-start font-semibold">Sub-processor</th>
                  <th className="px-3 py-2 text-start font-semibold">Country</th>
                  <th className="px-3 py-2 text-start font-semibold">Processing Purpose</th>
                  <th className="px-3 py-2 text-start font-semibold">Data Transferred</th>
                  <th className="px-3 py-2 text-start font-semibold">Transfer Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { name: "Meta Platforms, Inc.", country: "USA", purpose: "WhatsApp Business Cloud API — message delivery & receipt", data: "Message content, metadata, phone numbers, WABA data", mechanism: "Meta's own cross-border framework; Meta is independent controller" },
                  { name: "Convex, Inc.", country: "USA", purpose: "Real-time database and serverless backend infrastructure", data: "All application data: conversations, contacts, settings, templates", mechanism: "SCCs (EU), contractual safeguards (other jurisdictions)" },
                  { name: "Vercel, Inc.", country: "USA", purpose: "Web application hosting and CDN", data: "Web traffic logs, IP addresses, request metadata", mechanism: "SCCs (EU), contractual safeguards (other jurisdictions)" },
                  { name: "Clerk, Inc.", country: "USA", purpose: "User authentication, sessions, organization management", data: "Name, email, hashed passwords, session tokens, org membership", mechanism: "SCCs (EU), contractual safeguards (other jurisdictions)" },
                  { name: "Resend", country: "USA", purpose: "Transactional email delivery", data: "Name, email address, email content (invitations, receipts)", mechanism: "SCCs (EU), contractual safeguards (other jurisdictions)" },
                  { name: "Paddle.com Market Limited", country: "UK", purpose: "Payment processing & subscription management (MoR)", data: "Name, email, billing address, subscription status", mechanism: "UK IDTA / SCCs (EU); Paddle is independent controller for payment data" },
                  { name: "Google LLC (Google Fonts)", country: "USA", purpose: "Font delivery (Cairo/Tajawal Arabic fonts)", data: "IP address (browser-initiated CDN requests)", mechanism: "SCCs (EU); minimized via self-hosting where feasible" },
                ].map((sp) => (
                  <tr key={sp.name} className="even:bg-muted/20">
                    <td className="px-3 py-2 font-medium text-foreground">{sp.name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.country}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.purpose}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.data}</td>
                    <td className="px-3 py-2 text-muted-foreground">{sp.mechanism}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Last updated: April 28, 2026. For the current live list or to be notified of changes, email <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a>.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">8. Liability</h2>
          <p className="text-muted-foreground">Each party&rsquo;s liability under this DPA (including for breaches of the SCCs) is subject to the limitations and exclusions set out in the <Link href="/terms" className="text-primary underline-offset-4 hover:underline">Terms of Service</Link> Section 14 (Limitation of Liability), to the extent permitted by applicable law.</p>
          <p className="mt-3 text-muted-foreground">Where GDPR or the SCCs impose liability that cannot be contractually limited (e.g., data subject claims under GDPR Art. 82), such liability is not limited by the Terms of Service. Between the parties, each bears liability for its own acts and omissions contributing to any damage suffered by a data subject.</p>
          <p className="mt-3 text-muted-foreground">If WABDesk is held liable for damages caused by the Controller&rsquo;s unlawful processing instructions or failure to comply with data protection law, WABDesk may seek reimbursement from the Controller to the extent WABDesk was not responsible for the damage.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">9. Governing Law</h2>
          <p className="text-muted-foreground">This DPA is governed by the same law as the Terms of Service (<strong className="text-foreground">[Governing Jurisdiction — e.g., the Arab Republic of Egypt]</strong>), except that the SCCs are governed by EU law for Module Two, and the UK Addendum is governed by English law.</p>
          <p className="mt-3 text-muted-foreground">In the event of a conflict between this DPA and the SCCs, the SCCs take precedence for transfers subject to them.</p>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-semibold">10. Contact &amp; Countersigned Copy Requests</h2>
          <div className="rounded-md border bg-muted/30 px-4 py-4 space-y-2">
            <p className="text-muted-foreground">This DPA takes effect automatically upon acceptance of WABDesk&rsquo;s Terms of Service. No separate signature or action is required.</p>
            <p className="text-muted-foreground"><strong className="text-foreground">To request a countersigned PDF copy</strong> of this DPA for your compliance records:</p>
            <p className="text-muted-foreground ps-4">Email: <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a> with subject line: <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">DPA Countersigned Copy Request — [Your Company Name]</span></p>
            <p className="text-muted-foreground"><strong className="text-foreground">For DPIA assistance or audit requests:</strong> <a href="mailto:privacy@wabdesk.com" className="text-primary underline-offset-4 hover:underline">privacy@wabdesk.com</a></p>
            <p className="text-muted-foreground"><strong className="text-foreground">Registered Address:</strong> [Company Legal Name], [Full Address]</p>
          </div>
        </section>
      </div>

      <div className="mt-12 flex items-center justify-between border-t pt-6 text-sm text-muted-foreground">
        <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">← Privacy Policy</Link>
        <Link href="/terms" className="text-primary underline-offset-4 hover:underline">Terms of Service →</Link>
      </div>
    </div>
  );
}
