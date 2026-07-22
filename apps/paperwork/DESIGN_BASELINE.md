# Paperwork Design Baseline

| Field | Value |
| --- | --- |
| Version | 1.1 |
| Status | Visual source specification for Paperwork |
| Visual source | apps/paperwork only |
| Intended consumers | Platform, Paperwork, Devtools, Auth, Admin, and future SmartTools apps |
| Shared extraction target | @smarttools/ui, only after cross-app reuse exists |

## 1. Authority and scope

This is the single SmartTools product design system.

Paperwork is the only visual source of truth. Other applications provide functional requirements, but their current styling is not design evidence.

The system preserves Paperwork's strongest qualities:

- Calm light workspaces.
- Strong blue/slate identity.
- Large, legible task headings.
- White cards with thin neutral borders.
- Dense but understandable forms.
- Live editor/result layouts.
- Trustworthy printable previews.
- Clear result actions.
- Compact status treatments.
- Functional, restrained motion.

The system intentionally normalizes Paperwork's inconsistent utility values. It is an extraction, not a command to reproduce every existing class literally.

### Canonical versus observed

- Observed describes patterns currently visible in Paperwork.
- Canonical describes the normalized system every app should use next.
- Canonical tokens and components override improvised shades, sizes, and one-off class combinations.
- Generated invoice themes are content themes. They must never change product chrome.

### Current implementation boundary

The shared package exposes only the proven cross-app foundation: app containers and headers, account/tool navigation, page and section headings, buttons, native form controls, cards, catalog/list states, status badges, alerts, empty states, and the Paperwork theme. Domain workflows remain in their owning apps.

Implemented shared exports:

- Shell and navigation: AppContainer, AccountNavigation, BrandLockup, ProductHeader, and ToolNav.
- Page structure: PageHero, ToolPageHeader, and SectionHeading.
- Actions and forms: Button, buttonVariants, Field, Input, Select, Textarea, and Checkbox.
- Surfaces and feedback: Card, SectionCard, DangerZone, CatalogCard, StatusBadge, AlertBanner, and EmptyState.

Intentionally app-local: editor/preview workspaces, invoice/receipt/expense/mileage/tax/W-9/1099 rows and previews, CodeMirror integration, Auth session/account/loading flows, and Admin permission/action workflows and action groups. These compose shared primitives without becoming generic package APIs.

### Evidence levels

Use these labels when converting this specification into screens or code:

- **Observed:** directly repeated in the current Paperwork product, such as the brand header, white bordered cards, 7/5 workspaces, segmented mobile view switching, compact badges, editable rows, and paper previews.
- **Normalized:** a deliberate cleanup of repeated Paperwork choices, such as one Slate neutral family, semantic color roles, one focus treatment, and an 11px functional-text floor.
- **Extended:** required by Auth or Admin but not yet expressed as a complete Paperwork component, such as a password reveal control, session list, pagination, skeleton loading, toast region, and permission matrix. Extended patterns must use the tokens and primitives here and must not create a second visual language.

## 2. Design principles

### 2.1 Put the task first

Show the primary input, primary action, and result before support content. Do not lead with dashboards, decoration, or marketing when a user arrived to complete a task.

### 2.2 Make trust visible

Place validation, storage behavior, calculation assumptions, irreversible consequences, and export limitations beside the action they affect.

### 2.3 One system, variable density

All apps use the same typography, colors, controls, feedback, focus treatment, and spacing model.

- Platform is spacious.
- Paperwork is form-first.
- Devtools may be denser and use more monospace.
- Auth is focused and reassuring.
- Admin is operational and comparison-heavy.

Density changes; identity does not.

### 2.4 Prefer clarity over maximum density

Use persistent labels, short explanations, strong grouping, and progressive disclosure. Advanced controls stay reachable without competing with the normal path.

### 2.5 Design for the real outcome

Print, copy, export, download, and save actions must be prominent and accurately named. The visible preview should match the resulting artifact.

### 2.6 Every state is part of the component

Default, hover, focus, active, disabled, loading, empty, success, warning, validation, error, read-only, and destructive states are designed deliberately.

### 2.7 Accessibility is a foundation

Target WCAG 2.2 AA. Keyboard access, visible focus, readable type, semantic structure, reduced motion, and non-color status cues are required.

## 3. Brand system

### 3.1 Brand asset

Canonical source:

- packages/ui/src/assets/smarttools-icon.png
- Native source dimensions: 256 × 256.
- Blue rounded-square field with a white three-part geometric mark.

Rules:

- Use the real raster asset. Do not redraw it with CSS, SVG, emoji, or a substitute glyph.
- Do not recolor, rotate, distort, add effects, or crop the mark.
- Maintain a clear area equal to at least 25% of the rendered icon width.
- When the icon sits beside visible product text, use empty alt text because the adjacent name supplies the label.
- When the icon is the only brand label, use alt text “SmartTools.”

Sizes:

| Context | Icon |
| --- | ---: |
| Compact utility | 24px |
| Standard product header | 32px |
| Large auth or empty state | 40px |
| Brand showcase only | 64px |

### 3.2 Product lockup

Anatomy:

1. SmartTools icon.
2. Product name such as Paperwork, Devtools, Auth, or Admin.
3. Small “by SmartTools” line when the product name is not SmartTools itself.

Standard lockup:

- Icon: 32px.
- Gap: 10px.
- Product name: 18px, 800 weight, brand blue.
- Byline: 10px minimum, 600 weight, subtle ink, 0.04em tracking.
- Lockup links to the current product's home.

Do:

- Keep the icon and name visually compact.
- Use the same lockup across every app.

Do not:

- Create a different logo for Admin or Auth.
- use gradients, glows, or mascots.
- use the byline as tiny decorative text below 10px.

### 3.3 Brand voice

The product should feel:

- Direct.
- Calm.
- Precise.
- Useful.
- Honest.
- Privacy-aware.

Prefer:

- “Save changes”
- “Draft saved”
- “No templates found”
- “This will revoke 3 sessions”
- “Your draft is saved automatically”

Avoid:

- Hype.
- Fake urgency.
- “Magic,” “revolutionary,” or “effortless.”
- Legal or security claims the product cannot prove.
- “Local only” while anonymous server synchronization is unresolved.

## 4. Token architecture

Use three token levels:

1. Primitive: raw palette, spacing, radius, and type values.
2. Semantic: role-based product decisions.
3. Component: local aliases only when a component genuinely needs them.

Designs and code should consume semantic tokens. Primitive names are for token definitions and documentation, not routine screen styling.

### 4.1 Primitive color palette

The palette is deliberately small. Do not add improvised 150, 250, 350, 450, 550, 650, 705, 805, 905, or 955 shades.

#### Slate

| Token | Hex | Use |
| --- | --- | --- |
| slate-50 | #F8FAFC | Main canvas |
| slate-100 | #F1F5F9 | Selected neutral surface |
| slate-200 | #E2E8F0 | Borders and separators |
| slate-300 | #CBD5E1 | Strong border |
| slate-400 | #94A3B8 | Subtle metadata |
| slate-500 | #64748B | Muted text |
| slate-600 | #475569 | Secondary text |
| slate-700 | #334155 | Strong secondary text |
| slate-800 | #1E293B | Secondary action ink |
| slate-900 | #0F172A | Primary action and heading |
| slate-950 | #020617 | Highest-emphasis ink and utility bar |

