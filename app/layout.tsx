import type { Metadata } from "next";
import { Caveat, Funnel_Sans, Geist, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
});

const geist = Geist({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-geist",
});

const funnelSans = Funnel_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-funnel-sans",
});

const caveat = Caveat({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-caveat",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "SmartTools",
  description: "Focused utilities for everyday work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${inter.variable} ${geist.variable} ${funnelSans.variable} ${caveat.variable} print:bg-white`}
      lang="en"
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased print:bg-white print:text-black">
        {children}
      </body>
    </html>
  );
}
