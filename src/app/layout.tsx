import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EOI Website Official",
  description: "Official website for EOI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
