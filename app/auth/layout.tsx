import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./styles.css";

export const metadata: Metadata = {
  title: "Account | SmartTools",
  description: "Sign in and manage your SmartTools account.",
};

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