Paperwork currently mixes Slate and Zinc for visually equivalent neutral roles. The canonical system folds those Zinc usages into Slate so every app shares one neutral scale. Zinc remains observed implementation debt, not a design token family.

#### Blue

| Token | Hex | Use |
| --- | --- | --- |
| blue-50 | #EFF6FF | Brand-tinted surface |
| blue-100 | #DBEAFE | Brand selection surface |
| blue-200 | #BFDBFE | Brand border |
| blue-400 | #60A5FA | Hover border only |
| blue-600 | #2563EB | Brand, focus, primary action |
| blue-700 | #1D4ED8 | Primary hover |

#### Emerald

| Token | Hex | Use |
| --- | --- | --- |
| emerald-50 | #ECFDF5 | Success surface |
| emerald-100 | #D1FAE5 | Strong success surface |
| emerald-200 | #A7F3D0 | Success border |
| emerald-600 | #059669 | Success icon |
| emerald-700 | #047857 | Success text |

#### Amber

| Token | Hex | Use |
| --- | --- | --- |
| amber-50 | #FFFBEB | Warning surface |
| amber-200 | #FDE68A | Warning border |
| amber-600 | #D97706 | Warning icon |
| amber-700 | #B45309 | Warning text |

#### Orange

| Token | Hex | Use |
| --- | --- | --- |
| orange-50 | #FFF7ED | Validation summary surface |
| orange-200 | #FED7AA | Validation summary border |
| orange-800 | #9A3412 | Validation summary text |

#### Rose

| Token | Hex | Use |
| --- | --- | --- |
| rose-50 | #FFF1F2 | Destructive surface |
| rose-100 | #FFE4E6 | Destructive hover surface |
| rose-200 | #FECDD3 | Destructive border |
| rose-600 | #E11D48 | Destructive action |
| rose-700 | #BE123C | Destructive hover text |
| rose-950 | #4C0519 | Highest-emphasis destructive ink |

#### Base

| Token | Hex | Use |
| --- | --- | --- |
| white | #FFFFFF | Main surface and document |
| black | #000000 | Print and rare hover only |
| overlay | rgba(15, 23, 42, 0.48) | Modal backdrop |

### 4.2 Semantic color tokens

#### Background

| Semantic token | Primitive |
| --- | --- |
| color.bg.canvas | slate-50 |
| color.bg.surface | white |
| color.bg.subtle | slate-50 |
| color.bg.muted | slate-100 |
| color.bg.inverse | slate-950 |
| color.bg.brand-subtle | blue-50 |
| color.bg.info | blue-50 |
| color.bg.success | emerald-50 |
| color.bg.warning | amber-50 |
| color.bg.validation | orange-50 |
| color.bg.danger | rose-50 |
| color.bg.overlay | overlay |

#### Text and icon

| Semantic token | Primitive |
| --- | --- |
| color.text.strong | slate-950 |
| color.text.default | slate-900 |
| color.text.secondary | slate-600 |
| color.text.muted | slate-500 |
| color.text.subtle | slate-400 |
| color.text.inverse | white |
| color.text.brand | blue-600 |
| color.text.info | blue-700 |
| color.text.success | emerald-700 |
| color.text.warning | amber-700 |
| color.text.validation | orange-800 |
| color.text.danger | rose-600 |
| color.icon.default | slate-600 |
| color.icon.subtle | slate-400 |

#### Border and focus

| Semantic token | Primitive |
| --- | --- |
| color.border.subtle | slate-100 |
| color.border.default | slate-200 |
| color.border.control | slate-200 |
| color.border.strong | slate-300 |
| color.border.brand | blue-200 |
| color.border.info | blue-200 |
| color.border.success | emerald-200 |
| color.border.warning | amber-200 |
| color.border.validation | orange-200 |
| color.border.danger | rose-200 |
| color.focus | blue-600 |

#### Action

| Semantic token | Default | Hover | Text |
| --- | --- | --- | --- |
| action.brand | blue-600 | blue-700 | white |
| action.strong | slate-900 | slate-950 | white |
| action.secondary | slate-100 | slate-200 | slate-800 |
| action.ghost | transparent | slate-100 | slate-700 |
| action.danger-subtle | rose-50 | rose-100 | rose-600 |
| action.danger-solid | rose-600 | rose-700 | white |

### 4.3 Color usage rules

- Brand blue identifies the product, primary navigation, selection, and forward progress.
- Slate-900 identifies strong document/output actions and high-emphasis neutral actions.
- Use only one visually primary action within a local decision group.
- Use Slate for both page chrome and dense neutral field/row surfaces; density comes from spacing and type, not a second gray family.
- Status color always includes a text label and, where helpful, an icon.
- Do not use generated invoice theme colors in headers, forms, Auth, Admin, or Devtools chrome.
- Do not place gray text below WCAG AA contrast on white or slate-50.
- Do not use red for routine validation if orange provides a calmer distinction; reserve rose/red for destructive or failed states.

### 4.4 Typography

#### Families

| Token | Stack | Use |
| --- | --- | --- |
| font.sans | Inter, ui-sans-serif, system-ui, sans-serif | All product UI |
| font.mono | ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace | JSON, IDs, slugs, raw metadata, numeric/code output |
| font.document | Template-defined | Generated document content only |

Product chrome always uses font.sans. A document template may choose another font inside PaperPreview only.

#### Canonical type scale

| Style | Size / line | Weight | Tracking | Use |
| --- | --- | ---: | --- | --- |
| display-lg | 60 / 60px | 900 | -0.04em | Large landing hero |
| display-md | 48 / 52px | 900 | -0.035em | Standard landing hero |
| heading-1 | 36 / 40px | 900 | -0.025em | Page title |
| heading-2 | 30 / 36px | 900 | -0.02em | Tool title |
| heading-3 | 24 / 32px | 800 | -0.015em | Major card group |
| heading-4 | 20 / 28px | 800 | -0.01em | Card title |
| body-lg | 16 / 28px | 500 | 0 | Intro copy |
| body-md | 14 / 22px | 500 | 0 | Default copy |
| body-sm | 12 / 18px | 500 | 0 | Dense help and metadata |
| label | 12 / 16px | 700 | 0.01em | Field and action label |
| overline | 11 / 14px | 800 | 0.12em | Eyebrow, section label, badge |
| code-sm | 12 / 18px | 500 | 0 | IDs and structured values |

Rules:

- Functional text must not be smaller than 11px.
- Use 10px only for the brand byline or nonessential document metadata.
- Retire 8px and 9px operational labels.
- Use uppercase only for overlines, compact status labels, and short section labels.
- Do not uppercase long headings, button labels, help text, or error messages.
- Use 700 for actions/labels, 800 for card headings, and 900 for major headings.
- Default body copy should not be bold.

### 4.5 Spacing

Use a 4px base grid.

