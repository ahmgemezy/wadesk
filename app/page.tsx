import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "وا ديسك — صندوق بريد واتساب للفرق",
  description:
    "منصة دعم عملاء على واتساب للشركات الصغيرة والمتوسطة في مصر والخليج. إدارة محادثات واتساب بفريق متعدد الوكلاء.",
  openGraph: {
    title: "وا ديسك — صندوق بريد واتساب للفرق",
    description:
      "ادر محادثات واتساب بفريق كامل من لوحة تحكم واحدة",
    locale: "ar_EG",
    type: "website",
  },
};

export default async function RootPage() {
  const { userId, orgId } = await auth();

  if (userId && orgId) {
    redirect("/inbox");
  }

  if (userId && !orgId) {
    redirect("/onboarding");
  }

  return <MarketingPage isAuthenticated={false} />;
}
