# Repository Guidelines

## Scope and Working Rules

This file is the repository-wide baseline. Read the nearest `AGENTS.md` before editing. Add a nested `AGENTS.md` only when an app or package has genuinely different commands or constraints, and put only those differences in it.

Before changing code:

1. Inspect `git status --short` and preserve unrelated work.
2. Search the target app and `packages/*` for an existing component, helper, type, schema, or pattern.
3. Trace the callers and consumers of code being changed.
4. Make the smallest change that solves the current task; do not add scaffolding for possible future work.

Do not reorganize unrelated existing files during feature or bug work. New code must follow the structure below. When moving code, update every import, remove the old file, and avoid compatibility re-exports unless the old path is a real public API.

## Monorepo Boundaries

This is a pnpm monorepo of independently deployable Next.js applications:

- `apps/platform` — SmartTools catalog and discovery site (port 3000).
- `apps/paperwork` — invoice, receipt, tax, and contractor tools (port 3001).
- `apps/devtools` — developer utilities (port 3002).
- `packages/*` — code genuinely shared by multiple workspaces or a named standalone capability.
- `services/*` — independently running backend services only, not shared helpers.
- `tests/*` — repository-level regression and architecture tests.

Do not create root-level `src`, `components`, `lib`, `utils`, or `shared` directories. Root files are for workspace configuration, documentation, and repository automation only. Do not create empty directories.

Applications do not use Next.js's optional `src` directory. Place `app`, `components`, `lib`, `utils`, and `db` directly under `apps/<app>/`. Existing `apps/<app>/src` trees are legacy and must be migrated as a complete, dedicated change; do not create a parallel root-level tree or expand the legacy structure during unrelated work.

Apps must not import another app's source. Packages must not import from apps. Cross-workspace dependencies flow from apps or services into packages and must not form cycles.

## Mandatory File Placement

Place code at the narrowest scope that owns it. Promote code only when a real second consumer needs it.

| Code ownership | Location |
| --- | --- |
| Small helper, type, or constant used by one file | Keep it in that file |
| Used only by one route | `apps/<app>/app/<route>/_components`, `_lib`, or `_hooks` |
| UI reused across routes in one app | `apps/<app>/components/<domain>` |
| Domain logic or an integration reused in one app | `apps/<app>/lib/<domain>` |
| Small pure, domain-neutral helper reused in one app | `apps/<app>/utils/<capability>.ts` |
| Database client, schema, or bootstrap code | `apps/<app>/db` and server-only modules |
| Static browser-served asset | `apps/<app>/public` |
| Used by multiple apps or services | Existing `packages/<capability>` package; create one only when no package fits |
| Repository regression test | `tests/*.test.mjs` |

`app` owns Next.js routing: `page.tsx`, `layout.tsx`, `route.ts`, `loading.tsx`, `error.tsx`, and route-private folders. Route handlers and pages should be thin adapters; reusable logic belongs at the ownership level above. Use `(group)` only to organize routes without changing URLs and `_folder` for non-routable route-private implementation.

`utils` is not a dumping ground. Business rules, storage, API clients, database access, and feature-specific transformations belong in `lib/<domain>` or the route's `_lib`. Prefer descriptive names such as `currency.ts` or `invoiceTotals.ts`; do not add vague `helpers.ts`, `common.ts`, `misc.ts`, or a second catch-all `utils.ts`.

Do not create a standalone file for a one-use wrapper, interface, constant, or trivial function. Do not add app-internal barrel files merely to shorten imports. A package entry point may re-export its intentional public API.

## Shared Code and Dependencies

- Reuse an existing helper when it has the same responsibility; do not force unrelated behavior into it merely to avoid a new file.
- Do not create vague packages such as `packages/shared`, `packages/common`, or `packages/utils`. Name a package after a stable capability.
- Consumers must declare workspace packages in their own `package.json` with `"workspace:*"` and import the package name. Never deep-import another workspace's `src` directory or use TypeScript `paths` to imitate a package dependency.
- Every app or package declares the runtime and development dependencies it imports. Root dependencies are only for repository-wide tooling.
- Use pnpm only. Add a dependency to its owning workspace with `pnpm --filter <workspace> add <package>`; do not hand-edit `pnpm-lock.yaml`.
- Before adding a production dependency, prefer the standard library, the web/Next.js platform, or an already-installed dependency. Record the reason when a new dependency is necessary.

## Next.js and TypeScript Rules