| Token | Value | Typical use |
| --- | ---: | --- |
| space-0 | 0 | Reset |
| space-1 | 4px | Icon/text micro-gap |
| space-2 | 8px | Compact control gap |
| space-3 | 12px | Field internals |
| space-4 | 16px | Standard group gap |
| space-5 | 20px | Compact card padding |
| space-6 | 24px | Standard card padding |
| space-8 | 32px | Workspace gap and page section |
| space-10 | 40px | Large section |
| space-12 | 48px | Page rhythm |
| space-16 | 64px | Hero and major separation |
| space-20 | 80px | Wide desktop hero only |

Rules:

- Use 16px between related fields.
- Use 24px inside standard cards.
- Use 24–32px between cards.
- Use 32px between editor and preview panes.
- Use 48–64px between unrelated page regions.
- Avoid arbitrary 5px, 7px, 13px, or 18px gaps.

### 4.6 Sizing and touch targets

| Token | Height | Use |
| --- | ---: | --- |
| control-sm | 36px | Dense desktop-only secondary control |
| control-md | 40px | Standard field/button |
| control-lg | 48px | Primary Auth action or prominent mobile action |
| icon-sm | 32px | Low-risk compact icon action |
| icon-md | 40px | Standard icon action |
| touch-min | 44px | Minimum mobile hit area |

Inputs and buttons must not fall below 40px in standard layouts. If an icon visually occupies 16px, its hit target still meets the applicable control size.

### 4.7 Radius

| Token | Value | Use |
| --- | ---: | --- |
| radius-sm | 4px | Tiny badge or document cell |
| radius-md | 8px | Inputs, small buttons, tool-nav chips |
| radius-lg | 12px | Primary buttons, tabs, list items |
| radius-xl | 16px | Cards, modals, previews |
| radius-2xl | 24px | Rare promo/hero panel |
| radius-full | 9999px | Status and filter pills |

Do not introduce new radii without a structural reason.

### 4.8 Borders

| Token | Value |
| --- | --- |
| border-default | 1px solid color.border.default |
| border-control | 1px solid color.border.control |
| border-strong | 1px solid color.border.strong |
| border-emphasis | 2px solid current semantic color |
| border-dashed | 2px dashed color.border.strong |

Use borders before shadows to establish card hierarchy.

### 4.9 Elevation

| Token | Shadow | Use |
| --- | --- | --- |
| elevation-0 | none | Flat surfaces |
| elevation-1 | 0 1px 2px rgba(15, 23, 42, 0.05) | Input-adjacent card, tab selection |
| elevation-2 | 0 4px 12px rgba(15, 23, 42, 0.08) | Hovered catalog card, sticky action card |
| elevation-3 | 0 16px 40px rgba(15, 23, 42, 0.14) | Document preview |
| elevation-overlay | 0 24px 64px rgba(15, 23, 42, 0.20) | Modal/dialog |

Retire unsupported shadow-3xs. Use elevation-1.

### 4.10 Motion

| Token | Duration | Use |
| --- | ---: | --- |
| motion-fast | 100ms | Icon/color response |
| motion-standard | 150ms | Controls, tabs, list selection |
| motion-enter | 200ms | Disclosure, banner, panel entry |
| motion-slow | 240ms | Overlay only |

Easing:

- Standard: cubic-bezier(0.2, 0, 0, 1).
- Enter: cubic-bezier(0.16, 1, 0.3, 1).

Allowed motion:

- Color and border transition.
- 2px hover lift on catalog cards and high-emphasis output actions.
- 4px upward fade on newly revealed support content.
- Small active press feedback.

Not allowed:

- Continuous bouncing status icons.
- Decorative spinners on non-loading icons.
- Motion that delays a result.
- Large parallax, spring overshoot, or layout shift.

Reduced motion:

- Remove transforms.
- Make duration effectively zero.
- Preserve visibility and state change.

### 4.11 Z-index

| Token | Value | Use |
| --- | ---: | --- |
| z-base | 0 | Page content |
| z-sticky | 40 | Sticky product header and action rail |
| z-dropdown | 50 | Menu and combobox list |
| z-overlay | 60 | Dialog backdrop and panel |
| z-toast | 70 | Toast region |
| z-skip | 80 | Skip link |

Retire z-55 and arbitrary z-index values.

### 4.12 Breakpoints

Use Tailwind-compatible breakpoints:

| Token | Width | Behavioral intent |
| --- | ---: | --- |
| sm | 640px | Increase side padding, simple two-column content |
| md | 768px | Show desktop detail panes, four-up metrics |
| lg | 1024px | Activate 12-column editor/preview and master/detail layouts |
| xl | 1280px | Full max-width composition |
| 2xl | 1536px | No wider container; preserve readable line length |

Required design checkpoints:

- 390px mobile.
- 768px tablet.
- 1024px small desktop.
- 1440px desktop.
- Validate at 320px for overflow.

### 4.13 Containers and grids

#### App container

- Maximum width: 1280px.
- Mobile padding: 16px.
- sm padding: 24px.
- lg padding: 32px.

#### Reading container

- Maximum width: 768px.
- Use for policy, help, explanatory content, and narrow form success states.

#### FAQ/support container

- Maximum width: 896px.

#### Modal container

- Compact: 448px.
- Standard: 560px.
- Large form: 720px.

#### Grid

- Mobile: 4 columns, 16px gutter.
- Tablet: 8 columns, 20–24px gutter.
- Desktop: 12 columns, 24px gutter.
- Workspace split gap: 32px.

Canonical compositions:

- Editor/preview: 7/5 columns.
- Master/detail: 4/8 columns.
- Equal form/result: 6/6 columns.
- Catalog: 1/2/3 columns.
- Metrics: 2 columns mobile, 4 columns from md.

## 5. Icons and imagery

### 5.1 Icon library

Use Lucide for product icons.

| Size | Use |
| ---: | --- |
| 12px | Badge metadata |
| 14px | Dense secondary control |
| 16px | Standard button and field accessory |
| 20px | Alert, list leading icon |
| 24px | Empty state or metric |

Rules:

- Default stroke: 1.75–2px.
- Icon inherits text color.
- Decorative icons use aria-hidden.
- Icon-only buttons require an accessible name and tooltip when the meaning is not universal.
- Use one icon per action; do not stack icons decoratively.
- Do not use emoji, text symbols, CSS drawings, or handcrafted substitute SVGs.

### 5.2 Product imagery

The system does not require decorative hero imagery.

Allowed:

- Real brand icon.
- Real document previews.
- User-provided logos inside documents.
- Purpose-built illustrations only when a future empty state genuinely needs one.

Not allowed:

- Stock photography without a product reason.
- Decorative gradients or abstract blobs.
- Fake screenshots.
- Placeholder boxes presented as final assets.

## 6. Application shell

### 6.1 AccountNavigation

Purpose: lightweight global account access in the product header.

Specification:

- Shares the same row and vertical alignment as BrandLockup.
- Right-aligned after product navigation and contextual actions.
- Never creates a separate top bar.
- Hidden in print with ProductHeader.

- Signed out: “Sign in.”
- Signed in: user name or “Account.”
- Destination preserves returnTo.
- Minimum hit target: 40px desktop, 44px mobile.

### 6.2 ProductHeader

Purpose: persistent product identity and primary app navigation.

Anatomy:

