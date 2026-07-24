# SmartTools E2E Product Design Handoff

Status: implementation-grounded brief for the current working tree on 2026-07-18.

Audience: a design LLM creating the complete responsive product experience.

## Non-negotiable visual rule

Paperwork is the only visual and layout source of truth.

- Use Auth and Admin code only to understand behavior, fields, permissions, actions, and states.
- Do not copy the current Auth, Admin, Platform, or Devtools styling. Those surfaces were exploratory/vibecoded.
- Rebuild every surface with Paperwork's visual language: Inter, blue/slate neutrals, white cards, subtle borders, restrained shadows, rounded controls, uppercase micro-labels, tool-first layouts, clear split panes, and calm professional copy.
- Reuse the canonical SmartTools icon through `BrandLockup` from `@smarttools/ui`; its asset lives at `packages/ui/src/assets/smarttools-icon.png`.
- Keep one brand system. Each route scope may vary density, but it must still feel like Paperwork.
- Do not invent a new logo, palette, type system, illustration style, or decorative motif.

## Prompt to the design LLM

Design a complete responsive SmartTools product experience using this document as the product contract. First create the shared Paperwork-based design system, then produce the Auth and Admin flows in full. Also include enough home, Paperwork, and Devtools context to make cross-scope navigation and return journeys coherent.

Do not silently add product scope. Clearly label any proposed improvement that is not implemented today.

## 1. What SmartTools is

SmartTools is a collection of focused browser utilities for people who want to finish a task quickly without adopting a large software suite.

Current products:

- Paperwork: invoices, receipts, expense reports, mileage logs, quarterly tax estimates, W-9 onboarding, and 1099 payment tracking.
- Devtools: privacy-oriented developer utilities; currently only a JSON formatter and validator.
- Platform: a lightweight project chooser for Paperwork and Devtools.
- Auth: one optional account and security center shared across all route scopes.
- Admin: a permission-gated control plane for tools, invoice templates, feature flags, users, roles, and audit history.

Primary audiences:

- Freelancers, contractors, solo operators, and small businesses.
- Developers and technical users who need a quick browser utility.
- Internal operators managing SmartTools availability and access.

Brand qualities:

- Fast: short paths and immediate tools.
- Trustworthy: visible validation, predictable actions, honest limitations.
- Private: avoid unnecessary collection and explain storage near the relevant action.
- Professional: calm, clear, useful, and never gimmicky.

Public tools remain usable without an account. Authentication is optional unless the user enters Admin or manages their account.

## 2. Product architecture

~~~mermaid
flowchart LR
  Visitor[Anonymous visitor] --> Home[SmartTools catalog /]
  Home --> Paperwork[Paperwork /paperwork]
  Home --> Devtools[Devtools /devtools]
  Paperwork --> Auth[Shared Auth and account center]
  Devtools --> Auth
  Home --> Auth
  Auth -->|same-origin session| Home
  Auth -->|same-origin session| Paperwork
  Auth -->|same-origin session| Devtools
  Auth -->|admin.enter plus exact permission| Admin[Admin control plane]
  Admin -->|tool names, slugs, order and availability| Paperwork
  Admin -->|tool names, slugs, order and availability| Devtools
  Admin -->|published and default invoice template| Invoice[Invoice generator]
~~~

The root Next.js application owns the Better Auth server runtime at `/api/auth/*`. Home, Paperwork, Devtools, Auth, and Admin read the same-origin session in-process through `@smarttools/auth`; authentication secrets and provider configuration remain server-only.

Route entry points in local development:

| Scope | Entry | Purpose |
| --- | --- | --- |
| Home | `http://localhost:3000/` | Choose Paperwork or Devtools |
| Paperwork | `http://localhost:3000/paperwork` | Browse and use seven public paperwork tools |
| Devtools | `http://localhost:3000/devtools` | Browse and use developer tools |
| Admin | `http://localhost:3000/admin/tools` | Operate tools, templates, features, users, roles, and audit |
| Auth | `http://localhost:3000/auth` | Sign in, create an account, recover access, and manage the account |

## 3. Paperwork visual source of truth

