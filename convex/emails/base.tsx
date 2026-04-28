import * as React from "react";
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Font,
} from "@react-email/components";

interface WaEmailLayoutProps {
  locale: "ar" | "en";
  accentColor: string;
  icon: string;
  heading: string;
  children: React.ReactNode;
  previewText?: string;
}

export function WaEmailLayout({
  locale,
  accentColor,
  icon,
  heading,
  children,
  previewText = "",
}: WaEmailLayoutProps) {
  const isRtl = locale === "ar";
  const fontFamily = isRtl
    ? "'Cairo', Arial, sans-serif"
    : "Arial, Helvetica, sans-serif";

  return (
    <Html lang={locale} dir={isRtl ? "rtl" : "ltr"}>
      <Head>
        {isRtl && (
          <Font
            fontFamily="Cairo"
            fallbackFontFamily="Arial"
            webFont={{
              url: "https://fonts.gstatic.com/s/cairo/v28/SLXVc1nY6HkvangtZmpcWmhzfH5lWWgcQyyDpi8b.woff2",
              format: "woff2",
            }}
            fontWeight={400}
            fontStyle="normal"
          />
        )}
      </Head>
      <Body style={{ backgroundColor: "#F8FAFC", margin: 0, padding: 0, fontFamily }}>
        {previewText && (
          <div style={{ display: "none", maxHeight: 0, overflow: "hidden", fontSize: 1, color: "#F8FAFC" }}>
            {previewText}
          </div>
        )}
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }}>
          <Section
            style={{
              backgroundColor: accentColor,
              borderRadius: "12px 12px 0 0",
              padding: "28px 24px",
              textAlign: "center",
            }}
          >
            <Text style={{ fontSize: 36, margin: "0 0 8px", lineHeight: "1" }}>
              {icon}
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 22,
                fontWeight: 700,
                margin: 0,
                fontFamily,
              }}
            >
              WABDesk
            </Text>
          </Section>

          <Section
            style={{
              backgroundColor: "#fff",
              padding: "32px 28px",
              borderLeft: "1px solid #E2E8F0",
              borderRight: "1px solid #E2E8F0",
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#0F172A",
                margin: "0 0 20px",
                textAlign: isRtl ? "right" : "left",
                fontFamily,
              }}
            >
              {heading}
            </Text>
            {children}
          </Section>

          <Section
            style={{
              backgroundColor: "#0F172A",
              borderRadius: "0 0 12px 12px",
              padding: "16px 24px",
              textAlign: "center",
            }}
          >
            <Text
              style={{
                color: "#94A3B8",
                fontSize: 12,
                margin: 0,
                fontFamily,
              }}
            >
              WABDesk — واب ديسك
              {" · "}
              {isRtl ? "هذه رسالة تشغيلية تلقائية" : "This is an automated transactional email"}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
