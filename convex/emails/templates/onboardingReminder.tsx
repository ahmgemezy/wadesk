import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function OnboardingReminder({ locale, variables }: Props) {
  const { orgName, deleteDate, appUrl } = variables;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = {
    color: "#334155",
    fontSize: 15,
    lineHeight: "1.7",
    margin: "0 0 12px",
    textAlign: (isRtl ? "right" : "left") as "right" | "left",
    direction: (isRtl ? "rtl" : "ltr") as "rtl" | "ltr",
    fontFamily: font,
  };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#F59E0B" icon="⚠️"
        heading={`مساحة العمل "${orgName}" ستُحذف في ${deleteDate}`}
        previewText={`أكمل إعداد WABDesk قبل ${deleteDate} لتجنب حذف مساحة العمل`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          لاحظنا أن مساحة العمل <strong>"{orgName}"</strong> لم يكتمل إعدادها بعد.
        </Text>
        <WaSection locale="ar">
          إذا لم تُكمل الإعداد بحلول <strong>{deleteDate}</strong>، سيتم حذف مساحة العمل هذه تلقائياً.
        </WaSection>
        <WaButton href={`${appUrl}/onboarding`} locale="ar">إكمال الإعداد الآن</WaButton>
        <Text style={{ ...textStyle, fontSize: 13, color: "#64748B", marginTop: 16 }}>
          إذا كنت قد أنشأت هذه المساحة عن طريق الخطأ، يمكنك تجاهل هذه الرسالة وستُحذف تلقائياً.
        </Text>
      </WaEmailLayout>
    );
  }

  return (
    <WaEmailLayout locale="en" accentColor="#F59E0B" icon="⚠️"
      heading={`Workspace "${orgName}" will be deleted on ${deleteDate}`}
      previewText={`Complete your WABDesk setup before ${deleteDate} to keep your workspace`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        We noticed that your workspace <strong>"{orgName}"</strong> setup is still incomplete.
      </Text>
      <WaSection locale="en">
        If you don't complete the setup by <strong>{deleteDate}</strong>, this workspace will be automatically deleted.
      </WaSection>
      <WaButton href={`${appUrl}/onboarding`} locale="en">Complete Setup Now</WaButton>
      <Text style={{ ...textStyle, fontSize: 13, color: "#64748B", marginTop: 16 }}>
        If you created this workspace by mistake, you can ignore this email and it will be deleted automatically.
      </Text>
    </WaEmailLayout>
  );
}