### 3.1 Brand and shell

- Canvas: slate-50.
- Primary surfaces: white.
- Primary ink: slate-950 or slate-900.
- Secondary text: slate-600; tertiary/meta text: slate-400 or slate-500.
- Brand/action blue: blue-600; blue-50 and blue-100 for selected or informational surfaces.
- Borders: slate-200 or zinc-200.
- Destructive: rose-600 text, rose-50 surface, rose-100/200 border.
- Success: emerald-700 text, emerald-50 surface, emerald-200 border.
- Warning: amber/orange text on amber/orange-50 with a light border.
- Typography: Inter for all product chrome. Monospace only for JSON, IDs, slugs, tokens, and raw metadata.
- Brand lockup: 32px rounded SmartTools icon, product name in blue-600, small “by SmartTools” label in slate-400.
- Main width: max-w-7xl with 16px mobile, 24px tablet, and 32px desktop side padding.
- Header height: at least 64px; sticky where the workflow benefits from persistent navigation.

### 3.2 Type hierarchy

- Product or landing headline: 36–60px, black/extrabold, tight tracking.
- Tool page heading: 24–30px, black, tight tracking; uppercase is allowed for operational tools.
- Card heading: 18–20px, extra-bold.
- Section heading: 12–14px, black, uppercase, wide tracking, often separated by a light bottom border.
- Field label: 10–12px, black/bold, uppercase where density requires it.
- Body: 14–16px with generous line height.
- Metadata and badges: 8–12px, bold, uppercase, tracked.

### 3.3 Components

- Cards: white, 1px slate/zinc border, 16px radius, subtle shadow, 16–24px padding.
- Primary button: blue-600 or slate-900, white text, 8–12px radius, bold label.
- Secondary button: slate-100, slate-800 text, slate-200 border.
- Destructive button: rose-50 surface and rose-600 text for routine destructive actions; use solid red only inside a confirmed danger step.
- Inputs: light zinc/slate background, 1px border, 8px radius, persistent label, clear focus ring, inline error below.
- Badges: compact rounded pills with state color and text; never rely on color alone.
- Tabs: light slate/zinc track with a white selected segment and small shadow.
- Tables: use Paperwork's white card shell, compact rows, strong header labels, horizontal overflow on small screens.
- Modals: dark translucent overlay, white 16px-radius card, strong title, short consequence copy, safe action first, destructive action second.
- Empty states: centered inside the normal card shell with a useful next action.
- Feedback: inline banner for page-level issues, field-level validation near the field, toast/status for completed mutations.

### 3.4 Layout patterns to reuse

Use the existing Paperwork patterns as the building blocks for every app:

1. Landing/catalog: editorial hero followed by a 1/2/3-column grid of large white cards.
2. Tool editor: 7/5 desktop split between form/editor and sticky preview/actions.
3. Master/detail: 4/8 desktop split between selectable records and the selected record editor.
4. Form sections: stacked white cards with numbered uppercase section headers.
5. Mobile workflow: segmented Edit/Preview or List/Details tabs instead of squeezing two panes.
6. Dense operational page: responsive cards first; use tables only where comparison across rows matters.
7. Sticky actions: keep the primary save/export action visible without hiding content.

### 3.5 Responsive contract

Design at:

- 1440px desktop.
- 1024px tablet.
- 390px mobile.
- Confirm no horizontal page overflow at 320px.

Behavior:

- Large split panes stack or become mobile tabs.
- Navigation becomes horizontally scrollable chips or a compact menu; never disappear without replacement.
- Page-heading actions wrap below the title.
- Tables scroll inside their card.
- Primary actions become full width when needed.
- Tap targets are at least 44px; use 48px for primary Auth actions.
- Respect reduced motion.

### 3.6 Accessibility contract

- WCAG 2.2 AA contrast.
- Visible focus on every interactive control.
- Persistent form labels; placeholders are examples, not labels.
- Semantic buttons, links, tabs, tables, headings, alerts, and status regions.
- Keyboard-operable tabs with arrow-key behavior.
- Loading and mutation states announced through live regions.
- Error summary plus field-level errors for long forms.
- Destructive confirmations name the object and consequence.
- Never communicate Enabled, Suspended, Published, Archived, or Error by color alone.

