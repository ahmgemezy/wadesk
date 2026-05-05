import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function BillingRenewalReceipt({ locale, variables }: Props) {
  const { orgName, planName, appUrl } = variables;
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
      <WaEmailLayout locale="ar" accentColor="#10B981" icon="✅"
        heading="تم تجديد اشتراكك"
        previewText="تم تجديد اشتراكك بنجاح — شكراً لثقتك بـ WABDesk">
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          تم تجديد اشتراك <strong>{orgName}</strong> في خطة <strong>{planName}</strong> بنجاح. نشكرك على استمرارك معنا.
        </Text>
        <WaButton href={`${appUrl}/settings/billing`} locale="ar">عرض تفاصيل الاشتراك</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#10B981" icon="✅"
      heading="Subscription Renewed"
      previewText="Your subscription has been successfully renewed — thank you for staying with WABDesk">
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{orgName}</strong>'s <strong>{planName}</strong> subscription has been successfully renewed. Thank you for continuing with us.
      </Text>
      <WaButton href={`${appUrl}/settings/billing`} locale="en">View Subscription</WaButton>
    </WaEmailLayout>
  );
}
