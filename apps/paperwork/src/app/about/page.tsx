import type { Metadata } from "next";
import InformationPage from "../../components/InformationPage";

export const metadata: Metadata = {
  title: "About SmartTools Paperwork",
  description: "Learn how SmartTools Paperwork helps small businesses create dependable documents quickly.",
};

export default function AboutPage() {
  return (
    <InformationPage
      description="Fast, focused document tools for freelancers, contractors, and small businesses."
      eyebrow="About"
      title="Paperwork without accounting-suite overhead"
    >
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">Built for one job at a time</h2>
        <p className="text-muted-foreground">
          Paperwork provides focused generators for invoices, receipts, expense reports, mileage logs, tax estimates, W-9 requests, and 1099 tracking. Each tool keeps its primary action and output visible without requiring a complex accounting setup.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-extrabold tracking-tight">What we optimize for</h2>
        <p className="text-muted-foreground">
          Clear validation, accurate previews, dependable exports, accessible controls, and plain explanations of where your data is stored.
        </p>
      </section>
    </InformationPage>
  );
}
