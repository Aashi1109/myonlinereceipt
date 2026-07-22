import {
  getAuthServiceURL,
  getOptionalSession,
} from "@smarttools/auth/session";
import {
  getAvailableToolBySlug,
  getAvailableTools,
  getPublishedTemplates,
} from "@smarttools/control-plane";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import App from "@/App";

const COMPONENT_KEYS = new Set([
  "invoice-generator",
  "receipt-generator",
  "expense-report",
  "mileage-log",
  "quarterly-tax-estimator",
  "w9-request",
  "1099-nec-tracker",
]);

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const paperworkUrl = process.env.PAPERWORK_URL ?? "http://localhost:3001";
  const [tool, tools, session] = await Promise.all([
    getAvailableToolBySlug("paperwork", slug),
    getAvailableTools("paperwork"),
    getOptionalSession(requestHeaders, paperworkUrl),
  ]);

  if (!tool || !COMPONENT_KEYS.has(tool.componentKey)) notFound();

  const templates =
    tool.componentKey === "invoice-generator"
      ? await getPublishedTemplates()
      : [];

  return (
    <App
      account={{
        authUrl: getAuthServiceURL(paperworkUrl),
        returnTo: paperworkUrl,
        user: session ? { name: session.user.name } : null,
      }}
      componentKey={tool.componentKey}
      templates={templates}
      tools={tools}
    />
  );
}