1. BrandLockup.
2. Product or section navigation.
3. Context actions such as save status or Clear.

Specification:

- Minimum height: 64px.
- Surface: white.
- Border bottom: color.border.default.
- Sticky: top 0; z-sticky.
- AppContainer alignment.
- Desktop items align center.
- Mobile items wrap; navigation moves to a full-width second row.
- Hidden in print.

### 6.3 ToolNav

Purpose: switch among sibling tools or Admin sections.

Specification:

- Horizontal row of compact chips.
- 8px gap.
- 8px radius.
- Standard padding: 12px horizontal, 8px vertical.
- Selected: blue-600 surface, white text.
- Default: secondary text on transparent.
- Hover: slate-100 surface, strong text.
- Mobile: full-width horizontal scroll, no wrapping, visible scroll position.
- Use aria-current=page.
- Do not hide unavailable navigation without a replacement unless permissions require it.

### 6.4 AppContainer

Purpose: align every page to one shared horizontal system.

Specification:

- max-width 1280px.
- width 100%.
- centered.
- responsive side padding from the container tokens.

Do not create route-specific page widths unless the content type requires ReadingContainer or a modal.

## 7. Page-level components

### 7.1 PageHero

Use for landing/catalog pages only.

Anatomy:

- Overline.
- One strong headline.
- Supporting paragraph.
- Optional primary/secondary actions.

Specification:

- Vertical padding: 64px mobile/tablet, up to 80px desktop.
- Headline max width: 768px.
- Copy max width: 672px.
- No more than two actions.
- Do not place support content above the primary task on utility routes.

### 7.2 ToolPageHeader

Use at the start of a tool or operational page.

Anatomy:

- Optional context badge.
- Page title.
- One-line purpose.
- Right-aligned action group.
- Bottom divider.

Specification:

- Bottom margin: 32px.
- Bottom padding: 24px.
- Title: heading-2.
- Description: body-sm or body-md.
- Mobile: actions stack below title, left aligned.
- Hide from print unless the title belongs in the printable artifact.

### 7.3 SectionHeading

Use inside cards to divide meaningful groups.

Anatomy:

- Optional step number.
- Short title.
- Optional inline action or count.
- Light bottom divider when followed by fields.

Specification:

- Style: overline or label, not a page heading.
- Space below: 16px.
- Keep to one line where possible.
- Use sentence case for longer titles.

### 7.4 PageActions

Purpose: group the page's main mutation/export controls.

Rules:

- One primary action.
- Secondary actions follow.
- Destructive action is visually separated.
- Mobile: stack or use a 2-column action grid.
- Sticky behavior is allowed only when it improves a long workflow.

## 8. Action components

### 8.1 Button

Anatomy:

- Optional leading icon.
- Label.
- Optional trailing icon.
- Loading indicator replaces or precedes the icon without changing width drastically.

Variants:

| Variant | Use |
| --- | --- |
| brand | Primary forward action: Create, Sign in, Save |
| strong | Output/document action: Print, Export, Generate |
| secondary | Safe supporting action |
| ghost | Low-emphasis inline action |
| danger-subtle | Routine destructive entry point |
| danger-solid | Confirmed destructive action inside a danger context |

Sizes:

| Size | Height | Horizontal padding | Label |
| --- | ---: | ---: | --- |
| sm | 36px | 12px | label |
| md | 40px | 16px | label |
| lg | 48px | 20px | body-sm/700 |

States:

- Default.
- Hover.
- Focus-visible: 2px blue-600 outline with 2px offset.
- Active: subtle press; no lao'][0421₹ yout shift.
 
- Disabled: reduced contrast, no hover, not-allowed cursor.
- Loading: disabled, progress announced, stable label such as “Saving…”.
- Success may temporarily replace the label only if the result is also announced.

Rules:

- Use sentence case.
- Use a verb and object when ambiguity exists.
- No more than one brand button in a decision group.
- Do not use icon-only primary actions.

### 8.2 IconButton
 nb
Use for duplicate, delete row, copy, close, and compact editor actions.

Sizes:

- sm: 32px visual control; desktop-only low-risk action.
- md: 40px standard.
- Mobile hit target: at least 44px.

Variants:

- ghost.
- neutral.
- danger-subtle.

Requirements:

- Accessible name.
- Tooltip when meaning is not immediately universal.
- Focus-visible outline.
- Destructive actions need confirmation when data loss is meaningful.

### 8.3 TextLink

Variants:

- Brand link.
- Muted inline link.
- Back link.
- Destructive link only inside a danger context.

Requirements:

- Underline on hover/focus or another non-color affordance.
- Never style a button as a link when it mutates state.

## 9. Form components

### 9.1 Field

Field is the required wrapper for every form control.

Anatomy:

1. Label.
2. Optional marker or Required text.
3. Control.
4. Helper text.
5. Error text.

Rules:

- Label is persistent and programmatically associated.
- Required state is not communicated only by an asterisk.
- Helper text explains format before an error occurs.
- Error text identifies the problem and, when possible, the fix.
- Long forms also receive an error summary at the start.

States:

| State | Border | Surface | Message |
| --- | --- | --- | --- |
| Default | control | subtle/white | Optional helper |
| Hover | strong | unchanged | unchanged |
| Focus | brand + focus ring | white | unchanged |
| Filled | control | white | unchanged |
| Invalid | danger | danger tint | Error with icon/text |
| Disabled | subtle | muted | Reason when needed |
| Read-only | subtle | subtle | Read-only cue |

### 9.2 TextInput

- Height: 40px standard; 48px Auth.
- Horizontal padding: 12px.
- Radius: radius-md.
- Text: body-sm or body-md.
- Background: color.bg.subtle for editable dense forms; white when surrounded by a subtle card.
- Placeholder: color.text.subtle.
- Selection/focus uses brand blue.

Variants:

- Text.
- Email.
- URL.
- Password.
- Search.
- With prefix/suffix.
- With leading/trailing icon.

Use native input types and autocomplete tokens.

### 9.3 NumberInput and CurrencyInput

- Right-align monetary/numeric values when used in tables.
- Preserve accessible text labels for prefixes/suffixes.
- Do not rely on placeholder currency symbols.
- Show calculated read-only values with a distinct read-only surface.

### 9.4 DateInput

- Prefer native input type=date.
- Use the same Field anatomy.
- Display localized dates in read-only output.

### 9.5 Select

- Height and field treatment match TextInput.
- Use a visible label.
- Use native select for short static lists.
- Use a searchable combobox only when list size justifies it.

### 9.6 Textarea

- Minimum height: 112px.
- Vertical resize allowed.
- Use monospace only for JSON, email source, or structured text.
- Show character guidance when a boundary exists.

### 9.7 SearchInput

- Leading Search icon.
- Clear action appears when populated.
- Search label may be visually hidden only when the surrounding context makes purpose explicit.
- Empty results use EmptyState, not a blank grid.

### 9.8 Checkbox

Anatomy:

- Native checkbox.
- Primary label.
- Optional description.

Rules:

- Entire label row is clickable.
- 16–20px visible box with at least 40px row height.
- Use checked, unchecked, indeterminate, disabled, and focus states.
- Do not use a toggle switch for permissions or long-lived settings unless immediate on/off behavior is clear.

