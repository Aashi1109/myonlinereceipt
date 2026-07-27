# Shared UI contract

`@smarttools/ui` contains presentation primitives used by more than one SmartTools application. Paperwork supplies the visual baseline, but Paperwork workflows do not belong in this package.

## Shared exports

- Shell: `AppContainer`, `AccountNavigation`, `BrandLockup`, `ProductHeader`, `ToolNav`. `BrandLockup` owns the canonical SmartTools mark and byline; `AccountNavigation` sits in the same header row, and consumers provide only product and session data.
- Structure: `PageHero`, `ToolPageHeader`, `SectionHeading`, `Tabs`, `SegmentedControl`, `Table`.
- Actions and fields: `Button`, `buttonVariants`, `CompactAction`, `Field`, `AuthField`, `Input`, `Select`, `Textarea`, `Checkbox`, `RadioGroup`, `Switch`.
- Surfaces and feedback: `Card`, `SectionCard`, `DangerZone`, `CatalogCard`, `ToolCard`, `Badge`, `Tag`, `StatusBadge`, `Alert`, `AlertBanner`, `Empty`, `EmptyState`, `Tooltip`, `Toast`, `Toaster`.
- Tool patterns: `WorkbenchShell`, `JsonFormatterWorkbench`, `DataConversionWorkbench`, `UtilityWorkbench`, `ToolPageSystemControls`, and the upload, queue, processing, result, options, guidance, header, and footer compositions exported from `patterns.tsx`.

## Design-file coverage

`DESIGN_SYSTEM_COMPONENTS` is the canonical mapping from all 47 reusable nodes in `design.pen` to their exported code implementations. Keep the manifest and `tests/design-system-alignment.test.mjs` updated whenever a reusable design node is added, renamed, or replaced.

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
- Keep the visual shell consistent: `#FFFFFF`, a `#EAECEF` border, 12px corners, the shared large elevation, and 24px internal spacing.
- Structure discovery cards as optional icon tile, title, short description, then action. In equal-height grids, use a column layout and `margin-top: auto` on the action instead of fixed heights or large empty gaps.
- Make interactive cards semantic links or buttons with visible hover and keyboard-focus states. Use badges only when they distinguish cards; never repeat a universal status on every card.
- Lay out card collections as one column on small screens, two on medium screens, and three on large screens, with a consistent `gap-6` rhythm.

### Emphasized panels

- Use at most one emphasized panel in a section. Give it a strong foreground-colored surface, inverse text, `rounded-3xl`, responsive `p-8 md:p-10` spacing, and a restrained shadow.
- Keep content in a narrower inner column: optional eyebrow, headline, concise supporting copy, scannable benefits, then one primary action with optional supporting metadata.
- Decorative shapes may add depth, but must remain low contrast, sit behind the content, ignore pointer events, and be hidden from assistive technology.

### Footers

- Use `ProductFooter`: `#111214` surface, 56px top/32px bottom spacing, a 300px brand column, and labeled utility columns.
- Use `#FFFFFF` for the brand and headings, `#A7ADB5` for descriptions and links, and a 10% white divider above copyright.
- Stack responsively on narrow screens while preserving real links, clear hover states, and keyboard focus.
