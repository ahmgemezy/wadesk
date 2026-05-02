import * as React from "react";
import { Text } from "@react-email/components";
import { WaEmailLayout } from "../base";
import { WaButton } from "../components/waButton";
import { WaSection } from "../components/waSection";

interface Props { locale: "ar" | "en"; variables: Record<string, string>; }

export function BillingPaymentFailed({ locale, variables }: Props) {
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
      <WaEmailLayout locale="ar" accentColor="#EF4444" icon="💳"
        heading="فشل تجديد الاشتراك"
        previewText="لم يتم خصم الاشتراك — يرجى تحديث بيانات الدفع">
        <Text style={textStyle}>مرحباً،</Text>
        <Text style={textStyle}>
          تعذّر تجديد اشتراك <strong>{orgName}</strong> في خطة <strong>{planName}</strong>. يرجى تحديث بيانات الدفع لاستمرار الخدمة.
        </Text>
        <WaSection locale="ar">إذا لم يتم تحديث بيانات الدفع، سيتم تخفيض الحساب إلى الخطة المجانية تلقائياً.</WaSection>
        <WaButton href={`${appUrl}/settings/billing`} locale="ar">تحديث بيانات الدفع</WaButton>
      </WaEmailLayout>
    );
  }
  return (
    <WaEmailLayout locale="en" accentColor="#EF4444" icon="💳"
      heading="Subscription Payment Failed"
      previewText="Payment failed — please update your billing information">
      <Text style={textStyle}>Hello,</Text>
      <Text style={textStyle}>
        We were unable to renew <strong>{orgName}</strong>'s <strong>{planName}</strong> subscription. Please update your payment details to avoid service interruption.
      </Text>
      <WaSection locale="en">If not updated, your account will be automatically downgraded to the free plan.</WaSection>
      <WaButton href={`${appUrl}/settings/billing`} locale="en">Update Billing Info</WaButton>
    </WaEmailLayout>
  );
}
