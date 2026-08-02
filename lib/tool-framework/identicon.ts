/** Returns a raw, inline SVG string. */
export function renderIdenticon(toolId: string, name: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < toolId.length; index += 1) {
    hash = Math.imul(hash ^ toolId.charCodeAt(index), 16_777_619);
  }

  const hue = (hash >>> 0) % 360;
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part[0]?.toUpperCase() ?? "")[0] ?? "")
    .join("")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true" focusable="false"><rect width="64" height="64" rx="14" fill="hsl(${hue}, 64%, 42%)"/><text x="32" y="33" fill="white" font-family="system-ui, sans-serif" font-size="24" font-weight="700" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
}
