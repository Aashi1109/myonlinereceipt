# Design QA — JSON Formatter Reader Layout

## Visual truth

- Reference: Stitch screen `JSON Formatter - Hybrid Split (Reader Focused)` (`projects/17074302042339625225/screens/9b5a2f8091ef4058aa2894b9d8f98b76`)
- Reference capture: `/tmp/stitch-json-reader-focused-s0.png`
- Implementation route: `http://localhost:3000/devtools/json-formatter`
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
- Live routes: `http://127.0.0.1:3000/`, `http://127.0.0.1:3000/paperwork`, and `http://127.0.0.1:3000/devtools`.
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

# Design QA — CodeUtilityKit Devtools Parity

Result: passed

## Viewports and states

- Desktop: `1440 × 1200`; homepage top, JSON Viewer example, JSON Validator example, and HTML Viewer example.
- Mobile: `390 × 844`; the same homepage and tool states, including stacked input/output workbenches.
- Homepage hierarchy, hero height, search, capped quick tools, statistics, and the start of Popular Tools align with the reference structure.
- JSON Viewer matches the reference split layout on desktop and stacks cleanly on mobile. Root and first-level containers start expanded; deeper objects start collapsed.
- JSON Validator and HTML Viewer retain equal desktop columns, consistent headers and actions, and full-width mobile stacking without clipped controls or horizontal overflow.

## Interaction checks

- Desktop and mobile browser consoles reported no errors.
- Search results rendered their heading; Base64 encoding returned `aGVsbG8=`; JSON↔CSV examples and repair modes returned the expected output.
- Password generation returned five values at both viewports.
- JSON Validator returned `Valid JSON` and `Root type: object`.
- HTML Viewer rendered `Hello` and `Sandboxed preview.` in the sandboxed preview.
- JSON Viewer example, repair, tree expansion, and nested-object collapse states were verified after the depth correction.
- Desktop generic workbench panes measured `607 × 541` each. Mobile input/output panes measured `356px` wide and stacked at `y=376` and `y=774`.

## Intentional differences

- SmartTools keeps its own product header, blue theme, typography, controls, borders, and radii instead of copying the reference brand.
- Third-party launch badges and the reference blog/navigation content are intentionally omitted.
- External SEO/domain tools remain disabled when their required external services are not configured.

## Evidence

- Homepage reference: `/tmp/codeutilitykit-capture.FXMjWt/desktop-top.png`, `/tmp/codeutilitykit-capture.FXMjWt/mobile-top.png`
- Homepage implementation: `/tmp/codeutilitykit-capture.FXMjWt/local-desktop-top.png`, `/tmp/codeutilitykit-capture.FXMjWt/local-mobile-top.png`
- JSON Viewer reference: `/tmp/codeutilitykit-capture.FXMjWt/json-viewer-desktop-example.png`, `/tmp/codeutilitykit-capture.FXMjWt/json-viewer-mobile-example.png`
- JSON Viewer implementation: `/tmp/codeutilitykit-capture.FXMjWt/local-json-viewer-desktop-example.png`, `/tmp/codeutilitykit-capture.FXMjWt/local-json-viewer-mobile-example.png`
- JSON Validator implementation: `/tmp/codeutilitykit-capture.FXMjWt/local-json-validator-desktop-example.png`, `/tmp/codeutilitykit-capture.FXMjWt/local-json-validator-mobile-example.png`
- HTML Viewer implementation: `/tmp/codeutilitykit-capture.FXMjWt/local-html-viewer-desktop-example.png`, `/tmp/codeutilitykit-capture.FXMjWt/local-html-viewer-mobile-example.png`
- Interaction, console, and layout data: `/tmp/codeutilitykit-capture.FXMjWt/local-data.json`

---

# Design QA — Admin Template Editor

## Visual truth

- Reference implementation: `/Users/ashishpal/Downloads/paperworkkit/src/components/admin/TemplateEditor.tsx` and its `FormGroups.tsx`/`InvoicePreviewRenderer.tsx` dependencies.
- Reference capture: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-co2Iqe.png` (`1256 × 1620`).
- Implementation route: `http://localhost:3000/admin/templates/[id]`.
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

- The root application TypeScript check passes.
- All 77 repository tests pass (75 passed, 2 integration tests skipped by environment).
- The root Next.js production build passes.

final result: blocked

---

# Design QA — Admin Templates Catalog

## Visual truth

- Reference: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-QzssGS.png` (`1926 × 610`).
- Implementation route: `http://localhost:3000/admin/templates`.
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
- Implementation: `http://localhost:3000/admin/tools`.
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

---

# Design QA — Canonical Devtools Workbench Rollout

## Restored-shell result

- The reopened failure is resolved. The initial full-viewport rollout had removed the generic page framing; the implementation now restores the pre-existing site header, breadcrumb, category, title, description, AppContainer sizing and spacing, privacy/help section, and route-specific footer behavior.
- Source inspection confirms the three workbench entrypoints use the original non-editor markup and classes verbatim. Only the editor area uses the shared square `ToolWorkspace` toolbar/panes/status structure.

## Visual truth

