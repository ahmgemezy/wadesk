import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function ChannelDeleted({ locale, variables }: Props) {
  const { channelName, appUrl } = variables;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = { color: "#334155", fontSize: 15, lineHeight: "1.7", margin: "0 0 12px", textAlign: (isRtl ? "right" : "left") as "right" | "left", fontFamily: font };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#EF4444" icon="🗑️"
        heading="تم حذف رقم واتساب نهائياً"
        previewText={`تم حذف رقم "${channelName}" وجميع بياناته`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          تم حذف رقم واتساب <strong>"{channelName}"</strong> وجميع بياناته (محادثات، رسائل، أقسام) نهائياً لأنه ظل غير متصل لمدة 30 يوماً.
        </Text>
        <WaSection locale="ar">يمكنك توصيل رقم واتساب جديد للاستمرار في استخدام WABDesk.</WaSection>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#EF4444" icon="🗑️"
      heading="WhatsApp Number Permanently Deleted"
      previewText={`Number "${channelName}" and all its data have been deleted`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        Your WhatsApp number <strong>"{channelName}"</strong> and all its data (conversations, messages, departments) have been permanently deleted after 30 days of being disconnected.
      </Text>
      <WaSection locale="en">You can connect a new WhatsApp number to continue using WABDesk.</WaSection>
    </WaEmailLayout>
  );
}
