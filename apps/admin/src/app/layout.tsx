import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: { default: "SmartTools Admin", template: "%s | SmartTools Admin" },
  description: "Manage SmartTools configuration, access, and audit history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
