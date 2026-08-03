import type { ToolSpec } from "../../lib/tool-framework/spec";

export default {
  toolId: "devtools.robots-txt-generator",
  app: "devtools",
  category: "developer-generators",
  keywords: [
    "robots.txt",
    "seo",
    "crawler",
    "disallow",
    "sitemap",
    "crawl delay",
    "user-agent",
  ],
  name: "Robots.txt Generator",
  description: "Generate robots.txt directives and an optional sitemap line.",
  input: {
    kind: "text",
    label: "Disallow paths",
    placeholder: "/admin\n/private",
  },
  settings: {
    fields: {
      allowAll: {
        kind: "toggle",
        label: "Allow all",
        help: "Emits an empty Disallow, which permits everything. Any paths you entered are ignored.",
        default: false,
      },
      sitemap: {
        kind: "text",
        label: "Sitemap URL",
        help: "Must be an absolute http or https URL. Leave blank to omit the line.",
        default: "https://example.com/sitemap.xml",
        placeholder: "https://example.com/sitemap.xml",
      },
      crawlDelay: {
        kind: "number",
        label: "Crawl delay",
        help: "Seconds between requests. 0 omits the line. Googlebot ignores this directive.",
        default: 0,
        min: 0,
        max: 86400,
        suffix: "s",
      },
    },
  },
  trigger: { mode: "manual", actionLabel: "Generate robots.txt" },
  capabilities: { copy: true, download: true },
  labels: {
    empty: "Enter the paths you want blocked, or switch on Allow all.",
    ready: "robots.txt is ready.",
    running: "Generating robots.txt…",
  },
  content: {
    howToUse: [
      "List one path per line, each starting with `/`. Paths are relative to the site root — `/admin`, not `https://example.com/admin`.",
      "Switch on Allow all when you want an explicitly permissive file; your path list is then ignored and a bare `Disallow:` is emitted.",
      "Add your sitemap URL as an absolute http or https address. It is validated, so a typo is reported rather than silently written out.",
      "Download the file and place it at the site root — `https://yourdomain.com/robots.txt`. Anywhere else and no crawler will read it.",
    ],
    limitations: [
      "Only one `User-agent: *` group is produced. Per-crawler rules, `Allow:` overrides, and wildcard patterns (`*`, `$`) must be added by hand.",
      "`Crawl-delay` is not part of the original specification. Google ignores it entirely; Bing and Yandex honour it.",
      "robots.txt controls crawling, not indexing. A blocked URL can still appear in search results if other pages link to it — use a `noindex` meta tag or an HTTP header to keep a page out of the index.",
      "It is a public file and a request, not an access control. Listing `/admin` tells everyone the path exists and does not stop anyone from visiting it. Never use it to hide something sensitive.",
      "Paths are written verbatim with no percent-encoding, so a path containing spaces or non-ASCII characters needs encoding first.",
    ],
    faq: [
      {
        q: "Does blocking a URL remove it from Google?",
        a: "No. Blocking prevents crawling, which can actually keep a URL in the index without a snippet. To remove a page, allow crawling and serve `noindex`.",
      },
      {
        q: "Can I use this to protect a private page?",
        a: "No. robots.txt is publicly readable and purely advisory. Use authentication.",
      },
      {
        q: "Why does my crawl delay have no effect on Google?",
        a: "Googlebot ignores `Crawl-delay`. Set the crawl rate in Search Console instead.",
      },
      {
        q: "Where does the file go?",
        a: "At the root of the host: `https://yourdomain.com/robots.txt`. It does not apply to subdomains, which each need their own.",
      },
    ],
    examples: [
      { label: "Block two paths", text: "/admin\n/private" },
      { label: "Block a query-heavy area", text: "/search\n/cart\n/checkout" },
    ],
  },
} as const satisfies ToolSpec;