### 9.9 ChoiceChip

Use for payment methods, theme categories, filters, and other compact multiple-choice groups.

Variants:

- Single-select.
- Multi-select.
- Filter.

States:

- Default: subtle surface.
- Selected: brand surface or strong neutral surface with inverse text.
- Disabled.
- Focus-visible.

Use a real radio/checkbox input or equivalent complete keyboard behavior.

### 9.10 FileInput

Use only when the product genuinely accepts a file.

Anatomy:

- Dashed drop/select area.
- File type/size guidance.
- Selected-file row.
- Replace/remove actions.
- Error state.

Never display a checkbox and filename label as if an upload occurred.

## 10. Navigation and selection components

### 10.1 SegmentedControl

Use for two or three mutually exclusive views, especially Edit/Preview on mobile.

Specification:

- Track: color.bg.muted, radius-lg, 4px padding.
- Segment: 40px minimum height.
- Selected: white, strong text, elevation-1.
- Unselected: muted text.
- Equal segment widths.

Behavior:

- Complete ARIA tabs or radiogroup semantics.
- Arrow-key navigation.
- Visible focus.
- Selected panel relationship.

### 10.2 Tabs

Use for same-level content sections such as Profile/Email or Form/Advanced JSON.

Variants:

- Segmented.
- Underline for wider desktop sets.

Do not use tabs as links to unrelated routes.

### 10.3 FilterBar

Anatomy:

- Search.
- Filter chips/selects.
- Result count.
- Clear all.

Responsive:

- Desktop inline.
- Mobile stacks; chips scroll horizontally when needed.

## 11. Surface components

### 11.1 Card

Base specification:

- Surface: white.
- Border: border-default or border-control.
- Radius: radius-xl.
- Padding: 24px standard, 16px compact.
- Shadow: elevation-1 only when needed.

Variants:

| Variant | Use |
| --- | --- |
| base | General content |
| section | Form group |
| interactive | Clickable catalog/list card |
| selected | Current theme/record |
| muted | Secondary information |
| danger | Irreversible settings |
| output | Preview/action frame |

Interactive card requirements:

- Use a link or button, not click handlers on a plain div.
- Whole card receives a focus-visible outline.
- Hover may lift 2px.
- Selected state uses border and background, not shadow alone.

### 11.2 SectionCard

Use for repeated form groups.

Anatomy:

- SectionHeading.
- Optional helper copy.
- Field grid.
- Optional local action row.

Specification:

- 24px padding.
- 24px internal group spacing.
- 16px field gaps.
- One or two form columns at md.
- Avoid nested cards deeper than one level; use muted subpanels instead.

### 11.3 CatalogCard

Use on Platform, Paperwork, Devtools, and related-tool catalogs.

Anatomy:

- Availability/section overline.
- Title.
- Description.
- Bottom-aligned action.
- Optional leading icon.

Specification:

- Minimum height: 208px.
- 24px padding.
- Title begins after intentional breathing room.
- Action stays aligned to the bottom.
- Hover: brand border, elevation-2, 2px lift.

### 11.4 MetricCard

Use for small sets of high-value summaries.

Anatomy:

- Label.
- Main value.
- Optional unit/delta.
- Optional icon.

Rules:

- Two columns mobile; up to four columns from md.
- Use tabular figures.
- Value is the visual priority.
- Do not turn every field into a metric card.

### 11.5 RecordListItem

Use in master/detail layouts.

Anatomy:

- Primary record label.
- Secondary metadata.
- Status badge.
- Optional trailing action.

States:

- Default.
- Hover.
- Selected.
- Focus.
- Disabled.

Requirements:

- Use a button/link for selection.
- Destructive trailing action must not trigger selection.
- Minimum row height: 52px.

### 11.6 EditableRow

Use for repeatable ledger and line-item editing: invoice items, receipt lines, expenses, trips, fuel entries, and contractor payments.

Anatomy:

- Optional drag/reorder handle only when reordering is real.
- Responsive field grid.
- Calculated or read-only value when applicable.
- Trailing duplicate or delete action.
- Optional row-level validation message.

Specification:

- Surface: color.bg.subtle.
- Border: color.border.control.
- Radius: radius-lg.
- Padding: 12px compact or 16px standard.
- Field gap: 12–16px.
- Desktop: align fields in a stable grid with numeric values right aligned.
- Mobile: stack fields in logical reading order; keep delete reachable without overlapping labels.

States:

- Default.
- Focus-within: stronger border without shifting layout.
- Invalid: row summary plus field-level errors.
- Disabled/read-only.
- Newly added: optional motion-enter reveal.

Do not create separate system components for expense rows, mileage rows, and invoice rows. Compose their domain fields inside EditableRow.

### 11.7 MutedPanel

Use within a card for optional/advanced content.

- Surface: color.bg.subtle.
- Border: color.border.control.
- Radius: radius-lg.
- Padding: 16px.
- No additional shadow.

### 11.8 DangerZone

Use for permanent deletion or access-removing actions.

- Clear heading and consequence.
- Danger-tinted border/surface used sparingly.
- Required confirmation input/checkbox where risk justifies it.
- Solid danger button appears only after the user enters the confirmed step.

## 12. Status and feedback

### 12.1 StatusBadge

Variants:

| Variant | Example |
| --- | --- |
| neutral | Draft, Not requested |
| info | Default, Imported |
| success | Active, Enabled, Received |
| warning | Pending, Needs review |
| danger | Suspended, Failed |
| archived | Archived |

Specification:

- 20–24px height.
- 11px minimum label.
- 700–800 weight.
- Radius full or radius-sm depending on density.
- State word always visible.
- Optional 12px icon/dot; color never stands alone.

### 12.2 AlertBanner

Variants:

- Info.
- Success.
- Warning.
- Validation.
- Error.

Anatomy:

- 20px status icon.
- Short title when useful.
- Message.
- Optional action.
- Optional dismiss action.

Specification:

- 16px padding.
- radius-lg or radius-xl.
- Semantic surface/border/text.
- role=status for nonurgent updates.
- role=alert for immediate errors.

### 12.3 FieldError

- Appears directly after the field.
- 12px minimum.
- Describes the fix, not only “Invalid.”
- Referenced by aria-describedby.

### 12.4 ErrorSummary

Use on long forms.

- Appears before the first form card.
- Title: “Fix the highlighted fields.”
- List of linked field errors.
- Focused after failed submission.

### 12.5 SaveStatus

Use for autosave or explicit save state.

States:

- Unsaved changes.
- Saving.
- Saved.
- Save failed.

Specification:

- Compact icon plus text.
- role=status.
- Never show a success state before persistence completes.
- Failure provides retry or points to the primary Save action.

### 12.6 Toast

Use for short, nonblocking mutation confirmation.

Variants:

- Success.
- Info.
- Error with recovery action.

Rules:

- Do not use toast as the only place for a validation error.
- Keep visible long enough to read.
- Pause dismissal on hover/focus.
- Toast region is a live region.

### 12.7 ConfirmDialog

Use when an action overwrites data, revokes access/sessions, archives an object, or deletes a meaningful record.

Anatomy:

