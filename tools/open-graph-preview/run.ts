/**
 * Moved verbatim from the `open-graph-preview` case in
 * `lib/devtools/format-json.ts`: the same escaping, the same `safeUrl` checks
 * on the URL and image, the same landscape/compact dimensions, and the same
 * card markup followed by the generated tags in a trailing comment.
 *
 * Every interpolated value is escaped before it reaches the markup — the result
 * is rendered as HTML, so this is the boundary that keeps it inert.
 */

import { escapeHtml } from "../../lib/devtools/shared/text.ts";
import { safeUrl } from "../../lib/devtools/shared/url.ts";
import { requireUtilityInput } from "../../lib/devtools/shared/options.ts";
import type { ToolResult } from "../../lib/tool-framework/result.ts";
import type { ToolRun } from "../../lib/tool-framework/run.ts";
import type { SettingsOf } from "../../lib/tool-framework/settings.ts";

type Settings = SettingsOf<typeof import("./definition.ts").default.settings>;

export const run: ToolRun<Settings> = (ctx): ToolResult => {
  const title = escapeHtml(requireUtilityInput(ctx.input.text, "Title"));
  const description = escapeHtml(
    requireUtilityInput(ctx.input.secondary ?? "", "Description"),
  );
  const url = ctx.settings.url.trim();
  const siteName = escapeHtml(ctx.settings.siteName.trim());
  const image = ctx.settings.image.trim();
  const { platform, layout, imageFit } = ctx.settings;
  if (url) safeUrl(url, "URL");
  if (image) safeUrl(image, "Image URL");

  const escapedUrl = escapeHtml(url);
  const escapedImage = escapeHtml(image);
  const tags = [
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    ...(url ? [`<meta property="og:url" content="${escapedUrl}">`] : []),
    ...(siteName ? [`<meta property="og:site_name" content="${siteName}">`] : []),
    ...(image ? [`<meta property="og:image" content="${escapedImage}">`] : []),
  ];
  const maxWidth = layout === "compact" ? 420 : 600;
  const imageHeight = layout === "compact" ? 220 : 315;

  return {
    render: "html",
    html: `<article data-platform="${escapeHtml(platform)}" style="max-width:${maxWidth}px;border:1px solid #d1d5db;border-radius:12px;overflow:hidden;font-family:system-ui,sans-serif">${
      image
        ? `<img src="${escapedImage}" alt="" style="display:block;width:100%;height:${imageHeight}px;object-fit:${imageFit === "contain" ? "contain" : "cover"}">`
        : `<div aria-label="Image preview placeholder" style="height:${imageHeight}px;background:linear-gradient(135deg,#1d4ed8,#7c3aed)"></div>`
    }<div style="padding:16px"><small>${siteName || escapedUrl}</small><h2>${title}</h2><p>${description}</p></div></article>\n<!-- Generated tags\n${tags.join("\n")}\n-->`,
  };
};

export default run;
