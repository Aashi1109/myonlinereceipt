import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "SmartTools",
  description: "Focused utilities for everyday work.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  );
}
