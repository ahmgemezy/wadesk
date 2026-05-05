import type { Metadata, Viewport } from "next";
import { ClerkProviderWithLocale } from "@/components/clerk-provider-with-locale";
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
  title: "WABDesk",
  description: "صندوق بريد WhatsApp للفرق — تعاون فريقك على محادثات واحدة",
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
    <ClerkProviderWithLocale locale={locale}>
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
    </ClerkProviderWithLocale>
  );
}
