import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  ilike,
  inArray,
  ne,
  or,
  sql,
} from "drizzle-orm";
export { alias } from "drizzle-orm/pg-core";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgres://127.0.0.1:1/smarttools_unconfigured";

export const sqlClient = postgres(databaseUrl, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(sqlClient, { schema });

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function assertDatabaseConfigured(): void {
  if (!isDatabaseConfigured()) {
    throw new Error("DATABASE_URL is required");
  }
}

export * from "./schema.ts";
// `./seedManagedTools.ts` is deliberately NOT re-exported. It walks the `tools/`
// directory with `fs` and resolves `../../../tools/<key>/definition.ts` at
// runtime — build-time-only work. Re-exporting it here pulled it into the app's
// module graph (every `@smarttools/database` importer), and the bundler then
// failed to resolve that path, breaking `next build`.
// `scripts/migrate.mjs` imports it directly by path, which is the only caller.
export * from "./toolContent.ts";
export * from "./toolIcon.ts";
