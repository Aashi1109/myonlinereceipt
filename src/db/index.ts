/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const DEFAULT_CONN = "postgresql://boltic_ac86eae8-e13c-4278-a903-9037f0ef41d1_0ca36288:108566382ac00d57@asia-south1.database-proxy.boltic.app:5432/tooleria_6e70b80fe7c0?sslmode=disable";
const connectionString = process.env.DATABASE_URL || DEFAULT_CONN;

// We use lazy / direct instantiation. For pool safety, we export the client too if needed.
const queryClient = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });
