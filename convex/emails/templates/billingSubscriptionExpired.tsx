import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function BillingSubscriptionExpired({ locale, variables }: Props) {
  const { orgName, planName, appUrl } = variables;
  const isRtl = locale === "ar";
  const font = isRtl ? "'Cairo', Arial, sans-serif" : "Arial, Helvetica, sans-serif";
  const textStyle = { color: "#334155", fontSize: 15, lineHeight: "1.7", margin: "0 0 12px", textAlign: (isRtl ? "right" : "left") as "right" | "left", fontFamily: font };

  if (locale === "ar") {
    return (
      <WaEmailLayout locale="ar" accentColor="#F59E0B" icon="📦"
        heading="انتهت صلاحية الاشتراك"
        previewText={`تم إلغاء اشتراك ${orgName} في خطة ${planName}`}>
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          تم إلغاء اشتراك <strong>{orgName}</strong> في خطة <strong>{planName}</strong> وتحويل الحساب إلى الخطة المجانية.
        </Text>
        <WaSection locale="ar">يمكنك إعادة الاشتراك في أي وقت من صفحة الفواتير.</WaSection>
        <WaButton href={`${appUrl}/settings/billing`} locale="ar">إعادة الاشتراك</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#F59E0B" icon="📦"
      heading="Subscription Expired"
      previewText={`${orgName}'s ${planName} subscription has been canceled`}>
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        <strong>{orgName}</strong>'s <strong>{planName}</strong> subscription has been canceled and the account has been moved to the free plan.
      </Text>
      <WaSection locale="en">You can re-subscribe at any time from the billing page.</WaSection>
      <WaButton href={`${appUrl}/settings/billing`} locale="en">Re-subscribe</WaButton>
    </WaEmailLayout>
  );
}