## 4. Global navigation and cross-scope behavior

### Public route scopes

- Show the Paperwork-style brand lockup.
- Show the current product name and “by SmartTools.”
- Signed out: Account action says “Sign in.”
- Signed in: show the user's name and link to the Auth profile.
- Preserve the originating path as `returnTo` through sign-in, sign-up verification, and password recovery.
- Public tools must never look locked behind sign-in.

### Auth

- Header links back to Home, Paperwork, and Devtools.
- On mobile, replace desktop links with a compact project menu; do not hide navigation entirely.

### Admin

- Brand: “SmartTools Admin” using the same Paperwork lockup.
- Navigation order: Tools, Templates, Features, Users, Roles, Audit.
- There is no dashboard. Admin root redirects to Tools.
- Account action links to the Auth profile.
- Hide sections the user cannot view.
- If the user can view a section but cannot mutate it, render an intentional read-only page instead of showing controls that fail after click.

## 5. End-to-end journeys to prototype

### Journey A: anonymous utility use

Home → Paperwork or Devtools → choose a tool → enter data → see live result → print/copy/export → optionally sign in.

### Journey B: account creation

Originating path → Auth Create account → submit name/email/password → verification-required state → verification email → return to the originating path as signed in.

### Journey C: returning sign-in

Originating path → Auth Sign in → email/password or Google → safe return to the originating path.

Unverified email must lead to a verification panel with the submitted email and a resend action.

### Journey D: password recovery

Sign in → Forgot password → neutral “if the account exists” sent state → recovery email → Reset password → sessions-revoked success → return to sign in while preserving returnTo.

### Journey E: account security

Profile → update name/image URL → manage linked identities → change password → inspect/revoke sessions → sign out or request account deletion.

### Journey F: Admin access

- Signed out: Admin deep link → Auth → Admin.
- Signed in without admin.enter: Access denied.
- Has admin.enter but lacks a section view permission: section is absent from navigation; direct URL is denied.
- Has section view but lacks mutation permission: read-only page.
- Has exact mutation permission: action is available and produces pending, success, validation, and failure states.

### Journey G: managed tool lifecycle

Admin Tools → configure name/description/slug/order → enable → public catalog and direct route become available → disable or archive → public direct route becomes unavailable.

### Journey H: invoice template lifecycle

Admin Templates → create/import draft → edit configuration → preview → publish → set default → Paperwork Invoice Generator uses it.

### Journey I: connected Paperwork workflow

- Invoice draft → import into Receipt.
- Mileage log → import into Expense report.
- Expense and Mileage summaries → import into Tax estimator.
- W-9 contractor profile → select in 1099 tracker.

## 6. Route and screen inventory

### Public context

| Route | Screen |
| --- | --- |
| `/` | Project chooser |
| `/paperwork` | Paperwork tool catalog |
| `/paperwork/invoice-generator` | Invoice builder and live preview |
| `/paperwork/receipt-generator` | Receipt builder and preview |
| `/paperwork/expense-report` | Expense and reimbursement report |
| `/paperwork/mileage-log` | Mileage and fuel tracker |
| `/paperwork/quarterly-tax-estimator` | Live tax estimate and quarterly vouchers |
| `/paperwork/w9-request` | Contractor onboarding and request-email copy |
| `/paperwork/1099-nec-tracker` | Contractor payment threshold ledger |
| `/devtools` | Developer tool catalog |
| `/devtools/json-formatter` | JSON input, output, validation, and inspector |

### Auth

| Route | Screen |
| --- | --- |
| `/auth` | Sign in, Create account, and Forgot password modes in one screen |
| `/auth/reset-password` | Invalid link, reset form, error, pending, and success |
| `/auth/profile` | Profile, identities, password, sessions, sign out, and deletion |

Do not create separate sign-in, sign-up, forgot-password, verification, settings, or sessions routes unless explicitly labeled as a proposed architecture change.

### Admin

