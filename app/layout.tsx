import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/context";
import { KlaroProvider } from "@/components/consent/klaro-provider";
import { CONSENT_MODE_DEFAULT_SCRIPT } from "@/lib/klaro/consent-mode";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: {
    default: "WABDesk | WhatsApp Business for Teams",
    template: "%s | WABDesk",
  },
  description:
    "WABDesk is an Arabic-first multi-agent WhatsApp Business platform built for SMBs in Arabic-speaking markets.",
  keywords: [
    "WhatsApp Business",
    "multi-agent WhatsApp Business",
    "Arabic-first WhatsApp platform",
    "WhatsApp for SMBs",
    "Arabic-speaking markets",
    "MENA WhatsApp Business",
    "واتساب بيزنس",
    "منصة واتساب للشركات",
  ],
  authors: [{ name: "WABDesk" }],
  creator: "WABDesk",
  publisher: "WABDesk",
  metadataBase: new URL("https://wabdesk.com"),
  openGraph: {
    type: "website",
    locale: "ar_EG",
    alternateLocale: ["en_US", "ar_SA", "ar_AE"],
    title: "WABDesk | WhatsApp Business for Teams",
    description:
      "Arabic-first multi-agent WhatsApp Business platform for SMBs in Arabic-speaking markets. Multiple agents, one number, zero markup on Meta messages.",
    siteName: "WABDesk",
    images: [{ url: "/logo.png", width: 1024, height: 1024, alt: "WABDesk Logo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "WABDesk | WhatsApp Business for Teams",
    description:
      "Arabic-first multi-agent WhatsApp Business platform for SMBs in Arabic-speaking markets.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "en" ? "en" : "ar";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Google Consent Mode v2 — must run before any GTM/GA script. Content is
            a hardcoded constant from lib/klaro/consent-mode.ts, not user input. */}
        <Script
          id="google-consent-mode-default"
          strategy="beforeInteractive"
          // nosec: content is a hardcoded constant, not user-controlled
          dangerouslySetInnerHTML={{ __html: CONSENT_MODE_DEFAULT_SCRIPT }}
        />
      </head>
      <body className={`${inter.variable} ${ibmPlexArabic.variable} antialiased`} suppressHydrationWarning>
        <ConvexClientProvider>
          <LocaleProvider locale={locale}>
            <ThemeProvider>{children}</ThemeProvider>
            <KlaroProvider />
          </LocaleProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
