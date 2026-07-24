# SmartTools

SmartTools is a pnpm monorepo with one Next.js application and shared capability packages.

## Application

- `/` — SmartTools discovery and product catalog.
- `/paperwork/*` — invoices, receipts, expenses, mileage, tax, W-9, and 1099 tools.
- `/devtools/*` — browser-based developer utilities.
- `/media/*` — private in-browser image and PDF tools.
- `/admin/*` — permission-gated tools, templates, flags, users, roles, and audit control plane.
- `/auth/*` — authentication and account management with Better Auth.

All routes are served by the root Next.js application on port 3000. Public tools remain anonymous. Authentication reads sessions in-process through `@smarttools/auth`; Admin additionally requires `admin.enter` and the exact permission for each page or mutation.

## Commands

```bash
pnpm dev
pnpm db:migrate
pnpm admin:promote verified-admin@example.com
pnpm build
pnpm lint
pnpm test
pnpm test:media
```

## First deployment

1. Copy `.env.example` to `.env.local`, then configure `APP_URL`, one strong `BETTER_AUTH_SECRET`, the database, and any optional integrations you use.
2. Run `pnpm db:migrate`. This preserves anonymous Paperwork tables, adds Auth/control-plane tables, and seeds system roles, current tool slugs, and invoice templates for an empty catalog.
3. Deploy the repository root application.
4. Create and verify the first account, then run `pnpm admin:promote <verified-email>` once.

Google OAuth needs `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; verification, recovery, and deletion emails need `RESEND_API_KEY` and `AUTH_EMAIL_FROM`.