| Route | Screen |
| --- | --- |
| `/admin` | Redirect only; no dashboard |
| `/admin/tools` | Managed tool configuration |
| `/admin/templates` | Create/import and template lifecycle list |
| `/admin/templates/[id]` | Template editor |
| `/admin/templates/[id]/preview` | Invoice template preview |
| `/admin/features` | Feature flags; empty in the current product |
| `/admin/users?q=` | User search, roles, suspension/reactivation |
| `/admin/roles` | Create and list roles |
| `/admin/roles/[id]` | Custom role permission editor |
| `/admin/audit` | Latest privileged mutations |
| `/admin/denied` | Access denied |

## 7. Public screen context

The public screens establish the visual language and explain the journeys. Auth and Admin should look like extensions of these patterns.

### Platform project chooser

- Paperwork-style header and account action.
- Eyebrow, large headline, concise explanation.
- Two large project cards: Paperwork and Devtools.
- Each card: availability label, project name, purpose, Open project action.

### Paperwork catalog

- Existing Paperwork brand header.
- Eyebrow: Small business toolkit.
- Headline: Choose the paperwork tool for the job.
- No-account message.
- Seven available-tool cards using the canonical Paperwork catalog card.

### Paperwork tool shell

- Sticky brand header.
- Horizontally scrollable tool chips with the current tool in blue.
- Optional draft status and Clear action.
- max-w-7xl content.
- 7/5 form-preview split on desktop; mobile tabs.
- Footer with related tools.

### Devtools catalog and JSON formatter

Restyle both to Paperwork rather than preserving their current experimental styling.

Catalog:

- Same hero/card pattern as Paperwork, with denser copy.
- One current card: JSON Formatter and Validator.

JSON formatter:

- Paperwork header and account action.
- Toolbar: Format, Minify, Validate, indentation, Copy, Clear.
- Desktop split: input, output, inspector.
- Mobile: Input, Output, Inspector tabs.
- States: checking, valid, waiting/empty, invalid syntax, over 2,000,000 characters, inspector open/closed, copy success/failure.
- Keep Inter for chrome and JetBrains Mono only in editors/output.
- Docs, API, Registry, Cmd+K command palette, and file upload are not working product features; do not present them as active.

## 8. Auth screen specification

All Auth screens must use Paperwork's brand header, slate-50 canvas, max-w-7xl spacing, white rounded-2xl cards, blue/slate actions, and field treatment.

### AUTH-01: Auth landing — Sign in

Desktop layout:

- 7/5 or balanced two-column layout.
- Left: eyebrow, “One account, every SmartTool,” supporting copy, and three compact benefit rows.
- Right: white Auth card.
- Mobile: marketing content above the card; keep the form first within the initial viewport where possible.

Header:

- SmartTools lockup.
- Project links: Platform, Paperwork, Devtools.

Card:

- Segmented tabs: Sign in / Create account.
- Continue with Google.
- Divider.
- Email address.
- Password.
- Forgot password link.
- Sign in.
- Privacy note: authentication cookies are HttpOnly and not stored in browser storage.

States to design:

- Default.
- Missing-field error.
- Generic credentials/provider error.
- Rate limit.
- Unverified email with visible email and Resend verification email.
- Pending with disabled controls and “Please wait…”.
- Success transition/redirect.

Do not add remember me, magic link, passkeys, MFA, or mandatory sign-in.

### AUTH-02: Create account mode

- Continue with Google.
- Name, maximum 100 characters.
- Email.
- Password, 12–128 characters.
- Confirm password.
- Create account.

States:

- Missing/oversized name.
- Password-length guidance.
- Password mismatch.
- Pending.
- Success/verification required: “Check your inbox to verify your email before signing in.”
- Resend verification action.

New users receive the system User role, which grants no Admin access.

### AUTH-03: Forgot password mode

- Replace the tabs with a focused recovery card.
- Heading: Reset your password.
- Explain that the time-limited link is sent only if the account exists.
- Email field.
- Send reset link.
- Back to sign in.

States:

- Missing email.
- Sending.
- Neutral success: “If that account exists, a password-reset link is on its way.”

Do not reveal whether an email exists.

