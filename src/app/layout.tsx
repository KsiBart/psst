import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import { getLang } from "@/lib/i18n";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin", "latin-ext"], weight: ["600", "800"] });

export const metadata: Metadata = {
  title: { default: "Psst! — losowanie prezentów", template: "%s · Psst!" },
  description: "Losowanie prezentów bez e-maili i bez spojlerów. Mikołajki, urodziny, wymiana w biurze.",
  applicationName: "Psst!",
  appleWebApp: { capable: true, title: "Psst!", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0E1A2B",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getLang();
  return (
    <html lang={lang} className={`${inter.variable} ${bricolage.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
