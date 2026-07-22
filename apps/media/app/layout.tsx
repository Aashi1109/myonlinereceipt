import type { Metadata, Viewport } from "next";
import "./styles.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.MEDIA_URL ?? "http://localhost:3005"),
  title: {
    default: "SmartTools Media Tools",
    template: "%s | SmartTools Media Tools",
  },
  description:
    "Private image and PDF tools that process files entirely in your browser.",
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
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
