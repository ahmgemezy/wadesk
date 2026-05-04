import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function ConversationTransferred({ locale, variables }: Props) {
  const { contactName, targetDept, actorName, conversationId, appUrl } = variables;
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
      <WaEmailLayout locale="ar" accentColor="#8B5CF6" icon="🔀"
        heading="تم تحويل محادثة إلى فريقك"
        previewText={`قام ${actorName} بتحويل محادثة مع ${contactName} إلى ${targetDept}`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          قام <strong>{actorName}</strong> بتحويل محادثة مع <strong>{contactName}</strong> إلى فريق <strong>{targetDept}</strong>.
        </Text>
        <WaSection locale="ar">سجّل دخولك إلى WABDesk للرد على العميل.</WaSection>
        <WaButton href={inboxUrl} locale="ar">فتح المحادثة</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#8B5CF6" icon="🔀"
      heading="A Conversation Was Transferred to Your Team"
      previewText={`${actorName} transferred a conversation with ${contactName} to ${targetDept}`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{actorName}</strong> transferred a conversation with <strong>{contactName}</strong> to <strong>{targetDept}</strong>.
      </Text>
      <WaSection locale="en">Log in to WABDesk to reply to the customer.</WaSection>
      <WaButton href={inboxUrl} locale="en">Open Conversation</WaButton>
    </WaEmailLayout>
  );
}
