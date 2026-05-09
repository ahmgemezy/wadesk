import type { Metadata } from "next";
import { isAuthenticated, fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";
import { MarketingPage } from "@/components/marketing/marketing-page";

export const metadata: Metadata = {
  title: "WABDesk | WhatsApp Business for Teams",
  description:
    "WABDesk is the WhatsApp team inbox built for Arabic-speaking SMBs in Egypt, Saudi Arabia, and the UAE. Multiple agents share one WhatsApp number — manage every customer conversation from a single dashboard.",
  openGraph: {
    title: "WABDesk | WhatsApp Business for Teams",
    description:
      "Multiple agents. One WhatsApp number. Zero markup on Meta messages. The team inbox Arabic-speaking businesses have been waiting for.",
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
      "The WhatsApp team inbox for Arabic-speaking businesses. Pay Meta for messages. Pay WABDesk for your team. Nothing more.",
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
