# Devtools Build Log

Last updated: 2026-07-18

Living record for what exists, what we are building next, and what is deliberately deferred.

Update rules:

- `Current` describes shipped reality only.
- Keep exactly one active outcome under `First`.
- Move completed work into `Current` and record it under `Log`.
- Reorder `Next` only when implementation findings, usage, or search data justify it.
- Append dated notes under `Log`; do not rewrite older entries.

## Current

- `apps/devtools` exists as an independently deployable Next.js 16 and React 19 application on port `3002`.
- `/json-formatter` is the first working utility: it formats, minifies, validates, and presents JSON in a reader-focused input/output/inspector workspace.
- Its CodeMirror editor provides syntax highlighting, bracket matching, and automatic closing for braces, brackets, and quotes.
- The tool copies formatted output, includes a realistic example, summarizes document structure, and rejects oversized input before parsing.
- The root route is a small Paperwork-themed tool catalog; analytics are still deliberately absent.
- Devtools now uses the Paperwork design language globally: Inter, white/slate surfaces, blue primary actions, compact borders, shared radii, and consistent focus treatment.
- The initial product direction is fast, privacy-first utilities that process input in the browser whenever the task permits it.
- CodeUtilityKit is a useful UX and SEO reference, but not demand validation. Its catalog is broad and very new, and its “PDF & Document” category does not currently include real PDF merge, split, compression, or conversion tools.
- Current workspace rule: keep code inside `apps/devtools`; create a shared package only after another application genuinely needs the same code.

## First — Base64 encoder and decoder

Build the second complete utility and reuse only the page-shell pieces that the JSON tool has now proven.

Route: `/base64`

- Encode and decode Unicode-safe text.
- Open a local file and download decoded binary output.
- Make text versus file mode explicit and show useful invalid-input errors.
- Keep all content in browser memory; do not add history, uploads, accounts, or a generic plugin system.
- Add one focused transformation test and verify the shared shell at desktop and 320px.

## Next — small browser-native tools after Base64

Add these in order, reusing native browser APIs before adding packages:

1. URL encoder and decoder.
2. UUID and secure password generators using `crypto.randomUUID` and `crypto.getRandomValues`.
3. Unix timestamp converter.
4. SHA-256, SHA-384, and SHA-512 text/file checksums using Web Crypto.
5. Word, character, sentence, reading-time, and speaking-time counter.
6. JWT inspector with an explicit “decoded, not signature-verified” warning.
7. Text diff checker.
8. QR generator for URL, text, Wi-Fi, and vCard output in PNG and SVG.

After the second or third tool, extract only the repeated pieces: site navigation, tool-page shell, copy/download controls, privacy notice, and a small tool catalog used by the home page and related-tool links.

## Later — heavier or more specialized clusters

### Data and configuration

- CSV to JSON, JSON to CSV, and CSV table viewer using a proven CSV parser.
- JSON diff, JSONPath tester, JSON secret/PII redactor, and share-safe export.
- YAML, XML, SQL, and TOML formatters and validators.
- `.env` validator/sanitizer and cURL credential redactor.
- Large-file NDJSON/JSON Lines viewer with streaming or worker-based parsing.

### Images

- Image resize and crop.
- JPG, PNG, and WebP conversion.
- Client-side image compression with before/after size and quality controls.

### PDF

- JPG/images to PDF.
- Merge PDFs.
- Split or extract PDF pages.
- Rotate and reorder pages.
- Add page numbers or a watermark.

Use task-specific names such as “Merge PDF” and “JPG to PDF”; do not use the vague label “PDF formatter.” Add a PDF library only when this cluster starts.

## Not now

- OCR, PDF-to-Word, Office conversion, advanced PDF compression, or full PDF editing.
- Video/audio conversion, AI background removal, or image upscaling.
- DNS, WHOIS, domain-rating, or other tools requiring paid/external APIs while the product promises local processing.
- Accounts, cloud history, team workspaces, share links, or a backend before usage proves a need.
- Medical, investment, loan, legal, or other high-stakes calculators.
- One hundred templated pages launched at once. Every indexable route must provide a working, tested tool and unique help content.
- Hand-written cryptography, QR encoding, PDF parsing, CSV parsing, or language parsers when a native browser feature or established library handles the edge cases.

## Selection rule for future tools

A tool moves forward when it scores well on all four questions:

1. Do people repeatedly search for or use it?
2. Can it work reliably in the browser without uploading sensitive input?
3. Does it fit the developer/data/file workflow?
4. Can we ship an honest, complete version without expensive infrastructure?

