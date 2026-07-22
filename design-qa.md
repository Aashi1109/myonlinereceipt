# Design QA — JSON Formatter Reader Layout

## Visual truth

- Reference: Stitch screen `JSON Formatter - Hybrid Split (Reader Focused)` (`projects/17074302042339625225/screens/9b5a2f8091ef4058aa2894b9d8f98b76`)
- Reference capture: `/tmp/stitch-json-reader-focused-s0.png`
- Implementation route: `http://localhost:3002/json-formatter`
- Final desktop capture: `/tmp/devtools-json-reader-1280-final.png`
- Responsive capture: `/tmp/devtools-json-reader-500-final.png`
- Comparison viewport: `1280 × 1024`, default valid Project Apollo JSON, inspector open

## Intended adaptation

The Stitch screen is the layout source of truth. The existing Paperwork product theme is the visual-system source of truth, so the implementation deliberately uses Paperwork's white/slate surfaces, blue primary actions, typography, borders, radii, and controls instead of copying Stitch's separate DevHub palette.

## Comparison history

1. Initial comparison found a P0 styling failure: the old development process had cached the pre-PostCSS pipeline, leaving Tailwind theme variables uncompiled. Restarting from a fresh production build restored the complete Paperwork theme.
2. Desktop comparison confirmed the 64px header, compact action row, 35% input pane, flexible output pane, 320px inspector, status row, and footer align with the reference structure.
3. Responsive review found toolbar controls needed deterministic shrinking. The small-screen toolbar now uses explicit three-column and `indent + copy + clear` grids; the editor panes and inspector stack without losing controls.
4. Final desktop comparison and the 500px small-screen capture show no overlapping controls, clipped actions, broken surfaces, or unintended horizontal page overflow. Editor content scrolls inside its pane by design.

## Final assessment

- Fidelity: passed; layout and information hierarchy match the selected Stitch reader screen, with the requested Paperwork theme substitution.
- Typography and color: passed; shared Inter/monospace stacks and Paperwork slate/blue tokens are applied globally.
- Icons and assets: passed; all controls use Lucide icons and no placeholder or hand-drawn assets.
- Responsive layout: passed at desktop and Chrome's minimum uncropped headless viewport of 500px; CSS grid rules remain valid down to the project's 320px minimum.
- Accessibility: passed for semantic buttons/labels, focus-visible treatment, skip link, live status, disabled states, and reduced-motion handling.
- Functional state: passed through focused JSON transformation/editor tests and a production render with valid JSON, highlighted output, validation summary, metadata, and preview.

Previous result: passed

---

# Design QA — Shared SmartTools Product Lockup

## Visual truth

- Selected mark: `/Users/ashishpal/.codex/generated_images/019f8862-4202-7032-97f4-65c16a4d1a40/exec-a0b4afb5-d728-4c3a-8f6e-a17f5a756b3d.png` (`1692 × 949`).
- Lockup reference: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-LMbgan.png` (`458 × 124`).
- Shared implementation: `packages/ui/src/index.tsx` and `packages/ui/src/assets/smarttools-icon.png` (`256 × 256`, RGBA).
- Live routes: `http://127.0.0.1:3000`, `http://127.0.0.1:3001`, and `http://127.0.0.1:3002`.
- Intended comparison state: desktop product header, default theme, 32 CSS px icon, product title above the fixed `by SmartTools` line.

## Evidence

- All three live routes return HTTP 200.
- Server-rendered HTML includes the same emitted `smarttools-icon` asset in Platform, Paperwork, and Devtools.
- Paperwork renders `Paperwork` and `by SmartTools`; Devtools renders `Devtools` and `by SmartTools`; Platform renders `SmartTools` without the redundant byline.
- The production build emitted the same hashed PNG into every consuming Next app.
- A browser-rendered screenshot could not be captured because neither the in-app browser nor its Chrome fallback was available in this session.

## Findings

- Visual comparison is blocked: there is no implementation screenshot to pair with the two source references.
- Fonts and typography: code matches the existing 18px/10px lockup contract, but browser rendering was not available for pixel comparison.
- Spacing and layout rhythm: code retains the existing 32px icon and 10px gap, but browser rendering was not available for pixel comparison.
- Colors and visual tokens: the generated blue/white PNG and shared semantic text tokens are present; rendered color comparison is blocked.
- Image quality and asset fidelity: the final asset is a 256px RGBA PNG with transparent corners; browser scaling quality is unverified.
- Copy and content: verified in server-rendered HTML for all three products.
- Primary interactions and browser console: not checked because browser control was unavailable.
- Focused-region comparison: blocked for the same reason; no implementation capture exists.

## Comparison history

1. No visual iteration was possible. Static rendering, asset emission, lint, and production builds passed, but these do not substitute for browser QA.