### AUTH-04: Reset password

Invalid/missing link state:

- Invalid link badge/eyebrow.
- “Request a new reset email.”
- Explanation and Return to account recovery action.

Form state:

- New password.
- Confirm new password.
- 12–128 character guidance.
- Warning that reset revokes existing sessions.
- Update password / Updating.
- Validation and generic server error.

Success:

- Password updated.
- Explain that other sessions were revoked.
- Continue to sign in, preserving returnTo.

### AUTH-05: Account center

Page header:

- SmartTools brand back to Platform.
- Verified account or Verification pending badge.
- “Manage your SmartTools account.”
- Email.
- Sign out.
- Global feedback banner above the content cards.

Use a responsive two-column Paperwork card grid.

Card 01 — Profile:

- Name.
- Image URL.
- Save profile.
- Validation for required name, 100-character limit, valid HTTP/HTTPS URL, and maximum URL length.
- No file upload, cropper, email change, or billing section.

Card 02 — Sign-in identities:

- Loading state.
- Provider rows: Email and password, Google, or provider name.
- Connected date.
- Link Google.
- Unlink Google only when another identity remains.
- Explain when Google is the only identity.

Card 03 — Password:

- Credential account: current password, new password, confirmation, Change password.
- Successful change revokes other sessions.
- Google-only account: intentional empty state explaining that the account signs in through Google.

Card 04 — Active sessions:

- Loading.
- Device/user-agent.
- IP or IP unavailable.
- Session start date.
- Current badge and “This device.”
- Revoke on other sessions.
- Revoke others when more than one exists.

Card 05 — Delete account:

- Permanent-deletion warning.
- Type the account email to continue.
- Irreversible-action checkbox.
- Email deletion confirmation.
- Disabled for an unverified email.
- Pending and confirmation-email-sent states.
- Explain the final-active-Admin restriction when relevant instead of allowing a generic failure.

### AUTH-06: Auth emails

Create Paperwork-branded responsive email frames for:

1. Verify email.
2. Reset password.
3. Confirm account deletion.

Each email:

- SmartTools icon and wordmark.
- Direct heading and one paragraph.
- One primary blue CTA.
- Expiry/ignore-if-not-requested note.
- Plain-text-safe content structure.
- No marketing carousel or unrelated links.

### Proposed Auth improvements, clearly label as proposed

- Password reveal control.
- Pending-verification resend from the profile.
- Dedicated verification success/failure screen.
- Suspended-account explanation.
- Account-deletion completion screen.
- Confirmation before unlinking an identity or revoking all other sessions.

Do not add these as if they already exist.

## 9. Admin foundation and permission model

Use Paperwork's sticky header, tool-chip navigation, max-w-7xl content, white cards, split-pane layouts, tabs, status pills, and confirmation modal. Do not use the current Admin CSS as a visual reference.

### Permission catalog

| Area | Actions |
| --- | --- |
| Admin | enter |
| Tools | view, edit, toggle, archive |
| Templates | view, create, edit, publish, archive |
| Features | view, edit, toggle |
| Users | view, suspend, assignRoles |
| Roles | view, create, edit, delete |
| Audit | view |

Permission behavior:

- Grants are positive and combine across roles.
- Missing grants deny.
- User is a protected system role with no Admin access.
- Admin is a protected system role with every permission.
- System roles cannot be edited or deleted.
- A custom role assigned to users cannot be deleted.
- The last active Admin cannot be suspended, demoted, or deleted.

Design three Admin access modes:

1. No admin.enter: full Access denied screen.
2. Can enter but cannot view a section: hide the nav item; direct URL shows denied.
3. Can view but cannot mutate: intentional read-only page with hidden or disabled controls and a reason.

## 10. Admin screen specification

### ADMIN-00: Access denied

- Paperwork-style centered card.
- “Admin access denied.”
- Signed-in identity.
- Plain explanation.
- Return to account.
- Switch account or sign out.
- If known, state the missing section permission without exposing internal security detail.

### ADMIN-01: Tools

Page header:

- Tools.
- Explain that configuration controls public discovery and direct-route availability.
- Optional app filter chips: All, Paperwork, Devtools.
- Search may be designed as a proposed enhancement.

