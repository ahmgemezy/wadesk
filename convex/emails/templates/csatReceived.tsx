import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function CsatReceived({ locale, variables }: Props) {
  const { contactName, score, conversationId, appUrl } = variables;
  const inboxUrl = conversationId ? `${appUrl}/inbox/${conversationId}` : `${appUrl}/inbox`;
  const scoreNum = Math.min(5, Math.max(1, Number(score) || 1));
  const stars = "★".repeat(scoreNum) + "☆".repeat(5 - scoreNum);
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
      <WaEmailLayout locale="ar" accentColor="#10B981" icon="⭐"
        heading="تم استلام تقييم العميل"
        previewText={`${contactName} قيّم المحادثة بـ ${score}/5`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          قيّم <strong>{contactName}</strong> تجربته مع المحادثة الأخيرة.
        </Text>
        <WaSection locale="ar">{`التقييم: ${score} / 5 — ${stars}`}</WaSection>
        <WaButton href={inboxUrl} locale="ar">عرض المحادثة</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#10B981" icon="⭐"
      heading="Customer Rating Received"
      previewText={`${contactName} rated the conversation ${score}/5`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{contactName}</strong> rated their recent conversation experience.
      </Text>
      <WaSection locale="en">{`Rating: ${score} / 5 — ${stars}`}</WaSection>
      <WaButton href={inboxUrl} locale="en">View Conversation</WaButton>
    </WaEmailLayout>
  );
}
