# Shared UI contract

`@smarttools/ui` contains presentation primitives used by more than one SmartTools application. Paperwork supplies the visual baseline, but Paperwork workflows do not belong in this package.

## Shared exports

- Shell: `AppContainer`, `AccountNavigation`, `BrandLockup`, `ProductHeader`, `ToolNav`. `BrandLockup` owns the canonical SmartTools mark and byline; `AccountNavigation` sits in the same header row, and consumers provide only product and session data.
- Structure: `PageHero`, `ToolPageHeader`, `SectionHeading`.
- Actions and fields: `Button`, `buttonVariants`, `Field`, `Input`, `Select`, `Textarea`, `Checkbox`.
- Surfaces and feedback: `Card`, `SectionCard`, `DangerZone`, `CatalogCard`, `StatusBadge`, `AlertBanner`, `EmptyState`.

## Ownership rule

Keep a component here only when at least 3 applications use the same presentation contract. Repeated code within one application stays in that application's component or route scope.

The following remain app-local:

- Paperwork editors, previews, editable financial rows, calculations, and document workflows.
- Devtools editor integrations and JSON workbench behavior.
- Auth account, session, and loading workflows.
- Admin permissions, mutations, tables, and action groups.

## Theme

Every app imports Tailwind and `@smarttools/ui/theme.css`. The theme exposes shadcn-compatible semantic variables through Tailwind v4 `@theme inline`. App-specific content themes, such as invoice template colors, must not alter shared application chrome.

Use the shared `text-caption` utility for compact, nonessential metadata such as brand bylines instead of repeating arbitrary font sizes.

## Reusable composition patterns

These patterns describe presentation only. Product copy, routes, status logic, and workflow behavior stay with the consuming application.

### Cards

- Use `Card` for passive content, `SectionCard` for a grouped page section, and `CatalogCard` when the entire surface leads to one destination.
- Keep the visual shell consistent: semantic card colors, a subtle border and shadow, rounded corners, and `p-5` to `p-6` internal spacing.
- Structure discovery cards as optional icon tile, title, short description, then action. In equal-height grids, use a column layout and `margin-top: auto` on the action instead of fixed heights or large empty gaps.
- Make interactive cards semantic links or buttons with visible hover and keyboard-focus states. Use badges only when they distinguish cards; never repeat a universal status on every card.
- Lay out card collections as one column on small screens, two on medium screens, and three on large screens, with a consistent `gap-6` rhythm.

### Emphasized panels

- Use at most one emphasized panel in a section. Give it a strong foreground-colored surface, inverse text, `rounded-3xl`, responsive `p-8 md:p-10` spacing, and a restrained shadow.
- Keep content in a narrower inner column: optional eyebrow, headline, concise supporting copy, scannable benefits, then one primary action with optional supporting metadata.
- Decorative shapes may add depth, but must remain low contrast, sit behind the content, ignore pointer events, and be hidden from assistive technology.

### Footers

- Use a dedicated `<footer>` with a top border, neutral card surface, generous vertical padding, and the same horizontal container as the page.
- Keep the footer itself compact: brand or copyright text plus a labeled utility navigation. Longer promotional or educational sections belong before it.
- Center or stack content on narrow screens and allow link rows to wrap. Use muted text by default, clear hover and focus-visible states, and real links for navigable destinations.