- Workspace reference: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-uSdbqI.png`.
- Preserved pre-change shell baselines: `/tmp/codeutilitykit-capture.FXMjWt/local-json-validator-desktop-example.png`, `/tmp/codeutilitykit-capture.FXMjWt/local-json-to-csv-desktop-example.png`, `/tmp/codeutilitykit-capture.FXMjWt/local-json-viewer-desktop-example.png`, and their mobile counterparts.
- Restored-shell comparisons: `/tmp/codeutilitykit-capture.FXMjWt/restored-shell-json-validator-desktop-comparison.png` (old top, restored bottom) and `/tmp/codeutilitykit-capture.FXMjWt/restored-shell-json-validator-mobile-comparison.png` (old left, restored right).
- Full restored framing: `/tmp/codeutilitykit-capture.FXMjWt/workbench-word-counter-1512x760-full.png` and `/tmp/codeutilitykit-capture.FXMjWt/workbench-word-counter-1512-full-page.png`.
- Final refinement captures: `/tmp/devtools-json-to-csv-final.png` and `/tmp/devtools-json-formatter-final.png` (`1280 × 900`).

## Framing and workspace acceptance

- Desktop and mobile header crops for JSON Validator, JSON→CSV, and JSON Viewer are visually identical to the preserved pre-change captures. Automated crop comparison measured `63.13 dB` PSNR on desktop and `63.40 dB` on mobile for all three routes; the remaining delta is capture rasterization-level.
- At `1280 × 900`, `/word-counter` stays in the original 32px-inset AppContainer: the square workspace is 1216px wide, input/output begin at `x=32` and `x=457.59`, and both panes retain a 444px canvas.
- At `390 × 844`, the original 16px page inset remains. The 358px-wide input/output panes stack at `y=383` and `y=831` with no overlap.
- Workspace, toolbar, and content widths match their intended container widths at both viewports; page and workspace horizontal overflow checks pass.
- Visible breadcrumbs, `Runs locally`, category labels, H1 titles, descriptions, support sections, and exact converter footer text are asserted in the browser. Generic and Viewer routes correctly retain their pre-existing no-footer behavior.
- The final live JSON→CSV capture confirms the `Runs locally` and category tags sit inline with the H1, the obsolete page-header divider is absent, and the workspace uses a subtle theme border with rounded corners and no visible shadow. The formatter capture confirms the same rounded, bordered workspace treatment without adding the framed-page heading or breadcrumb.

## Interaction and state checks

- The focused Chromium matrix passed desktop and mobile (`2 passed`) across `/json-formatter`, `/json-to-csv`, `/word-counter`, `/text-diff-checker`, `/password-generator`, `/json-validator`, `/html-viewer`, `/qr-code-generator`, and `/json-viewer`.
- Actions remain tool-specific; copy/download and pristine Clear disabled states enable only after meaningful output exists.
- Conversion, counting, diffing, generation, validation, and Viewer tree behavior passed. HTML remained sandboxed at both viewports, and QR images rendered at `naturalWidth=320`.
- Final capture data contains no tool console errors and no failed HTTP responses. The test excludes only the known global `/favicon.ico` 404 and remains strict for every other console or network failure.

## Findings

- P0: none.
- P1: none; removed page framing was the reopened P1 and is resolved.
- P2: the unchanged global shell still requests a missing `/favicon.ico`; it does not affect the workbench and remains outside this header-preservation change.

## Evidence and verification

- Route screenshots, full-page framing, measured actions/layouts, and preview data: `/tmp/codeutilitykit-capture.FXMjWt/workbench-*.png` and `/tmp/codeutilitykit-capture.FXMjWt/workbench-qa-data.json`.
- Focused Playwright matrix — passed (`2 passed`).
- Standalone strict TypeScript check for `tests/e2e/public-tools.spec.ts` — passed.
- `git diff --check -- tests/e2e/public-tools.spec.ts design-qa.md` — passed.

final result: passed

---

# Design QA — Advanced Template Editor Native Panels

## Visual truth

- Selected layout target: `/Users/ashishpal/.codex/generated_images/019f8d92-6935-78a1-b83b-e566638e0544/call_c0fpbBjYLFd7OygbnwTC35Ow.png` (`1487 × 1058`).
- Regression evidence: `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-Wy47UA.png` (`806 × 1416`) and `/var/folders/v3/xftm0p854d36xsmvr71qtkl80000gq/T/codex-clipboard-I7ZkL8.png` (`124 × 704`).
- Intended state: desktop advanced editor, one element selected, pdfme's complete native field-details panel floating within the canvas, and only the SmartTools tool rail visible on the left.
- Post-fix implementation screenshot: unavailable.
- Viewport, CSS size, and device density: unavailable from the supplied crops.

## Comparison history

1. User evidence found two P1 regressions: the custom reduced inspector replaced pdfme's complete field controls and overflowed the canvas, while pdfme's separate 45px plugin strip remained beside the SmartTools rail.
2. The reduced inspector was removed. The pinned pdfme `DetailView` is now the only field inspector, its native sidebar is floated inside the canvas without reducing canvas width, and it appears on the first selection.
3. The pdfme left plugin strip is hidden and its reserved width is reclaimed. SmartTools' labeled Add panel remains the single add-element surface.
4. Focused tests, Admin typecheck, the full repository suite, and the Admin production build pass. A same-state browser capture and console/interaction pass could not be completed because the Playwright Chrome permission request was cancelled.

## Fidelity surfaces

- Fonts and typography: native pdfme property controls are preserved; post-fix rendered comparison is blocked.
- Spacing and layout rhythm: the field panel is inset 16px on all sides of the canvas and no longer extends over the document footer; post-fix rendered comparison is blocked.
- Colors and tokens: the floating native panel uses the shared card and border tokens; post-fix rendered comparison is blocked.
- Image quality: no raster assets are introduced by this correction.
- Copy and content: pdfme's complete native field labels and plugin-specific controls are preserved instead of recreated.
- Focused region: the two supplied regression crops were inspected, but no post-fix crop exists for a valid paired comparison.

## Findings

- P1 verification blocker: a browser-rendered post-fix screenshot and interaction state are still required to confirm that the native left strip is absent and the native field panel neither clips nor overlaps.

final result: blocked