- Optional semantic icon.
- Direct title naming the object.
- Consequence copy.
- Optional typed confirmation or checkbox.
- Cancel.
- Confirm.

Specification:

- Overlay uses color.bg.overlay.
- Card uses elevation-overlay and radius-xl.
- Initial focus on the least destructive safe control.
- Focus trapped.
- Escape closes unless work is already committing.
- Return focus to the trigger.
- Confirm label names the action, such as “Archive template.”

### 12.8 EmptyState

Anatomy:

- Optional 24–32px icon.
- Direct title.
- One-sentence explanation.
- One valid next action.
- Optional secondary link.

Variants:

- First use.
- No search results.
- No permission.
- No registered data.
- Feature unavailable.

Do not use decorative illustrations by default.

### 12.9 LoadingState

Paperwork has no complete canonical loading screen today. This is an extended pattern for network-bound Auth and Admin operations, normalized to Paperwork geometry and motion.

Use one of:

- Button-local spinner and label.
- Text status for a tiny section.
- Skeleton preserving a list/card layout.

Rules:

- Keep layout stable.
- Announce loading.
- Avoid full-page spinners when shell and headings can render.
- Never animate when reduced motion is requested.

## 13. Data display and output

### 13.1 DataTable

Use when users must compare the same fields across multiple records.

Anatomy:

- Optional caption.
- Header row.
- Body rows.
- Optional status/action columns.
- Empty row state.

Specification:

- White card shell.
- Header surface: color.bg.subtle.
- Header type: overline or label.
- Cell padding: 12px compact, 16px standard.
- Row separator: color.border.subtle.
- Numeric cells right aligned.
- IDs/code use font.mono.
- Actions remain visible and keyboard accessible.

Responsive:

- Horizontal scroll inside the table card.
- Keep the first identifying column sticky only when data density requires it.
- For action-heavy tables under 640px, convert rows to cards rather than compressing illegibly.

### 13.2 KeyValueList

Use for summaries, inspector metadata, and totals.

- Label left.
- Value right.
- 12–14px text.
- Row separators optional.
- Values use tabular figures or monospace when structured.

### 13.3 SummaryBlock

Use for totals and outcomes.

- Clear subtotal rows.
- Strong final total.
- Optional status.
- Do not use chart decoration when labeled values communicate better.

### 13.4 CodeBlock

- Monospace.
- 12–14px.
- Surface: slate-50 or slate-950 depending on density context; v1 product default remains light.
- Copy action.
- Horizontal scrolling.
- Syntax colors must meet contrast.
- Never place secrets in examples.

### 13.5 PaperPreview

Purpose: trustworthy preview of a printable artifact.

Shell:

- White paper.
- Letter ratio when document type is US Letter.
- Strong but restrained elevation.
- 1px neutral border on screen.
- radius-xl on screen only.
- Sticky within its desktop column.

Behavior:

- Desktop: full preview in a 5-column rail.
- Mobile: dedicated Preview tab.
- Loading preserves paper ratio.
- Error keeps the preview frame and explains recovery.
- Zoom controls are optional and belong outside the paper.
- Product controls never render inside printed output.

Document themes:

- May change colors, fonts, section order, and table treatment inside the paper.
- Never change surrounding product controls.

### 13.6 ActionRail

Use above PaperPreview or beside a long editor.

- White card.
- 16px padding.
- Two-column action grid when two main output actions exist.
- Primary output action uses action.strong.
- Supporting action uses action.secondary.
- Sticky with the preview from lg.
- Not printed.

## 14. Disclosure and optional content

### 14.1 Disclosure

Use for optional contact fields, advanced settings, duplication forms, and help.

Anatomy:

- Button/summary.
- Chevron.
- Clear label.
- Revealed panel.

Behavior:

- aria-expanded.
- Keyboard activation.
- motion-enter fade/translate when motion is allowed.
- State remains understandable without animation.

### 14.2 Accordion

Use for FAQs only when content volume justifies it.

- One heading/button per item.
- Panel labelled by its trigger.
- Do not remove focus outlines.
- Multiple panels may stay open unless the content requires exclusivity.

### 14.3 Tooltip

Use for icon meaning or brief supplemental clarification.

- Never place required instructions only in a tooltip.
- Keyboard and pointer accessible.
- Not used on disabled controls unless a wrapper can expose the reason accessibly.

## 15. Composition patterns

### 15.1 CatalogPage

Use for Platform, Paperwork, and Devtools home.

Order:

1. ProductHeader with AccountNavigation.
2. PageHero.
3. Catalog grid.
4. Optional related/support content.
5. Footer.

Grid:

- 1 column mobile.
- 2 columns sm.
- 3 columns lg.

### 15.2 ToolWorkspace

Use for invoice, receipt, expense, mileage, JSON formatting, and template editing.

Order:

1. Sticky ProductHeader with ToolNav and AccountNavigation.
2. ToolPageHeader.
3. Page-level AlertBanner/SaveStatus.
4. Optional selector/filter card.
5. 12-column workspace.
6. Editor cards in 7 columns.
7. ActionRail and PaperPreview/result in 5 columns.
8. Related/support content.

Mobile:

- SegmentedControl switches Edit/Preview or Input/Output.
- Never render both as narrow side-by-side columns.

### 15.3 MasterDetail

Use for W-9 profiles, user administration, roles, and similar record management.

Desktop:

- Record list: 4 columns.
- Detail editor: 8 columns.
- 32px gap.

Mobile:

- List/Details segmented navigation.
- Selecting a record opens Details.
- Preserve a visible back-to-list action.

### 15.4 MetricsAndLedger

Use for mileage, 1099, audit summaries, and operational data.

Order:

1. ToolPageHeader.
2. 2/4-column MetricCard grid.
3. Filters or entry form.
4. DataTable/list.
5. Output/action rail.

Metrics summarize; they do not replace the source rows.

### 15.5 SettingsGrid

Use for Auth profile and grouped settings.

- Page header and global feedback.
- Responsive two-column Card grid.
- Related settings share a card.
- DangerZone spans the full width or sits last.
- Avoid a left navigation until settings exceed one page meaningfully.

### 15.6 AuthForm

Use for sign in, sign up, recovery, and reset.

Desktop:

- AppContainer.
- Two-column 7/5 or 6/6 layout.
- Trust/value copy on the left.
- One focused white card on the right.

Mobile:

- ProductHeader.
- Shortened value copy.
- Form appears early in the viewport.
- Primary action uses control-lg.

Auth must use Paperwork surfaces and controls. Do not introduce decorative gradients or a separate identity.

### 15.7 AdminCollection

Use for Tools, Templates, Features, Users, Roles, and Audit.

Order:

1. ProductHeader with permission-aware ToolNav.
2. AppContainer.
3. ToolPageHeader.
4. FilterBar or create action where justified.
5. Card grid or DataTable.
6. Empty/loading/error state within the collection boundary.

Permission modes:

- Hidden section when view is absent.
- Read-only controls when view exists but mutation permission does not.
- Full actions only with exact permission.

### 15.8 PrintableArtifact

Use for invoices, receipts, expense reports, mileage logs, vouchers, and ledgers.

Screen mode:

- PaperPreview within product chrome.
- ActionRail outside the document.

Print mode:

