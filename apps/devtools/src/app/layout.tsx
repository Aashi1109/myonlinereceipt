import type { Metadata, Viewport } from "next";
import "@/index.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.DEVTOOLS_URL ?? "http://localhost:3002"),
  title: {
    default: "SmartTools Devtools",
    template: "%s | SmartTools Devtools",
  },
  description:
    "Fast, private browser tools for formatting, inspecting, and converting data.",
};

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#f8fafc",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
