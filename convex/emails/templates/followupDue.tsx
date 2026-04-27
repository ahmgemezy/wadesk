import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function FollowupDue({ locale, variables }: Props) {
  const { contactName, status, appUrl } = variables;
  const isSent = status === "sent";
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = { color: "#334155", fontSize: 15, lineHeight: "1.7", margin: "0 0 12px", textAlign: (isRtl ? "right" : "left") as "right" | "left", fontFamily: font };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor={isSent ? "#10B981" : "#F59E0B"} icon="📅"
        heading={isSent ? "تم إرسال رسالة المتابعة" : "فشل إرسال رسالة المتابعة"}
        previewText={`متابعة مع ${contactName} — ${isSent ? "تم الإرسال" : "فشل الإرسال"}`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          {isSent
            ? `تم إرسال رسالة المتابعة إلى ${contactName} بنجاح.`
            : `فشل إرسال رسالة المتابعة إلى ${contactName}. يرجى المراجعة والإرسال يدوياً.`}
        </Text>
        <WaButton href={`${appUrl}/contacts`} locale="ar">فتح جهات الاتصال</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor={isSent ? "#10B981" : "#F59E0B"} icon="📅"
      heading={isSent ? "Follow-up Sent" : "Follow-up Failed"}
      previewText={`Follow-up with ${contactName} — ${isSent ? "sent" : "failed"}`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        {isSent
          ? `Your follow-up message to ${contactName} was sent successfully.`
          : `Your follow-up message to ${contactName} failed to send. Please review and send manually.`}
      </Text>
      <WaButton href={`${appUrl}/contacts`} locale="en">Open Contacts</WaButton>
    </WaEmailLayout>
  );
}
