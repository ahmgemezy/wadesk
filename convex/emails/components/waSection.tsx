import * as React from "react";
import { Section, Text } from "@react-email/components";

interface WaSectionProps {
  children: React.ReactNode;
  locale?: "ar" | "en";
}

export function WaSection({ children, locale = "ar" }: WaSectionProps) {
  const isRtl = locale === "ar";
  const fontFamily = isRtl
    ? "'Cairo', Arial, sans-serif"
    : "Arial, Helvetica, sans-serif";
  return (
    <Section
      style={{
        backgroundColor: "#F1F5F9",
        borderRadius: 8,
        padding: "14px 16px",
        margin: "16px 0",
        borderInlineStart: "3px solid #10B981",
      }}
    >
      <Text
        style={{
          color: "#475569",
          fontSize: 14,
          margin: 0,
          lineHeight: "1.6",
          textAlign: isRtl ? "right" : "left",
          fontFamily,
        }}
      >
        {children}
      </Text>
    </Section>
  );
}
