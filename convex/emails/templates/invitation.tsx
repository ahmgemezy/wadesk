import * as React from "react";
import { Text, Button, Hr } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function InvitationEmail({ locale, variables }: Props) {
  const { orgName, inviterName, inviteUrl } = variables;

  const arTextStyle = {
    color: "#334155",
    fontSize: 15,
    lineHeight: "1.7",
    margin: "0 0 12px",
    textAlign: "right" as const,
    direction: "rtl" as const,
    fontFamily: "'Cairo', Arial, sans-serif",
  };

  const enTextStyle = {
    color: "#334155",
    fontSize: 15,
    lineHeight: "1.7",
    margin: "0 0 12px",
    textAlign: "left" as const,
    direction: "ltr" as const,
    fontFamily: "Arial, Helvetica, sans-serif",
  };

  const ctaStyle = {
    backgroundColor: "#0071E3",
    color: "#fff",
    padding: "12px 28px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    textDecoration: "none",
    display: "inline-block",
    margin: "20px 0 8px",
  };

  const arHeading =
    locale === "ar"
      ? `دعوة للانضمام إلى ${orgName ?? ""}`
      : `Invitation to join ${orgName ?? ""}`;

  const previewText =
    locale === "ar"
      ? `${inviterName ?? ""} دعاك للانضمام إلى ${orgName ?? ""} على WABDesk`
      : `${inviterName ?? ""} invited you to join ${orgName ?? ""} on WABDesk`;

  return (
    <WaEmailLayout
      locale={locale}
      accentColor="#0071E3"
      icon="✉️"
      heading={arHeading}
      previewText={previewText}
    >
      {/* Arabic block — RTL */}
      <Text style={arTextStyle}>أهلاً،</Text>
      <Text style={arTextStyle}>
        قام <strong>{inviterName ?? ""}</strong> بدعوتك للانضمام إلى فريق{" "}
        <strong>{orgName ?? ""}</strong> على WABDesk.
      </Text>
      <WaSection locale="ar">
        سجّل دخولك بعد قبول الدعوة للبدء في الرد على محادثات العملاء.
      </WaSection>
      <Button
        href={inviteUrl ?? ""}
        style={{ ...ctaStyle, fontFamily: "'Cairo', Arial, sans-serif" }}
      >
        قبول الدعوة
      </Button>

      <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />

      {/* English block — LTR */}
      <Text style={enTextStyle}>Hi,</Text>
      <Text style={enTextStyle}>
        <strong>{inviterName ?? ""}</strong> invited you to join the{" "}
        <strong>{orgName ?? ""}</strong> team on WABDesk.
      </Text>
      <WaSection locale="en">
        Log in after accepting the invitation to start handling customer conversations.
      </WaSection>
      <Button
        href={inviteUrl ?? ""}
        style={{ ...ctaStyle, fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        Accept Invitation
      </Button>
    </WaEmailLayout>
  );
}
