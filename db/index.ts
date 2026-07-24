/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

const database = connectionString
  ? drizzle(
      postgres(connectionString, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      }),
      { schema },
    )
  : null;

export const db = database ?? new Proxy({} as NonNullable<typeof database>, {
  get() {
    throw new Error("DATABASE_URL is required");
  },
});