- Hide utility bar, product header, navigation, forms, buttons, support content, and action rail.
- White background and black default ink.
- Remove screen border, radius, padding, and shadow from the print root.
- Preserve document theme colors with print-color-adjust.
- US Letter default.
- 1.5cm print margin unless the document template overrides it intentionally.

Use explicit print-root and print-hide attributes/classes. Avoid global element selectors that accidentally hide legitimate document content.

## 16. Responsive behavior

### 16.1 Mobile-first rules

- Single-column default.
- 16px page padding.
- 24px standard card padding may reduce to 16px only on very narrow screens.
- Page actions stack.
- Tool navigation scrolls horizontally.
- Split panes become tabs.
- Record list and detail become separate views.
- Tables scroll or become record cards.
- Sticky previews become normal-flow panels.
- Primary action may become full width.

### 16.2 Tablet

- 24px side padding.
- Two-column field grids.
- Some detail panes may appear from md when content remains readable.
- Keep editor/preview stacked until lg unless the preview can remain at least 360px wide.

### 16.3 Desktop

- 32px side padding.
- 12-column grids.
- Sticky action/preview rail.
- Keep reading lines under roughly 75 characters.
- Do not stretch cards solely to fill empty width.

### 16.4 Overflow

- No horizontal page overflow at 320px.
- Chips and tool nav scroll within their row.
- Code, tables, and long IDs scroll or wrap within their component boundary.
- Long labels may wrap; controls must not clip.

## 17. Accessibility specification

### 17.1 Focus

Canonical focus:

- 2px solid blue-600.
- 2px offset.
- Visible on every interactive control.
- Never removed without an equal or better replacement.

### 17.2 Keyboard

- Logical source/tab order.
- Skip link to the primary task on dense tool pages.
- Tabs use arrow keys.
- Dialogs trap focus and restore it.
- Disclosures use native button/summary behavior.
- Interactive cards are links/buttons.
- All icon actions have accessible names.

### 17.3 Forms

- Explicit labels.
- Autocomplete where applicable.
- Native input types.
- Error summary for long forms.
- aria-describedby for helper/error text.
- Required/read-only/disabled communicated semantically.
- Loading state prevents duplicate submission.

### 17.4 Status

- role=status for save/copy/loading success.
- role=alert for immediate errors.
- Status text remains visible long enough to read.
- Color is never the only status indicator.

### 17.5 Content

- Functional type 11px or larger.
- Body 14px default.
- Avoid long uppercase strings.
- Plain language.
- Link purpose clear out of context.

### 17.6 Motion

- Respect prefers-reduced-motion.
- No required information appears only through animation.
- No looping bounce/pulse for normal status.

## 18. Content and microcopy

### 18.1 Voice

- Lead with the action or outcome.
- Keep titles short.
- Explain consequences concretely.
- Use the user's object name when confirming a mutation.
- Avoid technical implementation language unless the audience needs it.

### 18.2 Labels

Use sentence case:

- “Save profile”
- “Create draft”
- “Revoke other sessions”
- “Set as default”

Do not use vague labels:

- “Submit”
- “Continue” when destination is unclear.
- “OK” for destructive confirmation.

### 18.3 Errors

Structure:

1. What happened.
2. What the user can do.

Examples:

- “Enter a business name before printing.”
- “That slug is already used. Choose a different slug.”
- “The template could not be saved. Your changes are still here; try again.”

Do not expose stack traces, provider details, SQL errors, or security-sensitive reasons.

### 18.4 Empty states

Name the cause:

- “No users matched ‘maya’.”
- “No feature keys are registered in code yet.”
- “No sessions are available.”

Then offer the valid next action.

### 18.5 Privacy and storage copy

- State exactly what is stored and where only when verified.
- Avoid “never uploaded,” “local only,” or “zero tracking” until behavior matches.
- Safe default: “Your draft is saved automatically.”
- For destructive clearing: state which stored draft will be removed.

## 19. Print system

### 19.1 Screen/print separation

Every printable route defines:

- One print root.
- Explicit print-hide chrome.
- Explicit print-only content where needed.
- A screen preview matching the output.

### 19.2 Default page

- US Letter.
- 1.5cm margin.
- White background.
- Exact color adjustment.
- No screen shadow, radius, or outer border.

### 19.3 Print QA

Check:

- No clipped rows or totals.
- No accidental blank first/last page.
- No product navigation or actions.
- Status/meaning remains clear without interactive color cues.
- Signatures and legal notes remain legible.
- Tables repeat headers where supported.

## 20. Figma library structure

Create one library with these pages:

1. Cover and principles.
2. Brand.
3. Foundations.
4. Components.
5. Patterns.
6. Templates.
7. Accessibility and states.
8. Examples.
9. Deprecated values.

### 20.1 Variables

Collections:

- ST / Primitive.
- ST / Semantic.
- ST / Component, only where necessary.

Modes:

- Product / Light.

Do not add a dark mode until it is explicitly designed and implemented. Invoice themes belong in a separate Invoice Theme collection and do not alter Product / Light.

### 20.2 Component naming

Examples:

- ST / BrandLockup.
- ST / Button.
- ST / IconButton.
- ST / Field / Text.
- ST / Field / Select.
- ST / Checkbox.
- ST / ChoiceChip.
- ST / SegmentedControl.
- ST / StatusBadge.
- ST / AlertBanner.
- ST / Card.
- ST / CatalogCard.
- ST / MetricCard.
- ST / RecordListItem.
- ST / EditableRow.
- ST / DataTable.
- ST / ConfirmDialog.
- ST / EmptyState.
- ST / PaperPreview.

Variant property names:

- Variant.
- Size.
- State.
- Icon.
- Density.
- Selected.
- Destructive.

Do not encode color names in component names. Use semantic variant names.

### 20.3 Figma templates

Create:

- Catalog / Desktop, Tablet, Mobile.
- Tool Workspace / Desktop, Tablet, Mobile.
- Master Detail / Desktop, Mobile.
- Settings Grid / Desktop, Mobile.
- Auth Form / Desktop, Mobile.
- Admin Collection / Cards and Table.
- Printable Artifact / Screen and Print.

## 21. Code mapping target

The implementation home is packages/ui.

Recommended incremental structure:

~~~text
packages/ui/
  src/
    index.tsx
    theme.css
~~~

Keep the package this small while the components remain easy to navigate. Split files only when a real maintenance boundary appears. Add a component only when a real consumer is migrated.

### 21.1 shadcn-compatible theme tokens

~~~css
:root {
  --background: /* Slate 50 */;
  --foreground: /* Slate 950 */;
  --card: /* White */;
  --card-foreground: /* Slate 900 */;
  --popover: /* White */;
  --popover-foreground: /* Slate 900 */;
  --primary: /* Blue 600 */;
  --primary-foreground: /* White */;
  --secondary: /* Slate 100 */;
  --secondary-foreground: /* Slate 800 */;
  --muted: /* Slate 100 */;
  --muted-foreground: /* Slate 500 */;
  --accent: /* Blue 50 */;
  --accent-foreground: /* Blue 700 */;
  --destructive: /* Rose 600 */;
  --border: /* Slate 200 */;
  --input: /* Slate 300 */;
  --ring: /* Blue 600 */;
  --radius: 0.75rem;
}
~~~

