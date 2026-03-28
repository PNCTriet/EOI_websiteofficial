import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LocaleProvider } from "@/components/locale-provider";
import { getDictionary } from "@/i18n/dictionaries";
import { brandAssets } from "@/lib/brand-assets";
import { getSiteOriginUrl, toAbsoluteSiteUrl } from "@/lib/site-url";
import { getLocale } from "@/lib/locale";
import "./globals.css";
import { WebVitalsClient } from "@/components/web-vitals-client";

/** Inter — font phổ thông, hỗ trợ tiếng Việt */
const inter = Inter({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const d = getDictionary(locale);
  const base = getSiteOriginUrl();
  const ogImageAbsolute = toAbsoluteSiteUrl(brandAssets.ogImage);
  const homeUrl = new URL("/", base).href;

  return {
    metadataBase: base,
    title: d.meta.title,
    description: d.meta.description,
    icons: {
      icon: [
        { url: brandAssets.faviconIco, sizes: "any" },
        { url: brandAssets.faviconPng, type: "image/png" },
      ],
      apple: brandAssets.appleTouchIcon,
    },
    openGraph: {
      type: "website",
      url: homeUrl,
      siteName: "EOI - Design Printing",
      title: d.meta.title,
      description: d.meta.description,
      images: [
        {
          url: ogImageAbsolute,
          type: "image/png",
          alt: d.meta.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: d.meta.title,
      description: d.meta.description,
      images: [ogImageAbsolute],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = getDictionary(locale);

  return (
    <html lang={locale} className={inter.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <LocaleProvider locale={locale} messages={messages}>
          {children}
          <WebVitalsClient />
        </LocaleProvider>
      </body>
    </html>
  );
}
