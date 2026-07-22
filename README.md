# SmartTools

SmartTools is a pnpm monorepo for independently deployable utility projects.

## Applications

- `apps/platform` — SmartTools discovery and project catalog.
- `apps/paperwork` — invoices, receipts, expenses, mileage, tax, W-9, and 1099 tools.
- `apps/devtools` — browser-based developer utilities.
- `apps/media` — private in-browser image and PDF tools (port 3005).
- `apps/admin` — permission-gated tools, templates, flags, users, roles, and audit control plane (port 3003).
- `apps/auth` — authentication and account management with Better Auth (port 3004).

Public tools remain anonymous. `apps/auth` is the only Better Auth runtime and owns the authentication database, secrets, providers, email delivery, and parent-domain cookies. Other applications forward the incoming cookie to that service through the flat `@smarttools/auth/session` export. Admin access additionally requires `admin.enter` and the exact permission for each page or mutation.

## Commands

```bash
pnpm dev
pnpm dev:paperwork
pnpm dev:devtools
pnpm dev:media
pnpm dev:admin
pnpm dev:auth
pnpm dev:all
pnpm db:migrate
pnpm admin:promote verified-admin@example.com
pnpm build
pnpm lint
pnpm test
pnpm test:media
```

## First deployment

1. Configure `apps/auth` with one strong `BETTER_AUTH_SECRET`, the authentication database, exact trusted origins, and the parent `AUTH_COOKIE_DOMAIN`. Consumer apps derive `auth.<parent-domain>` from their own application URL and receive no authentication environment variables; their database and application URL variables remain app-specific.
2. Run `pnpm db:migrate`. This preserves anonymous Paperwork tables, adds Auth/control-plane tables, and seeds system roles, current tool slugs, and invoice templates for an empty catalog.
3. Deploy Auth, then Admin, then Platform, Paperwork, Devtools, and Media.
4. Create and verify the first account, then run `pnpm admin:promote <verified-email>` once.

Google OAuth needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; verification, recovery, and deletion emails need `RESEND_API_KEY` and `AUTH_EMAIL_FROM` in the Auth deployment.
