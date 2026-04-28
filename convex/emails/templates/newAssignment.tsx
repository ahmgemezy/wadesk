import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function NewAssignment({ locale, variables }: Props) {
  const { contactName, channelName, conversationId, assignedByName, appUrl } = variables;
  const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
  const byLine = assignedByName ? (locale === "ar" ? ` بواسطة ${assignedByName}` : ` by ${assignedByName}`) : "";
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = { color: "#334155", fontSize: 15, lineHeight: "1.7", margin: "0 0 12px", textAlign: (isRtl ? "right" : "left") as "right" | "left", fontFamily: font };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#10B981" icon="💬"
        heading="تم تعيين محادثة جديدة إليك"
        previewText={`محادثة مع ${contactName} تم تعيينها إليك`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          تم تعيين محادثة مع <strong>{contactName}</strong> في قناة <strong>{channelName}</strong> إليك{byLine}.
        </Text>
        <WaSection locale="ar">سجّل دخولك إلى WABDesk للرد على العميل.</WaSection>
        <WaButton href={inboxUrl} locale="ar">فتح المحادثة</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#10B981" icon="💬"
      heading="New Conversation Assigned to You"
      previewText={`Conversation with ${contactName} has been assigned to you`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        A conversation with <strong>{contactName}</strong> in channel <strong>{channelName}</strong> has been assigned to you{byLine}.
      </Text>
      <WaSection locale="en">Log in to WABDesk to reply to the customer.</WaSection>
      <WaButton href={inboxUrl} locale="en">Open Conversation</WaButton>
    </WaEmailLayout>
  );
}
