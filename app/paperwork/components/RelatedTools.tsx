/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ResolvedTool } from "@smarttools/tool-catalog";
import { Button, StatusBadge } from "@smarttools/ui";
import {
  CheckCircle2,
  ClipboardCheck,
  Compass,
  DollarSign,
  FileText,
  Layers,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

const TOOL_ICONS: Record<string, LucideIcon> = {
  "invoice-generator": FileText,
  "receipt-generator": FileText,
  "expense-report": ClipboardCheck,
  "mileage-log": Compass,
  "quarterly-tax-estimator": DollarSign,
  "w9-request": Layers,
  "1099-nec-tracker": Sparkles,
};

export default function RelatedTools({
  currentComponentKey,
  onTrackClick,
  tools: managedTools,
}: {
  currentComponentKey: string;
  onTrackClick: (itemName: string) => void;
  tools: readonly ResolvedTool[];
}) {
  const tools = managedTools.flatMap((tool) =>
    tool.slug && tool.componentKey !== currentComponentKey
      ? [
          {
            id: tool.id,
            title: tool.name,
            description: tool.description,
            path: `/paperwork/${tool.slug}`,
            Icon: TOOL_ICONS[tool.componentKey] ?? FileText,
          },
        ]
      : [],
  );

  const valueAero = [
    "Securely save and auto-fill business metadata",
    "Remove 'Generated with SmartTools Paperwork' PDF footnotes",
    "Track paid, late, and pending statuses effortlessly",
    "Consolidate annual reports into safe CSV spreadsheets",
    "E-mail generated invoices to clients with tracking triggers",
  ];

  return (
    <div className="mx-auto my-16 max-w-6xl space-y-12 px-4" id="toolkit-sections">
      <section
        className="relative overflow-hidden rounded-3xl bg-foreground p-8 text-background shadow-lg md:p-10"
        id="monetization-banner"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-background/10"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 left-1/3 size-96 rounded-full bg-background/5"
        />

        <div className="relative z-10 max-w-2xl space-y-4">
          <StatusBadge className="gap-1.5" variant="info">
            <Zap aria-hidden="true" className="size-3" />
            Excellent upgrade options
          </StatusBadge>
          <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
            Streamline Your Business with SmartTools Paperwork Pro
          </h2>
          <p className="text-sm leading-6 text-background/70 md:text-base">
            Draft free invoices as long as you want. When your independent freelance practice or contractor operations expand, unlock advanced time-saving features:
          </p>

          <ul className="grid gap-3 pt-2 text-sm text-background/80 md:grid-cols-2">
            {valueAero.map((item) => (
              <li className="flex items-start gap-2" key={item}>
                <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-background/60" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Button
              onClick={() => onTrackClick("upgrade_pro_clicked")}
              type="button"
              variant="secondary"
            >
              Learn More &amp; Join Waiting List
            </Button>
            <span className="text-xs text-background/60">
              No credit card required • Early Bird Access
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-6" id="related-tools-block">
        <div className="mx-auto max-w-xl space-y-2 text-center">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground md:text-2xl">
            Comprehensive Paperwork Toolkit
          </h2>
          <p className="text-sm text-muted-foreground">
            Simplify administrative workflows with professional single-click small business generators.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.Icon;
            return (
              <a
                className="group flex flex-col rounded-2xl border border-border/60 bg-muted/30 p-5 outline-none transition duration-200 hover:border-border hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none"
                href={tool.path}
                id={`tool-card-${tool.id}`}
                key={tool.id}
                onClick={() => onTrackClick(`related_tool_${tool.id}_clicked`)}
              >
                <div className="space-y-3">
                  <div className="grid size-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors duration-200 group-hover:bg-foreground group-hover:text-background motion-reduce:transition-none">
                    <Icon aria-hidden="true" className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-extrabold tracking-tight text-foreground">
                        {tool.title}
                      </h3>
                      <StatusBadge variant="success">Available</StatusBadge>
                    </div>
                    <p className="mt-1.5 text-xs font-medium leading-5 text-muted-foreground">
                      {tool.description}
                    </p>
                  </div>
                </div>
                <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-extrabold text-primary">
                  Launch generator
                  <span
                    aria-hidden="true"
                    className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    →
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      </section>
    </div>
  );
}
