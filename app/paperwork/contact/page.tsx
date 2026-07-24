import type { Metadata } from "next";
import InformationPage from "@/app/paperwork/components/InformationPage";

export const metadata: Metadata = {
  title: "Contact Paperwork Support",
  description: "Find the configured support channel for SmartTools Paperwork.",
};

export default function ContactPage() {
  const supportEmail = process.env.SUPPORT_EMAIL?.trim();

  return (
    <InformationPage
      description="Report a problem, share product feedback, or ask about Paperwork Pro."
      eyebrow="Contact"
      title="Get help with Paperwork"
    >
      <section className="space-y-3">
        <h2 className="text-xl font-extrabold tracking-tight">Product support</h2>
        {supportEmail ? (
          <a
            className="inline-flex min-h-11 items-center rounded-md font-bold text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            href={`mailto:${supportEmail}`}
          >
            Email {supportEmail}
          </a>
        ) : (
          <p className="text-muted-foreground">
            This deployment has not configured a support email yet. Please check back after the site administrator adds the SUPPORT_EMAIL setting.
          </p>
        )}
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Include useful context</h2>
        <p className="text-muted-foreground">
          Tell us which tool you were using, what you expected, and what happened. Do not send client financial records, tax identifiers, passwords, or authentication tokens.
        </p>
      </section>
    </InformationPage>
  );
}
