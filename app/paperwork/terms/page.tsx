import type { Metadata } from "next";
import InformationPage from "@/app/paperwork/components/InformationPage";

export const metadata: Metadata = {
  title: "Paperwork Terms",
  description: "Review the current usage terms and limitations for SmartTools Paperwork.",
};

export default function TermsPage() {
  return (
    <InformationPage
      description="Use Paperwork as a document-preparation aid and verify important outputs before sending or filing them."
      eyebrow="Terms"
      title="Practical terms for using Paperwork"
    >
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">You control the final document</h2>
        <p className="text-muted-foreground">
          Review names, dates, totals, tax settings, payment details, and exported files before sharing them. You are responsible for the information you enter and the documents you issue.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Not professional advice</h2>
        <p className="text-muted-foreground">
          Paperwork does not provide legal, accounting, payroll, or tax advice. Consult a qualified professional for obligations specific to your business or location.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Availability</h2>
        <p className="text-muted-foreground">
          Features may change as the toolkit improves. Keep your own copies of documents and records that matter to your business.
        </p>
      </section>
    </InformationPage>
  );
}