One card per registered tool:

- App badge.
- Display name.
- Stable tool ID in monospace.
- Editable name.
- Description.
- Slug.
- Numeric order.
- Status badge: Setup required, Enabled, Disabled, or Archived.
- Save configuration.
- Enable/Disable.
- Archive/Restore.

Rules:

- Slug is editable only until first saved.
- Enable is unavailable until a slug exists.
- Archived tools are disabled.
- Restore does not automatically enable.
- Disabled/archived public routes must not appear available.

Current tools:

- Invoice Generator.
- Receipt Generator.
- Expense Report Generator.
- Mileage Log Tracker.
- Quarterly Tax Estimator.
- W-9 Request Template.
- 1099-NEC Tracker.
- JSON Formatter and Validator.

Frames:

- Mixed-status list.
- Read-only viewer.
- Save pending/success/error.
- Disable confirmation.
- Archive confirmation.
- Load error.

### ADMIN-02: Invoice templates

Header:

- Invoice templates.
- Create template.
- Import JSON.
- Optional filters may be proposed: status, category, layout.

Template list card:

- Name.
- Draft, Published, or Archived badge.
- Default badge.
- Description.
- Slug.
- Version.
- Updated time.
- Edit.
- Preview.
- Export.
- Duplicate.
- Publish.
- Set default.
- Archive.

Current seed templates:

- Classic Professional — default.
- Modern Clean.
- Compact Service Invoice.
- Bold Agency.
- Minimal Freelancer.
- Detailed Contractor.

Lifecycle rules:

- Create/import/duplicate produces a draft.
- Publish changes draft or archived to published.
- First published template becomes default when no default exists.
- A published default cannot be archived until another published template is default.
- Edit increments the version and preserves lifecycle state.

Create form:

- Name.
- Unique lowercase-hyphen slug.
- Description.
- Category: classic, modern, simple, professional, creative, service.
- Layout: classic, modern, compact, bold, minimal, service.
- Create draft.

Import:

- JSON textarea/file-like paste area.
- Import as draft.
- Invalid JSON/schema, duplicate slug, pending, and success states.

Use a Paperwork modal or side panel for Create and Import so the list stays primary. Mark this as a proposed presentation change; the current page renders both forms inline.

### ADMIN-03: Template editor

This is the largest Admin design improvement.

Primary Paperwork layout:

- 7/5 split.
- Left: grouped configuration cards.
- Right: sticky live Letter-page invoice preview and action card.
- Mobile: Edit / Preview tabs.

Top actions:

- Back to templates.
- Status and version.
- Save draft/Save changes.
- Preview.
- Publish when permitted.
- More: Export, Duplicate, Archive.
- Unsaved-change indicator.

Configuration groups:

1. Basics: name, slug, description, category, layout family.
2. Theme: primary, accent, text, muted text, border, background, surface colors.
3. Typography: font, heading size, body size, line height.
4. Page: size, margins, border.
5. Header: style, logo position/size, invoice title text, status badge.
6. Business and client blocks.
7. Invoice metadata.
8. Line-item table.
9. Totals.
10. Payment instructions.
11. Notes and terms.
12. Footer and watermark.
13. Section order and labels.
14. Visibility.
15. PDF settings.

Required validation:

- At least one business address block.
- At least one client address block.
- Line items visible.
- Totals visible.
- Unique valid slug and complete schema.

Retain an Advanced JSON tab for parity with the current implementation, but make grouped controls the primary design. Label the grouped editor as a proposed implementation improvement.

Frames:

- Clean state.
- Unsaved changes.
- Validation summary with linked field errors.
- Saving.
- Saved.
- Conflict/server error.
- Preview mobile and desktop.

### ADMIN-04: Template preview

- Paperwork header and back link.
- Template name, status, default badge, and version.
- Shared sample invoice preview.
- Zoom controls.
- Letter/mobile viewport switch where useful.
- Edit template.
- Publish/Set default when permitted.
- Print for visual QA.

Zoom, viewport controls, and direct lifecycle actions are proposed; the current screen only renders the name and preview.

