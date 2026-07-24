import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: "SmartTools",
  description: "Focused utilities for everyday work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html className={`${inter.variable} print:bg-white`} lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased print:bg-white print:text-black">
        {children}
      </body>
    </html>
  );
}
