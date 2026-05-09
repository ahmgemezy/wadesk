import type { Metadata } from "next";
import { cookies } from "next/headers";
import { isAuthenticated, fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { redirect } from "next/navigation";
import { MarketingPage } from "@/components/marketing/marketing-page";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";

  if (locale === "ar") {
    return {
      title: "واب ديسك | صندوق بريد واتساب بيزنيس للفرق",
      description:
        "منصة WhatsApp Business متعددة الوكلاء، عربية أولاً، للشركات الصغيرة والمتوسطة في الأسواق الناطقة بالعربية. وكلاء متعددون، رقم واحد، بدون رسوم إضافية على رسائل Meta.",
      openGraph: {
        title: "واب ديسك | صندوق بريد واتساب بيزنيس للفرق",
        description:
          "منصة WhatsApp Business متعددة الوكلاء، عربية أولاً، للشركات الصغيرة والمتوسطة في الأسواق الناطقة بالعربية.",
        locale: "ar_EG",
        alternateLocale: ["ar_SA", "ar_AE", "en_US"],
        type: "website",
        siteName: "واب ديسك",
        images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "واب ديسك — صندوق بريد WhatsApp للفرق" }],
      },
      twitter: {
        card: "summary_large_image",
        title: "واب ديسك | صندوق بريد واتساب بيزنيس للفرق",
        description:
          "منصة WhatsApp Business متعددة الوكلاء، عربية أولاً، للشركات الصغيرة والمتوسطة في الأسواق الناطقة بالعربية.",
        images: ["/logo.png"],
      },
    };
  }

  return {
    title: "WABDesk | WhatsApp Business Inbox for Teams",
    description:
      "Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets. Multiple agents, one number, zero markup on Meta messages.",
    openGraph: {
      title: "WABDesk | WhatsApp Business Inbox for Teams",
      description:
        "Arabic-first multi-agent WhatsApp Business platform for SMBs in Arabic-speaking markets. Multiple agents, one number, zero markup on Meta messages.",
      locale: "en_US",
      alternateLocale: ["ar_EG", "ar_SA", "ar_AE"],
      type: "website",
      siteName: "WABDesk",
      images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "WABDesk — WhatsApp Business for Teams" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "WABDesk | WhatsApp Business Inbox for Teams",
      description:
        "Arabic-first multi-agent WhatsApp Business platform for SMBs in Arabic-speaking markets.",
      images: ["/logo.png"],
    },
  };
}

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
