import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function ChannelExpiringSoon({ locale, variables }: Props) {
  const { channelName, daysLeft, deleteDate, appUrl } = variables;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = { color: "#334155", fontSize: 15, lineHeight: "1.7", margin: "0 0 12px", textAlign: (isRtl ? "right" : "left") as "right" | "left", fontFamily: font };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#F59E0B" icon="⚠️"
        heading={`تنبيه: سيُحذف رقمك خلال ${daysLeft} أيام`}
        previewText={`رقم واتساب "${channelName}" سيُحذف في ${deleteDate}`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          رقم واتساب <strong>"{channelName}"</strong> غير متصل وسيتم <strong>حذفه نهائياً</strong> خلال {daysLeft} أيام (في {deleteDate}).
        </Text>
        <WaSection locale="ar">لمنع الحذف، أعد توصيل الرقم من: الإعدادات ← أرقام واتساب</WaSection>
        <WaButton href={`${appUrl}/settings/channels`} locale="ar">إعادة التوصيل الآن</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#F59E0B" icon="⚠️"
      heading={`Action Required: Number Deletes in ${daysLeft} Days`}
      previewText={`WhatsApp number "${channelName}" will be deleted on ${deleteDate}`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        Your WhatsApp number <strong>"{channelName}"</strong> has been disconnected and will be <strong>permanently deleted</strong> in {daysLeft} days (on {deleteDate}).
      </Text>
      <WaSection locale="en">To prevent deletion, reconnect from: Settings → WhatsApp Numbers</WaSection>
      <WaButton href={`${appUrl}/settings/channels`} locale="en">Reconnect Now</WaButton>
    </WaEmailLayout>
  );
}
