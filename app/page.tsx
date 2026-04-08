import type { Metadata } from "next";
import { auth, clerkClient } from "@clerk/nextjs/server";
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
    // Check if user already belongs to an org — if so, they're a returning
    // member whose session hasn't activated an org yet. Send them to /inbox
    // where Clerk's <OrganizationSwitcher> / dashboard logic will handle it.
    // Only send to /onboarding for brand-new users with zero org memberships.
    const client = await clerkClient();
    const memberships = await client.users.getOrganizationMembershipList({ userId });
    if (memberships.totalCount > 0) {
      redirect("/inbox");
    }
    redirect("/onboarding");
  }

  return <MarketingPage isAuthenticated={false} />;
}
