# SmartTools Paperwork — design system conventions

These are **complete, self-contained tool pages** (invoice, receipt, expense, mileage,
1099-NEC, quarterly-tax, W-9), not low-level UI primitives. Each renders a full
generator: hero header, editor form, live document preview, print/PDF handling.

## Wrapping and setup
- **No provider needed.** Every component renders standalone — no theme/context/router
  wrapper. Just `import` and render.
- Each page component accepts one optional prop: `onTrackClick?: (item: string) => void`
  (analytics hook). Omit it or pass `() => {}`.
- Components self-persist their own draft to `localStorage` and manage all internal state.
  You do not pass data in — they boot with sane blank/sample data.
- **Font: Inter** (loaded via the stylesheet). No other font setup.

## Styling idiom — Tailwind v4 utility classes, stock palette only
Style your own layout glue with Tailwind utilities. Use ONLY valid stock Tailwind
shades (`50 100 200 300 400 500 600 700 800 900 950`) — invented shades like
`slate-450`, `zinc-405`, `shadow-3xs`, `scale-98` emit no CSS and render unstyled.

Vocabulary this DS actually uses:
| Role | Classes |
|---|---|
| Surfaces | `bg-white`, `bg-slate-50`, `bg-zinc-50`, `bg-slate-900` (dark) |
| Text | `text-slate-900` / `-600` / `-500` / `-400`, `text-slate-950` |
| Brand accent | `text-blue-600`, `bg-blue-600` (primary buttons/links) |
| Status pills | `emerald` (ok), `amber` (warn), `rose` (danger), `sky` (info) at `-50/-200/-700` |
| Borders | `border-slate-200`, `border-zinc-200` |
| Radius | `rounded-lg` (inputs) → `rounded-xl` → `rounded-2xl` (cards) → `rounded-3xl` (banners) |
| Shadow | `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-xl` |
| Container | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` |
| Print | `no-print` hides an element when printing |

## Where the truth lives
- `_ds/<folder>/styles.css` and its `@import "./_ds_bundle.css"` closure — the full
  compiled utility set + `--font-sans: Inter` theme token. Read it before styling.
- Per-component `<Name>.d.ts` (props) and `<Name>.prompt.md` (usage).

## Build snippet
```tsx
import { ReceiptGeneratorPage } from "@smarttools/paperwork";

export default function Page() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <ReceiptGeneratorPage onTrackClick={(item) => console.log(item)} />
    </div>
  );
}
```