Use privacy-safe aggregate events and Search Console after launch to choose the next tool. Track the route and action only; never record user input, decoded tokens, passwords, source code, or uploaded files.

## Research snapshot

Directional US monthly search estimates reviewed on 2026-07-17:

| Query | Estimated searches | Implication |
| --- | ---: | --- |
| Word counter | 1.22M | Large acquisition opportunity, but highly competitive |
| QR code generator | 673K | Strong demand and manageable browser implementation |
| JPG to PDF | 201K | Best first PDF conversion once the PDF cluster starts |
| JSON formatter | 135K | Best first developer utility and requires no dependency |
| Merge PDF | 135K | Strong demand, but heavier than the first tool |
| PDF compressor | 74K | Demand exists, but honest compression is technically harder |
| Base64 decode | 74K | Strong repeat-use utility with a small implementation |
| Image compressor | 60.5K | Good browser-only file-tool opportunity |
| Regex tester | 33.1K | Useful later; isolate evaluation to avoid UI freezes |
| UUID generator | 22.2K | Small, safe native-browser utility |
| JWT decoder | 14.8K | Useful, but requires clear security wording |
| JSON to CSV | 9.9K | Smaller demand but strong workflow fit |

These are third-party estimates, not first-party analytics. Use them for ordering, then replace assumptions with our own privacy-safe usage and Search Console data.

## Log

### 2026-07-17 — Direction selected

- Audited the new `apps/devtools` scaffold and confirmed that no utility is shipped yet.
- Reviewed CodeUtilityKit and current utility-search demand.
- Selected a local-only JSON formatter, validator, minifier, and tree viewer as the first utility.
- Ordered the next lightweight browser-native tools and deferred server-heavy conversion work.
- Recorded privacy, security, SEO, and scope boundaries before implementation begins.

### 2026-07-17 — JSON Formatter implemented

- Shipped the local-only `/json-formatter` route with formatting, minification, validation, indentation controls, file input, copy, download, and text/tree result views.
- Used a compact tool-first responsive layout: two editor panes on desktop and input/result tabs on small screens.
- Added a two-million-character and 2 MB file limit, useful syntax locations, private in-memory handling, route metadata, guidance, and related-tool placeholders.
- Added focused transformation tests; all five pass along with TypeScript and the production build.
- Visually checked the empty and formatted-result states on desktop and mobile, including a 320px no-overflow check.

### 2026-07-18 — JSON editor and workspace refined

- Replaced the plain text areas with a CodeMirror JSON editor in both panes, adding syntax highlighting, line numbers, folding, bracket matching, and automatic closing for braces, brackets, and quotes.
- Simplified the workspace into a direct input/result split on desktop and a natural stacked flow on small screens, with inline validation and prominent copy/download actions.
- Used deferred validation so large edits do not block every intermediate render, while keeping all parsing on-device.
- Verified distinct syntax colors and `{}`, `[]`, and `""` auto-closing in a rendered browser, dark mode, keyboard labels, and a 320px layout with no page overflow.
- Added an editor-behavior test; all six focused tests pass along with TypeScript and the production build.

### 2026-07-18 — Stitch reader layout and Paperwork theme applied

- Rebuilt `/json-formatter` from the selected Stitch `Hybrid Split (Reader Focused)` screen: 64px header, compact toolbar, 35% input pane, flexible output pane, 320px inspector, status row, and footer.
- Applied the existing Paperwork Tailwind theme globally to Devtools instead of introducing a separate palette or component style.
- Added live structural statistics and array metadata to the inspector while preserving formatting, minification, validation, copy, syntax highlighting, bracket matching, and automatic closing.
- Reworked small-screen behavior into stacked editors and an explicit toolbar grid so every primary action remains visible.
- Added a JSON summary test; all seven focused tests, TypeScript, and the production build pass. Desktop and small-screen production captures are recorded in the root `design-qa.md`.

## References

- [CodeUtilityKit](https://www.codeutilitykit.com/)
- [CodeUtilityKit tool sitemap](https://www.codeutilitykit.com/sitemap.xml)
- [CodeMirror reference manual](https://codemirror.net/docs/ref/)
- [JSON Hero](https://jsonhero.dev/)
- [Squoosh](https://squoosh.app/)
- [Transform](https://transform.tools/)
- [Google Search spam policies](https://developers.google.com/search/docs/essentials/spam-policies)
- [MDN Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Crypto)
- [pdf-lib](https://pdf-lib.js.org/)
- [Papa Parse](https://www.papaparse.com/)