### ADMIN-05: Feature flags

Actual current state:

- No feature keys are registered.
- Design the real empty state first: “No feature keys are registered in code yet.”
- Explain that flags appear only when registered by engineering.

Also create one clearly labeled populated reference frame for the future card pattern:

- App and key in monospace.
- Name.
- Description.
- Enabled/Disabled.
- Save metadata.
- Enable/Disable.

Do not invent targeting, percentage rollout, environments, dependencies, or experimentation analytics.

### ADMIN-06: Users

Header:

- Users.
- Search by partial name or email.
- Optional status and role filters may be labeled proposed.

User card or responsive row:

- Name.
- Email.
- User ID in monospace.
- Active or Suspended.
- Verified status.
- Assigned roles.
- Current-user indicator.
- Save roles.
- Suspend and revoke sessions / Reactivate.

Role assignment:

- Checklist with role name and description.
- User system role is checked and disabled.

Rules:

- Suspension revokes every active session.
- The final active Admin cannot be suspended or demoted.
- Admin does not edit credentials or delete users; those remain in Auth.

Frames:

- Results.
- No users matched.
- Read-only viewer.
- Role-change pending/success/error.
- Suspend confirmation naming session revocation.
- Final-Admin action disabled with reason.

### ADMIN-07: Roles

Role list:

- Create custom role action.
- Role cards with name, description, ID, assigned-user count.
- Protected badge for User and Admin system roles.
- Edit permissions only for custom roles.

Create role:

- Name.
- Description.
- Create with no access.
- Name uniqueness error.

Current system roles:

- User: default account role, no Admin access.
- Admin: every permission.

Provide a read-only detail view for system roles as a proposed improvement; do not allow editing.

### ADMIN-08: Custom role editor

- Back to roles.
- Role name and description.
- Assigned-user count.
- Explain that grants combine across all assigned roles.
- Permission groups generated from the catalog.
- Group-level Select all/Clear may be proposed.
- Save role.
- Danger zone: Delete role.

Warnings:

- Mutation grants may rely on admin.enter and matching view grants from another role; explain combined access without auto-changing permissions.
- Assigned custom roles cannot be deleted.
- System roles never enter this editor.
- Warn if the current administrator may remove their own future access.

Frames:

- Editable role.
- Read-only role viewer.
- Save pending/success/error.
- Delete disabled because assigned.
- Delete confirmation when unassigned.

### ADMIN-09: Audit history

Use a Paperwork-style responsive table card.

Columns:

- Friendly timestamp.
- Actor name/email with raw ID available as secondary text.
- Human-readable action.
- Target type and target ID.
- Summary of changed fields.
- Open details.

Details drawer/modal:

- Raw action.
- Actor ID.
- Target ID.
- Redacted metadata in formatted monospace JSON.

Data contract:

- Newest first.
- Latest 200 events only.
- Sensitive metadata keys related to auth, cookie, password, secret, or token are redacted.
- Empty state: “No privileged mutations recorded.”

Filters, date range, export, pagination, and structured diffs are proposed; the current product only returns the latest 200 raw events.

## 11. Shared state checklist

Every interactive Auth/Admin page must include the states relevant to it:

| State | Required treatment |
| --- | --- |
| Initial loading | Skeleton or compact Paperwork loading card; preserve layout |
| Empty | Explain why it is empty and give the valid next action |
| Validation | Error summary plus field-level messages |
| Pending | Disable duplicate submission and change the action label |
| Success | Toast/status plus updated visible data |
| Recoverable error | Inline banner with retry and preserved user input |
| Permission denied | Hide unavailable navigation; explain read-only/denied state |
| Destructive action | Confirmation naming object and consequence |
| Unsaved changes | Visible dirty state and leave-page warning |
| Missing record | Paperwork-branded 404 with a safe list-page return |

Do not design generic decorative dashboards or charts just to fill space.

## 12. Representative design fixtures

Use realistic data so every status is visible.

### Users

