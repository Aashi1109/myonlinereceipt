import {
  getAuthServiceURL,
  getOptionalSession,
} from "@smarttools/auth/session";
import { getAvailableTools } from "@smarttools/control-plane";
import {
  AccountNavigation,
  CatalogCard,
  PageHero,
  ProductHeader,
  StatusBadge,
} from "@smarttools/ui";
import {
  ClipboardCheck,
  ClipboardList,
  Compass,
  DollarSign,
  FileText,
  ReceiptText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { headers } from "next/headers";

const TOOL_ICONS: Record<string, LucideIcon> = {
  "invoice-generator": FileText,
  "receipt-generator": ReceiptText,
  "expense-report": ClipboardCheck,
  "mileage-log": Compass,
  "quarterly-tax-estimator": DollarSign,
  "w9-request": ClipboardList,
  "1099-nec-tracker": Sparkles,
};

export default async function HomePage() {
  const requestHeaders = await headers();
  const paperworkUrl = process.env.PAPERWORK_URL ?? "http://localhost:3001";
  const [tools, session] = await Promise.all([
    getAvailableTools("paperwork"),
    getOptionalSession(requestHeaders, paperworkUrl),
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <ProductHeader
        actions={
          <AccountNavigation
            authUrl={getAuthServiceURL(paperworkUrl)}
            returnTo={paperworkUrl}
            user={session ? { name: session.user.name } : null}
          />
        }
        href="/"
        name="Paperwork"
      />
      <main>
        <PageHero
          compact
          description="Create invoices, receipts, reports, estimates, and contractor records without an account."
          eyebrow="Small business toolkit"
          title="Choose the paperwork tool for the job."
        />

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => {
              if (!tool.slug) return null;
              const Icon = TOOL_ICONS[tool.componentKey] ?? FileText;

              return (
                <CatalogCard
                  action="Open tool →"
                  description={tool.description}
                  href={`/${tool.slug}`}
                  icon={<Icon aria-hidden="true" className="size-5" />}
                  key={tool.id}
                  status={<StatusBadge variant="success">Available</StatusBadge>}
                  title={tool.name}
                />
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
