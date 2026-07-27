import { ProductFooter } from "@smarttools/ui";
import { Blocks } from "lucide-react";

const footerColumns = [
  {
    title: "Popular tools",
    links: [
      { href: "/paperwork/invoice-generator", label: "Invoice generator" },
      { href: "/devtools/json-formatter", label: "JSON formatter" },
      { href: "/media/compress-image", label: "Compress image" },
      { href: "/media/merge-pdf", label: "Merge PDF" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/", label: "Home" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
      { href: "/auth", label: "Sign in" },
    ],
  },
  {
    title: "Tool suites",
    links: [
      { href: "/paperwork", label: "Paperwork" },
      { href: "/devtools", label: "DevTools" },
      { href: "/media", label: "Media" },
    ],
  },
] as const;

export function SmartToolsFooter() {
  return (
    <ProductFooter
      brand="SmartTools"
      brandMark={<Blocks aria-hidden="true" />}
      columns={footerColumns}
      copyright={`© ${new Date().getFullYear()} SmartTools. All rights reserved.`}
      description="Practical browser tools for documents, developer workflows, media, and everyday tasks."
    />
  );
}
