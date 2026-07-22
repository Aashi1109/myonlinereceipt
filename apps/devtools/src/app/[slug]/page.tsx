import {
  getAuthServiceURL,
  getOptionalSession,
} from "@smarttools/auth/session";
import { getAvailableToolBySlug } from "@smarttools/control-plane";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import JsonWorkbench from "../json-formatter/json-workbench";

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const devtoolsUrl = process.env.DEVTOOLS_URL ?? "http://localhost:3002";
  const [tool, session] = await Promise.all([
    getAvailableToolBySlug("devtools", slug),
    getOptionalSession(requestHeaders, devtoolsUrl),
  ]);

  if (!tool || tool.componentKey !== "json-formatter") notFound();

  return (
    <JsonWorkbench
      account={{
        authUrl: getAuthServiceURL(devtoolsUrl),
        returnTo: devtoolsUrl,
        user: session ? { name: session.user.name } : null,
      }}
      platformUrl={process.env.PLATFORM_URL ?? "http://localhost:3000"}
    />
  );
}
