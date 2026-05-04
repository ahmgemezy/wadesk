import * as React from "react";
import { Button } from "@react-email/components";

interface WaButtonProps {
  href: string;
  children: React.ReactNode;
  locale?: "ar" | "en";
}

export function WaButton({ href, children, locale = "ar" }: WaButtonProps) {
  const fontFamily =
    locale === "ar" ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  return (
    <Button
      href={href}
      style={{
        backgroundColor: "#10B981",
        color: "#fff",
        padding: "12px 28px",
        borderRadius: 8,
        fontSize: 15,
        fontWeight: 600,
        textDecoration: "none",
        display: "inline-block",
        margin: "20px 0 8px",
        fontFamily,
      }}
    >
      {children}
    </Button>
  );
}
