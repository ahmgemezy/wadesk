import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function ConversationReopened({ locale, variables }: Props) {
  const { contactName, channelName, conversationId, appUrl } = variables;
  const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
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
      <WaEmailLayout locale="ar" accentColor="#F59E0B" icon="🔄"
        heading="عاد العميل للرد على محادثة محسومة"
        previewText={`${contactName} أرسل رسالة جديدة في محادثة تم إغلاقها مسبقاً`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          أرسل <strong>{contactName}</strong> رسالة جديدة في محادثة محسومة سابقاً في قناة <strong>{channelName}</strong>. تم إعادة فتح المحادثة تلقائياً.
        </Text>
        <WaSection locale="ar">يرجى الرد في أقرب وقت لتقديم أفضل خدمة.</WaSection>
        <WaButton href={inboxUrl} locale="ar">فتح المحادثة</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#F59E0B" icon="🔄"
      heading="A Customer Replied to a Resolved Conversation"
      previewText={`${contactName} sent a new message in a previously resolved conversation`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{contactName}</strong> sent a new message in a previously resolved conversation
        in channel <strong>{channelName}</strong>. The conversation has been automatically reopened.
      </Text>
      <WaSection locale="en">Please reply soon to provide the best experience.</WaSection>
      <WaButton href={inboxUrl} locale="en">Open Conversation</WaButton>
    </WaEmailLayout>
  );
}
