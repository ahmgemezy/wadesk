import type { Metadata } from "next";
import { isAuthenticated, fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";
import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "WABDesk | WhatsApp Business for Teams",
  description:
    "WABDesk is an Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets.",
  openGraph: {
    title: "WABDesk | WhatsApp Business for Teams",
    description:
      "Arabic-first multi-agent WhatsApp Business platform for SMBs in Arabic-speaking markets. Multiple agents, one number, zero markup on Meta messages.",
    locale: "ar_EG",
    alternateLocale: ["en_US", "ar_SA", "ar_AE"],
    type: "website",
    siteName: "WABDesk",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "WABDesk — WhatsApp Business for Teams" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WABDesk | WhatsApp Business for Teams",
    description:
      "Arabic-first multi-agent WhatsApp Business platform for SMBs in Arabic-speaking markets.",
    images: ["/logo.png"],
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
