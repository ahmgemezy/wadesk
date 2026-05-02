import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { cookies } from "next/headers";
import { ConvexClientProvider } from "@/components/convex-client-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n/context";
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
    <ClerkProvider>
      <html lang={locale} dir={dir} suppressHydrationWarning>
        <body className={`${inter.variable} ${ibmPlexArabic.variable} antialiased`} suppressHydrationWarning>
          <ConvexClientProvider>
            <LocaleProvider locale={locale}>
              <ThemeProvider>{children}</ThemeProvider>
            </LocaleProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
