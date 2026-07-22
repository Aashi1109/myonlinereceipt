import type { Metadata } from "next";
import InformationPage from "../../components/InformationPage";

export const metadata: Metadata = {
  title: "Paperwork Privacy",
  description: "Understand how SmartTools Paperwork stores draft and tool data.",
};

export default function PrivacyPage() {
  return (
    <InformationPage
      description="A plain-language summary of the current Paperwork storage behavior."
      eyebrow="Privacy"
      title="Know where your paperwork data goes"
    >
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Invoice drafts</h2>
        <p className="text-muted-foreground">
          Invoice drafts and Paperwork Pro interest are stored in your browser. Clearing browser storage removes those local records. PDF generation runs in the browser.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Other Paperwork tools</h2>
        <p className="text-muted-foreground">
          Receipt, expense, mileage, tax, W-9, and 1099 tools keep a local cache and may synchronize supported records through guarded Paperwork storage APIs. Those requests use a browser-generated identifier rather than requiring an account.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Your controls</h2>
        <p className="text-muted-foreground">
          Use each tool’s clear action to remove its current draft. Avoid entering unnecessary sensitive information, and export only documents you are prepared to retain or share.
        </p>
      </section>
    </InformationPage>
  );
}
