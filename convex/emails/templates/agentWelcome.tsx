import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function AgentWelcome({ locale, variables }: Props) {
  const { agentName, orgName, appUrl } = variables;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = { color: "#334155", fontSize: 15, lineHeight: "1.7", margin: "0 0 12px", textAlign: (isRtl ? "right" : "left") as "right" | "left", fontFamily: font };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#10B981" icon="👋"
        heading={`أهلاً ${agentName}، مرحباً بك في ${orgName}`}
        previewText={`تم إضافتك إلى فريق ${orgName} على WaDesk`}>
        <Text style={textStyle}>أهلاً {agentName}،</Text>
        <Text style={textStyle}>
          تم إضافتك بنجاح إلى فريق <strong>{orgName}</strong> على WaDesk. يمكنك الآن الرد على محادثات العملاء والتعاون مع فريقك.
        </Text>
        <WaSection locale="ar">ابدأ بتسجيل الدخول وإلقاء نظرة على الصندوق الوارد.</WaSection>
        <WaButton href={`${appUrl}/inbox`} locale="ar">الذهاب إلى الصندوق الوارد</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#10B981" icon="👋"
      heading={`Welcome ${agentName} to ${orgName}`}
      previewText={`You've been added to ${orgName}'s team on WaDesk`}>
      <Text style={textStyle}>Hi {agentName},</Text>
      <Text style={textStyle}>
        You've been successfully added to <strong>{orgName}</strong>'s team on WaDesk. You can now reply to customer conversations and collaborate with your team.
      </Text>
      <WaSection locale="en">Get started by logging in and checking your inbox.</WaSection>
      <WaButton href={`${appUrl}/inbox`} locale="en">Go to Inbox</WaButton>
    </WaEmailLayout>
  );
}
