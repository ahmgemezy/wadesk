import type { Metadata } from "next";
import { isAuthenticated, fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";
import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "واب ديسك — صندوق بريد واتساب للفرق",
  description:
    "منصة دعم عملاء على واتساب للشركات الصغيرة والمتوسطة في الأسواق الناطقة بالعربية. إدارة محادثات واتساب بفريق متعدد الوكلاء.",
  openGraph: {
    title: "واب ديسك — صندوق بريد واتساب للفرق",
    description:
      "ادر محادثات واتساب بفريق كامل من لوحة تحكم واحدة",
    locale: "ar_EG",
    type: "website",
  },
};

export default async function RootPage() {
  const authed = await isAuthenticated();

  if (authed) {
    const profile = await fetchAuthQuery(
      api.orgMembersQueries.getCurrentUserProfile,
    ).catch(() => null);
    if (profile?.orgId) redirect("/inbox");
    redirect("/select-org");
  }

  return <MarketingPage isAuthenticated={false} />;
}