`theme.css` maps these values through Tailwind v4 `@theme inline`, matching shadcn's semantic contract. Components use utilities such as `bg-background`, `bg-popover`, `text-muted-foreground`, `border-input`, and `ring-ring`. Chart, sidebar, dark-mode, and overlay-specific tokens are added only with a real consumer.

### 21.2 Migration order

1. Add semantic tokens and the real brand asset contract.
2. Normalize Button, IconButton, Field, StatusBadge, Card, and focus behavior.
3. Migrate ProductHeader, ToolNav, and AccountNavigation.
4. Migrate SegmentedControl, AlertBanner, ConfirmDialog, EmptyState, and SaveStatus.
5. Extract ToolWorkspace and MasterDetail only after two migrated consumers prove the APIs.
6. Migrate Auth and Admin onto the same components.
7. Remove duplicated class strings and unsupported utility shades as each surface migrates.

## 22. Deprecated and forbidden values

Retire:

- Nonstandard numeric shades such as slate-150, slate-250, slate-450, slate-550, slate-650, slate-705, slate-805, slate-905.
- Equivalent Zinc, blue, emerald, amber, and rose improvised shades. Map every Zinc role to the canonical Slate scale.
- shadow-3xs.
- z-55.
- active:scale-98 when it does not compile to a supported value.
- 8px and 9px functional text.
- Unlabelled icon-only controls.
- Clickable plain div elements.
- Focus outline removal without replacement.
- Global print selectors that hide semantic elements inside the print artifact.
- Raw hex colors outside token definitions and generated document themes.
- App-specific visual systems for Auth or Admin.

Nearest canonical replacements:

| Deprecated intent | Replacement |
| --- | --- |
| slate/zinc 150 | 100 or 200 based on border/surface role |
| slate/zinc 250 | 200 or 300 based on emphasis |
| text 350/450 | text.subtle or text.muted |
| text 550/650/705 | text.secondary |
| text 805/905 | text.default or text.strong |
| shadow-3xs | elevation-1 |
| z-55 | z-overlay |
| 8/9px functional label | overline at 11px |

## 23. What is not a core component

Keep these domain-specific until a second genuine consumer appears:

- Invoice theme renderer.
- Tax voucher.
- Receipt document theme selector.
- Mileage deduction calculator.
- W-9 email generator.
- 1099 threshold warning.
- Paperwork Pro promotional panel.
- SEO/FAQ content blocks, which are not mounted in the current Paperwork application shell.
- The legacy InvoicePreview implementation; InvoicePreviewRenderer is the current invoice preview source.

They may use system primitives without becoming generic @smarttools/ui components.

## 24. Governance

Add a token when:

- It represents a stable semantic role.
- At least two components need the same decision.
- It removes meaningful inconsistency.

Add a component when:

- The pattern has at least two real consumers or a confirmed cross-app consumer.
- Its API can be specific and understandable.
- Accessibility behavior belongs in one place.

Do not add a component when:

- It wraps one element once.
- It exists only to shorten a class string.
- Its props attempt to support unrelated layouts.
- It is a domain component pretending to be generic.

Review requirements:

- Visual parity with Paperwork intent.
- Keyboard and screen-reader behavior.
- 390px and 1440px examples.
- Default, focus, disabled, loading, error, and success states where applicable.
- No unsupported tokens.
- No invoice-theme leakage.

## 25. Design QA checklist

### Foundations

- Uses only canonical semantic colors.
- Uses Inter for product chrome.
- Uses monospace only for structured data.
- Functional text is at least 11px.
- Spacing follows the 4px scale.
- Radius and elevation match the component role.

### Components

- All interactive states are present.
- Focus is visible.
- Disabled/read-only reason is clear.
- Loading prevents duplicate actions.
- Error and success are announced.
- Icon-only actions have names.

### Layout

- Uses AppContainer.
- No horizontal overflow at 320px.
- Split workspaces become mobile tabs.
- Tables remain readable.
- Sticky regions do not cover content.
- Page actions remain reachable.

### Content

- Labels use sentence case.
- Actions use specific verbs.
- Destructive copy names the consequence.
- Empty states have a valid next action.
- Privacy and export claims match product behavior.

### Print

- Product chrome is absent.
- The artifact fits US Letter.
- No clipped totals or rows.
- Screen and print output match.
- Theme colors print correctly.

### Cross-app consistency

- Auth and Admin look like Paperwork.
- Devtools differs only in density and monospace use.
- The brand lockup is identical.
- Buttons, fields, badges, alerts, tabs, and focus behave identically.
- Generated document themes remain isolated inside PaperPreview.

## 26. Source evidence

Observed pattern map:

| System decision | Paperwork evidence |
| --- | --- |
| Real icon, product lockup, sticky header, and tool navigation | apps/paperwork/src/app/page.tsx; apps/paperwork/src/App.tsx |
| Slate-50 canvas, white surfaces, Inter declaration, motion, and print rules | apps/paperwork/src/index.css; apps/paperwork/src/app/layout.tsx |
| 1280px container and responsive 16/24/32px gutters | apps/paperwork/src/app/page.tsx; tool page components listed below |
| 7/5 editor-preview workspace and mobile Edit/Preview switch | apps/paperwork/src/components/receipt/ReceiptGeneratorPage.tsx; expense/ExpenseReportPage.tsx |
| 4/8 master-detail layout | apps/paperwork/src/components/w9/W9RequestPage.tsx |
| Fields, validation, choice controls, upload, and document actions | apps/paperwork/src/components/InvoiceForm.tsx |
| Metrics, editable rows, tables, and semantic status | mileage/MileageLogPage.tsx; nec1099/NecTrackerPage.tsx |
| Paper frame, dense output type, and printable artifact behavior | apps/paperwork/src/components/InvoicePreviewRenderer.tsx; receipt/ReceiptGeneratorPage.tsx; expense/ExpenseReportPage.tsx |
| Catalog card hierarchy and blue interactive states | apps/paperwork/src/app/page.tsx |

Paths shortened after the first full component path remain under apps/paperwork/src/components/.

Primary sources:

- packages/ui/src/assets/smarttools-icon.png
- apps/paperwork/src/app/layout.tsx
- apps/paperwork/src/app/page.tsx
- apps/paperwork/src/App.tsx
- apps/paperwork/src/index.css
- apps/paperwork/src/components/InvoiceForm.tsx
- apps/paperwork/src/components/TemplateSelector.tsx
- apps/paperwork/src/components/InvoicePreviewRenderer.tsx
- apps/paperwork/src/components/receipt/ReceiptGeneratorPage.tsx
- apps/paperwork/src/components/expense/ExpenseReportPage.tsx
- apps/paperwork/src/components/mileage/MileageLogPage.tsx
- apps/paperwork/src/components/tax/QuarterlyTaxEstimatorPage.tsx
- apps/paperwork/src/components/w9/W9RequestPage.tsx
- apps/paperwork/src/components/nec1099/NecTrackerPage.tsx
- .impeccable.md

Companion product and screen contract:

- [SmartTools E2E Product Design Handoff](../../DESIGN_LLM_HANDOFF.md)
