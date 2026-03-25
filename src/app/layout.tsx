import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LocaleProvider } from "@/components/locale-provider";
import { getDictionary } from "@/i18n/dictionaries";
import { brandAssets } from "@/lib/brand-assets";
import { getLocale } from "@/lib/locale";
import "./globals.css";
import { WebVitalsClient } from "@/components/web-vitals-client";

function siteOrigin(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
  try {
    return new URL(raw ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

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
  const base = siteOrigin();
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
      title: d.meta.title,
      description: d.meta.description,
      images: [{ url: brandAssets.ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title: d.meta.title,
      description: d.meta.description,
      images: [brandAssets.ogImage],
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
