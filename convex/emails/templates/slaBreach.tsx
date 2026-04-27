import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function SlaBreach({ locale, variables }: Props) {
  const { contactName, channelName, thresholdMinutes, conversationId, appUrl } = variables;
  const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = { color: "#334155", fontSize: 15, lineHeight: "1.7", margin: "0 0 12px", textAlign: (isRtl ? "right" : "left") as "right" | "left", fontFamily: font };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#EF4444" icon="🔴"
        heading="تجاوز وقت الاستجابة المسموح به"
        previewText={`محادثة مع ${contactName} تجاوزت ${thresholdMinutes} دقيقة`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          محادثة مع <strong>{contactName}</strong> في قناة <strong>{channelName}</strong> تجاوزت وقت الاستجابة المحدد ({thresholdMinutes} دقيقة) دون رد.
        </Text>
        <WaSection locale="ar">يرجى الرد في أقرب وقت ممكن لتجنب استمرار الاختراق.</WaSection>
        <WaButton href={inboxUrl} locale="ar">فتح المحادثة الآن</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#EF4444" icon="🔴"
      heading="SLA Response Time Exceeded"
      previewText={`Conversation with ${contactName} exceeded ${thresholdMinutes}-min SLA`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        A conversation with <strong>{contactName}</strong> in channel <strong>{channelName}</strong> has exceeded the SLA response time ({thresholdMinutes} minutes) without a reply.
      </Text>
      <WaSection locale="en">Please respond as soon as possible to avoid further breach.</WaSection>
      <WaButton href={inboxUrl} locale="en">Open Conversation</WaButton>
    </WaEmailLayout>
  );
}