- Maya Chen — maya@smarttools.test — Active, Verified — Admin — current user.
- Noah Williams — noah@smarttools.test — Active, Verified — Tool Viewer.
- Priya Shah — priya@smarttools.test — Suspended, Verified — User.
- Elena Garcia — elena@smarttools.test — Active, Verification pending — Template Manager.

### Roles

- User — protected — no Admin access.
- Admin — protected — all permissions.
- Tool Viewer — admin.enter + tools.view.
- Template Manager — admin.enter + templates.view/create/edit/publish/archive.

### Tool statuses

- Invoice Generator — Enabled.
- Receipt Generator — Enabled.
- Expense Report Generator — Enabled.
- Mileage Log Tracker — Disabled.
- Quarterly Tax Estimator — Enabled.
- W-9 Request Template — Setup required.
- 1099-NEC Tracker — Archived.
- JSON Formatter and Validator — Enabled.

These mixed states are design fixtures, not a claim about current production data.

### Audit examples

- tool.disable — JSON Formatter and Validator.
- template.publish — Modern Clean.
- template.set_default — Classic Professional.
- user.suspend — Priya Shah.
- role.update — Template Manager.

## 13. Product truth and non-goals

Do not make the design imply functionality that does not exist:

- Public Paperwork tools do not require sign-in.
- There is no user dashboard, saved-document library, team workspace, billing page, or subscription management.
- Paperwork Pro is only an aspirational wait-list; do not show purchased Pro functionality.
- “Download PDF” currently opens browser print; there is no direct PDF-generation service.
- W-9 creates and stores profiles/statuses and copies an email; it does not send email, collect signatures, upload forms, or verify tax records.
- 1099 tracks payments and thresholds; it does not file a tax form.
- Feature flags currently have no registered keys.
- Admin has no dashboard.
- Devtools currently ships only JSON Formatter.
- Devtools Docs, API, Registry, command palette, and file picker are not active features.
- No dark mode is implemented.
- Auth does not have MFA, passkeys, magic links, billing, or organization management.
- Admin cannot edit user credentials or delete user accounts.
- Avoid “local only” or “never uploaded” claims until product decides how anonymous server synchronization should be described. Safe interim copy: “Your draft is saved automatically.”

## 14. Deliverables expected from the design LLM

Produce:

1. A small Paperwork-derived design system page: colors, type, spacing, buttons, inputs, badges, cards, tabs, banners, tables, modals, empty states, and responsive behavior.
2. A sitemap and the nine end-to-end journeys above.
3. All Auth screens and state variants.
4. All Admin screens and the three permission modes.
5. Home, Paperwork, and Devtools context screens sufficient to demonstrate cross-scope navigation.
6. Desktop, tablet, and mobile frames for every primary route.
7. Clickable prototypes for account creation, recovery, account security, Admin access, tool lifecycle, and template lifecycle.
8. An annotation layer distinguishing:
   - Implemented behavior.
   - Visual redesign only.
   - Proposed behavior that requires engineering.
9. A final consistency pass proving that Auth and Admin look like Paperwork, not like separate products.

Start with the shared Paperwork system, then Auth, then Admin. Do not start with a standalone Admin aesthetic.

## 15. Repository ground truth

Primary visual references:

- .impeccable.md
- app/paperwork/page.tsx
- app/paperwork/components/App.tsx
- app/paperwork/components/InvoiceForm.tsx
- app/paperwork/components/receipt/ReceiptGeneratorPage.tsx
- app/paperwork/components/w9/W9RequestPage.tsx
- app/globals.css
- packages/ui/src/assets/smarttools-icon.png

Behavior references:

- README.md
- app/auth
- app/api/auth
- packages/auth/src
- app/admin
- lib/admin
- packages/authorization/src/index.ts
- packages/control-plane/src
- packages/database/src/schema.ts
- packages/tool-catalog/src/index.ts
- packages/invoice-templates/src
- tests/e2e

Visual QA note:

- design-qa.md documents the current Devtools experiment, but Devtools is not a visual source of truth. Its functional layout can be reused only after translating it into Paperwork's system.

Working-tree note:

- The repository uses one root Next.js runtime with path-scoped products and workspace packages. This handoff describes the current filesystem.
