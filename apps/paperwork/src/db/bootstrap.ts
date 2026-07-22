import { sql } from "drizzle-orm";
import { db } from "./index";
import { usersTable } from "./schema";

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

export async function ensureDatabaseBootstrapped() {
  if (bootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      // Create partitioned and isolated tables if not existing
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS key_value_pairs (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          key TEXT NOT NULL,
          value JSONB NOT NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, key)
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS vendor_profiles (
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          id TEXT NOT NULL,
          legal_name TEXT NOT NULL,
          business_name TEXT,
          email TEXT,
          phone TEXT,
          address_line1 TEXT,
          city TEXT,
          state TEXT,
          zip_code TEXT,
          entity_type TEXT NOT NULL DEFAULT 'Unknown',
          w9_status TEXT NOT NULL DEFAULT 'Not Requested',
          notes TEXT,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          PRIMARY KEY (user_id, id)
        );
      `);

      bootstrapped = true;
    } catch (err) {
      console.warn("Database schema bootstrap warning:", err);
    }
  })();

  return bootstrapPromise;
}

export async function ensureUserExists(userId: string) {
  try {
    await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
  } catch (err) {
    console.error("ensureUserExists error for:", userId, err);
  }
}