- Default to Server Components. Add `"use client"` only at the smallest interactive boundary.
- Keep secrets, database access, and server-only dependencies out of Client Components.
- Validate request params, headers, and bodies at route-handler boundaries before calling domain logic.
- Use TypeScript and ESM imports. Avoid `any`; when legacy code already uses it, do not spread it into new boundaries.
- Use the existing `@/*` alias only inside the Paperwork app. Use relative imports within the other apps until they define an equivalent local alias.
- Component and type names use PascalCase; functions and variables use camelCase; constants use `UPPER_SNAKE_CASE`; route directories use kebab-case.
- Component files use `PascalCase.tsx`; non-component TypeScript files follow the nearby convention and use descriptive names.

## UI and Design-System Rules

- Design page layouts around content relationships and available space. Keep related headings, filters, actions, and supporting content inline or in responsive grids when that improves scanning and space use; stack them into full-width rows only when the content or viewport requires it. Do not default to a repetitive row-after-row layout.
- Before creating or redesigning UI, inspect the existing reusable components and design tokens in the relevant codebase or `.pen` document.
- Reuse existing design-system components through real component instances or references. Do not create hand-built visual lookalikes for an available header, footer, button, input, select, textarea, toggle, checkbox, alert, badge, card, table row, navigation item, workbench, or other reusable component.
- When the same meaningful UI pattern appears three or more times, extract or extend a reusable design-system component before creating more copies. Document it in the component library and build subsequent uses as instances with page-specific overrides.
- A shared workbench or component-family overview does not replace page coverage. When the task requires every implemented route or tool page, create and clearly label a separate complete page design for each route, while instancing the shared family component inside each page.
- Preserve all previously created designs. Do not delete an existing page, screen, state, workbench, component, or design section unless the user explicitly requests deletion. Refactor in place or add new coverage instead.
- Page-specific content, controls, states, and results must remain tailored to the implemented feature even when pages share the same reusable shell.

## Change and Artifact Hygiene

- Scratch scripts, screenshots, logs, profiling output, and diagnostics go in `/tmp`, not the repository.
- Never commit `.next`, `dist`, `build`, coverage output, `*.tsbuildinfo`, logs, populated environment files, or editor/agent state. Add repeatable generated output to `.gitignore`.
- Do not edit generated files such as `next-env.d.ts` or lockfiles by hand.
- Do not mix broad renames, formatting, dependency upgrades, or directory migrations into an unrelated task.
- Preserve public behavior unless the task explicitly changes it. A file move alone must not change runtime behavior.

## Testing and Verification

Tests use `node:test` and `node:assert`; name repository tests `tests/*.test.mjs`. Add one focused regression test for non-trivial bug fixes and architecture rules.

Use TDD only for non-trivial business logic, complex behavior, or regression-prone bug fixes where a test adds real value. Otherwise, use the relevant build, lint, typecheck, or validation command.

For code changes:

1. Run the smallest relevant test while iterating.
2. Run `pnpm test`.
3. Run `pnpm --filter @smarttools/<affected-app> lint`.
4. Run `pnpm --filter @smarttools/<affected-app> build` when runtime, routing, dependency, or configuration behavior changed.
5. Run root `pnpm lint` and `pnpm build` when shared packages or multiple apps changed.
6. Finish with `git diff --check` and `git status --short`; inspect all changed and untracked files.

For documentation-only changes, review the diff and verify that documented paths and commands exist; code builds are unnecessary. Never claim a check passed unless it was run, and report any failure or environment blocker exactly.

## Security and Configuration

- Never hardcode credentials or commit populated `.env` files. Document new variables with empty or non-sensitive values in the owning app's `.env.example`.
- Treat browser input, route input, headers, stored JSON, and third-party responses as untrusted.
- Enforce authentication and authorization on the server; a hidden UI control is not an access boundary.
- Do not log secrets, tokens, full financial records, or unnecessary personal data.

## Commit and Pull Request Guidelines

Use short imperative commit subjects; `feat:`, `fix:`, and `chore:` prefixes are preferred but not required. Pull requests should name affected apps, link relevant issues, list verification commands, include screenshots for visible UI changes, and call out environment or database changes.

## Reference Basis

- [OpenAI Codex `AGENTS.md` guidance](https://developers.openai.com/codex/guides/agents-md)
- [Next.js project structure and colocation](https://nextjs.org/docs/app/getting-started/project-structure)
- [pnpm workspaces and the `workspace:` protocol](https://pnpm.io/workspaces)
- [TypeScript guidance for monorepo package imports](https://www.typescriptlang.org/docs/handbook/modules/reference#paths-should-not-point-to-monorepo-packages-or-node_modules-packages)
- [Git rules for generated and temporary files](https://git-scm.com/docs/gitignore)
