import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/index.css";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "SmartTools Paperwork - Free Online Invoice & Receipt Generator Toolkit",
  description: "Generate professional invoices, receipts, expense reports, mileage logs, tax estimates, and W-9 contractor forms online for free.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className={`${inter.variable} print:bg-white`} lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased print:bg-white print:text-black">{children}</body>
    </html>
  );
}
