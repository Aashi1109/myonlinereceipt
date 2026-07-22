# design-sync notes — @smarttools/paperwork

## What this syncs
- Target is the **Next.js app** `apps/paperwork`, NOT a packaged component library.
  There is no Storybook, no `dist/`, no build barrel. Shape = `package`, synth-from-src.
- Synced set = 10 page/section components in `src/components` (pinned in
  `cfg.componentSrcMap`). Excluded 3 dead components — `FAQSection`, `SEOContent`,
  `InvoicePreview` (defined but never imported; `InvoicePreview` is superseded by
  `InvoicePreviewRenderer`).
- Claude Design project: `918d619f-11fe-47fe-abcf-f29340efecc0` (SmartTools Paperwork).

## Build invariants (re-sync must honor)
- **`--entry ./src/_ds_entry.tsx` is required.** Components are `export default`, and
  the app is not self-installed in `node_modules`, so:
  - `src/_ds_entry.tsx` is a hand-written barrel re-exporting each default as a NAMED
    export → lands on `window.SmarttoolsPaperwork`. Synth mode alone (`export *`) drops
    default exports, so the global would be empty without this barrel. Keep it in sync
    with `cfg.componentSrcMap` when components are added/removed.
  - The barrel's dir walk-up resolves `PKG_DIR` to `apps/paperwork` (has a named
    package.json). Do NOT self-symlink `node_modules/@smarttools/paperwork` → it makes
    ts-morph recurse infinitely (ENAMETOOLONG).
- **CSS is generated, not shipped.** Tailwind v4 compiles at app-build; the DS bundle
  needs a static stylesheet. Regenerate before every rebuild if component classes
  changed: `node .design-sync/compile-css.mjs` (from `apps/paperwork`) →
  `.design-sync/tailwind.css` (= `cfg.cssEntry`). The script bakes in the Inter
  `@import` (FONT_REMOTE) so the pane renders on-brand — don't hand-prepend it.
- Node 24, playwright 1.61.1 installed in `.ds-sync/` (chromium build 1228, cached).
  Validate needs playwright importable from `.ds-sync/node_modules` (ESM ignores
  NODE_PATH) — `npm i playwright@1.61.1` there on a fresh clone.

## Full build + validate (from apps/paperwork)
```
node .design-sync/compile-css.mjs
node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./src/_ds_entry.tsx --out ./ds-bundle
node .ds-sync/package-validate.mjs ./ds-bundle
```

## Known render warns
- None blocking. `[FONT_REMOTE] Inter` is expected (webfont loads at runtime).

## Re-sync risks / what can go stale
- **4 components ship the floor card** (unauthored previews): `InvoiceForm`,
  `InvoicePreviewRenderer`, `RelatedTools`, `TemplateSelector`. They need real props
  to render (invoice data / template / tools array), so they show "preview not yet
  authored". Author `.design-sync/previews/<Name>.tsx` using
  `src/utils/sampleData.ts` + `src/lib/invoice/sampleInvoiceData.ts` +
  `@smarttools/invoice-templates` seeds to make them render. The other 6 page
  components render their full UI standalone.
- The synced components carry ~80 **invalid Tailwind classes** in source
  (`slate-450`, `zinc-405`, `shadow-3xs`, `scale-98`, `w-4.5`) that emit no CSS — they
  render unstyled in the app AND in every design built from them. Fix at source; a
  re-compile won't invent them.
- `src/_ds_entry.tsx` lives in app source (not imported by the app). If a lint/dead-code
  pass deletes it, the build breaks — it's the sync entry.
- Grades/verification are carried by the uploaded `_ds_sync.json`; local `.cache/` is
  gitignored.