final result: blocked

---

# Design QA — Admin Template Editor

## Visual truth

- Reference implementation: `/Users/ashishpal/Downloads/paperworkkit/src/components/admin/TemplateEditor.tsx` and its `FormGroups.tsx`/`InvoicePreviewRenderer.tsx` dependencies.
- Reference capture: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-co2Iqe.png` (`1256 × 1620`).
- Implementation route: `http://localhost:3003/templates/[id]`.
- Intended state: authenticated admin editing a populated template with Property fields selected and the Standard maintenance sample loaded.
- Implementation screenshot: unavailable because neither configured browser surface is available in this session.

## Findings

- The editor now uses compact shared controls and a two-pane responsive workspace instead of scaling the reference's raw dimensions into the Admin container.
- Property fields and Config JSON have explicit selected states; the responsive Edit/Preview switch and screen/page preview controls do as well.
- The five reference datasets are present, including the eight-row and long-content stress cases, and the selected dataset feeds the shared renderer.
- Catalog thumbnails, editor preview, and full preview use the same layout-aware renderer. Theme colors, typography, margins, headers, visibility, watermark, section order, labels, and page size update that renderer.
- Color controls use a native color input beside a bounded hex field; text contrast warnings surface below the theme grid.
- Existing slugs are read-only in the editor and immutable in the server mutation. Back is the only exit control.
- Unapplied JSON blocks tab exit, export, save, and publish; update-and-publish is transactional.
- Visual comparison, responsive interaction, browser console inspection, and focused source/result image comparison remain blocked without a browser-rendered implementation capture.

## Verification

- All five app TypeScript checks pass.
- All 77 repository tests pass (75 passed, 2 integration tests skipped by environment).
- All five Next.js production builds pass.

final result: blocked

---

# Design QA — Admin Templates Catalog

## Visual truth

- Reference: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-QzssGS.png` (`1926 × 610`).
- Implementation route: `http://localhost:3003/templates`.
- Intended state: authenticated admin, populated template catalog, desktop layout.
- Implementation screenshot: unavailable; the in-app browser is unavailable and the unauthenticated HTTP request redirects to the auth app.

## Comparison history

1. The first implementation used dimensions measured directly from the 1926px reference inside the narrower shared Admin container. User review identified the result as oversized.
2. The page was normalized to the shared Admin scale: standard page heading and subtitle, 48px header actions, 28px status pills, 20px card titles, 14px metadata, 40px card actions, and 384px minimum card height.
3. TypeScript and the final production build pass. A post-fix browser capture could not be made, so the corrected visual proportions still need a rendered comparison.

## Fidelity surfaces

- Fonts and typography: normalized to the existing shared UI scale; rendered comparison blocked.
- Spacing and layout rhythm: responsive three/two/one-column grid and compact card spacing are implemented; rendered comparison blocked.
- Colors and visual tokens: shared semantic Admin tokens plus template accent colors are used; rendered comparison blocked.
- Image quality and asset fidelity: the screen contains no raster imagery; the overflow control uses the workspace's existing Lucide icon set.
- Copy and content: header, status, metadata, and action labels match the reference structure while using live template data.
- Primary interactions: create, import, duplicate, publish, default, edit, preview, export, and archive remain wired to the existing actions; browser interaction testing is blocked.
- Focused-region comparison: blocked because no implementation screenshot is available.

final result: blocked

---

# Design QA — Admin Tool Ordering

## Visual truth

- List reference: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-oZUBIl.png` (`1938 × 600`).
- Configuration reference: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-3gRu8e.png` (`2048 × 771`).
- Implementation: `http://localhost:3003/tools`.
- Intended state: compact rows with a left drag handle, slug badge beside the name, status, shadcn switch, and actions; configured slugs are not rendered as inputs and Archive shares the configuration action row.

## Evidence

- Admin TypeScript validation passed.
- The Admin production build passed and includes the dynamic `/tools` route.
- The repository test suite passed, including the reorder transaction and invalid-order checks.
- The live route compiled and redirected to the Auth app as expected.

## Findings

- Visual comparison, drag interaction, switch interaction, responsive rendering, and console inspection are blocked because both available browser surfaces are unavailable in this session and the route requires an authenticated Admin session.
- Static implementation uses the shared product tokens, Lucide icons, the generated shadcn Switch, semantic list markup, keyboard-capable dnd-kit sensors, and an accessible drag handle.

## Comparison history

1. No screenshot comparison iteration was possible. Type validation, production compilation, and the focused persistence check passed, but they do not substitute for authenticated browser QA.
2. The row hierarchy and configuration actions were refined against the supplied screenshots. Type validation and production compilation passed; browser capture remained unavailable.

final result: blocked
