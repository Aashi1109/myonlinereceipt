import { getOptionalSession } from "@smarttools/auth/session";
import { getAvailableToolBySlug } from "@smarttools/control-plane";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import JsonWorkbench, {
  DataConversionWorkbench,
  UtilityToolWorkbench,
} from "../json-formatter/json-workbench";
import {
  type UtilityToolResult,
  utilityToolDefinitions,
} from "../../../lib/devtools/format-json";
import { getUniversalToolWorkbench } from "../../../tools/client-registry";

const AHREFS_DOMAIN_RATING_URL =
  "https://api.ahrefs.com/v3/public/domain-rating-free";
const MAX_DOMAIN_RATING_TARGET_LENGTH = 2_048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeDomainRatingTarget(value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Enter a domain or HTTP(S) URL.");
  }

  const input = value.trim();
  if (!input) throw new Error("Enter a domain or HTTP(S) URL.");
  if (input.length > MAX_DOMAIN_RATING_TARGET_LENGTH) {
    throw new Error("Domain or URL must be 2,048 characters or fewer.");
  }

  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(input);
  const hasHttpScheme = /^https?:\/\//i.test(input);
  if ((hasScheme && !hasHttpScheme) || (!hasHttpScheme && /[/?#]/.test(input))) {
    throw new Error("Enter a valid domain or HTTP(S) URL.");
  }

  let parsed: URL;
  try {
    parsed = new URL(hasHttpScheme ? input : `https://${input}`);
  } catch {
    throw new Error("Enter a valid domain or HTTP(S) URL.");
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password
  ) {
    throw new Error("Enter a valid domain or HTTP(S) URL.");
  }

  const domain = parsed.hostname.toLowerCase().replace(/\.$/, "");
  const labels = domain.split(".");
  const validDomain =
    domain.length <= 253 &&
    labels.length >= 2 &&
    isIP(domain) === 0 &&
    labels.every(
      (label) =>
        label.length <= 63 &&
        /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label),
    );
  if (!validDomain) throw new Error("Enter a valid public domain.");

  return domain;
}

async function checkDomainRatingAction(
  value: unknown,
): Promise<UtilityToolResult> {
  "use server";

  const target = normalizeDomainRatingTarget(value);
  const endpoint = new URL(AHREFS_DOMAIN_RATING_URL);
  endpoint.search = new URLSearchParams({ target, output: "json" }).toString();
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKey = process.env.AHREFS_API_KEY?.trim();
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      cache: "no-store",
      headers,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Domain Rating Checker could not reach Ahrefs. Try again.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("Ahrefs rejected the request. Check the API key configuration.");
  }
  if (response.status === 429) {
    throw new Error("Ahrefs rate limit reached. Try again later.");
  }
  if (!response.ok) {
    throw new Error(`Ahrefs lookup failed (${response.status}).`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Ahrefs returned an invalid response.");
  }

  if (!isRecord(payload) || !isRecord(payload.domain_rating)) {
    throw new Error("Ahrefs returned an invalid response.");
  }
  const rating = payload.domain_rating.domain_rating;
  const license = payload.domain_rating.license;
  const warning = payload.domain_rating.warning;
  if (
    typeof rating !== "number" ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 100 ||
    typeof license !== "string" ||
    !license.trim() ||
    license.length > 1_000 ||
    (warning !== null && typeof warning !== "string") ||
    (typeof warning === "string" && warning.length > 2_000)
  ) {
    throw new Error("Ahrefs returned an invalid response.");
  }

  return {
    output: [
      `Target: ${target}`,
      `Domain Rating: ${rating}`,
      "Domain Rating by Ahrefs",
      `License: ${license.trim()}`,
      `Warning: ${warning?.trim() || "None"}`,
    ].join("\n"),
    outputKind: "text",
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const [tool, session] = await Promise.all([
    getAvailableToolBySlug("devtools", slug),
    getOptionalSession(requestHeaders),
  ]);

  if (!tool) notFound();

  const account = {
    returnTo: `/devtools/${slug}`,
    user: session ? { name: session.user.name } : null,
  };

  const UniversalWorkbench = getUniversalToolWorkbench(tool.componentKey);
  if (UniversalWorkbench) {
    return (
      <UniversalWorkbench
        account={account}
        category={tool.category ?? "Developer Tools"}
        definitionKey={tool.componentKey}
        description={tool.description}
        title={tool.name}
      />
    );
  }

  if (tool.componentKey === "json-formatter") {
    return (
      <JsonWorkbench
        account={account}
        category={tool.category ?? "Developer Tools"}
        description={tool.description}
        title={tool.name}
      />
    );
  }

  if (
    tool.componentKey === "json-to-csv" ||
    tool.componentKey === "csv-to-json"
  ) {
    return (
      <DataConversionWorkbench
        account={account}
        category={tool.category ?? "Developer Tools"}
        conversion={tool.componentKey}
        description={tool.description}
        title={tool.name}
      />
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(
      utilityToolDefinitions,
      tool.componentKey,
    )
  ) {
    return (
      <UtilityToolWorkbench
        account={account}
        componentKey={tool.componentKey}
        description={tool.description}
        key={tool.componentKey}
        serverAction={
          tool.componentKey === "domain-rating-checker"
            ? checkDomainRatingAction
            : undefined
        }
        title={tool.name}
      />
    );
  }

  notFound();
}
