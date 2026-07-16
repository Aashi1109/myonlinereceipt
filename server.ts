/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import dotenv from "dotenv";
dotenv.config();

import express from "express";
import path from "path";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./src/db/index";
import { keyValuePairTable, vendorProfilesTable, invoiceTemplatesTable, appConfigTable, usersTable } from "./src/db/schema";
import { seedTemplates } from "./src/lib/templates/templateSeeds";
import { createServer as createViteServer } from "vite";

async function startServer() {
  // Bootstrap Database tables if they do not exist
  try {
    console.log("Bootstrapping Database schema...");

    // Check if old tables exist without user_id column and drop if needed
    try {
      await db.execute(sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='key_value_pairs' AND column_name='key'
            AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='key_value_pairs' AND column_name='user_id'
            )
          ) THEN
            DROP TABLE key_value_pairs CASCADE;
          END IF;
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='vendor_profiles' AND column_name='id'
            AND NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE table_name='vendor_profiles' AND column_name='user_id'
            )
          ) THEN
            DROP TABLE vendor_profiles CASCADE;
          END IF;
        END $$;
      `);
    } catch (e) {
      console.warn("Table migration check failed, skipping drop attempts...", e);
    }

    // Create partitioned and isolated tables
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
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS invoice_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        version INTEGER NOT NULL DEFAULT 1,
        document_type TEXT NOT NULL DEFAULT 'invoice',
        layout_family TEXT NOT NULL,
        config JSONB NOT NULL,
        is_premium BOOLEAN NOT NULL DEFAULT FALSE,
        required_plan TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Seed templates table if first boot and empty
    const tCount = await db.select({ count: sql<number>`count(*)` }).from(invoiceTemplatesTable);
    if (Number(tCount[0]?.count || 0) === 0) {
      console.log("Seeding database templates from seedTemplates...");
      for (const tpl of seedTemplates) {
        await db.insert(invoiceTemplatesTable).values({
          id: tpl.id,
          name: tpl.name,
          slug: tpl.slug,
          description: tpl.description || null,
          category: tpl.category,
          status: tpl.status,
          isDefault: tpl.isDefault ?? false,
          version: tpl.version ?? 1,
          documentType: tpl.documentType ?? "invoice",
          layoutFamily: tpl.layoutFamily,
          config: tpl.config,
          isPremium: tpl.isPremium ?? false,
          requiredPlan: tpl.requiredPlan ?? "free",
          createdAt: tpl.createdAt ? new Date(tpl.createdAt) : new Date(),
          updatedAt: tpl.updatedAt ? new Date(tpl.updatedAt) : new Date(),
        });
      }
      console.log("Templates table seeded successfully.");
    }

    // Seed admin passcode if empty in extensible app configs
    const aCount = await db.select({ count: sql<number>`count(*)` }).from(appConfigTable).where(eq(appConfigTable.key, "admin_passcode"));
    if (Number(aCount.length) === 0) {
      console.log("Seeding admin passcode config with standard default value...");
      await db.insert(appConfigTable).values({
        key: "admin_passcode",
        value: "admin123",
        updatedAt: new Date(),
      });
      console.log("Admin passcode config seeded.");
    }

    console.log("Database schema is fully bootstrapped and ready.");
  } catch (err) {
    console.warn("Could not execute automatic database schema bootstrap. It might be already set up or permissions constraint.", err);
  }

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Helper to extract client/user identifier from request headers
  const getUserId = (req: any): string => {
    return (req.headers["x-user-id"] || "default_user") as string;
  };

  // Helper to register an anonymous client user session if records don't exist
  const ensureUserExists = async (userId: string) => {
    try {
      await db.insert(usersTable).values({ id: userId }).onConflictDoNothing();
    } catch (err) {
      console.error("ensureUserExists error for:", userId, err);
    }
  };

  // API 1: Get Single Key-Value space (user-isolated)
  app.get("/api/storage/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const userId = getUserId(req);
      await ensureUserExists(userId);

      const rows = await db
        .select()
        .from(keyValuePairTable)
        .where(
          and(
            eq(keyValuePairTable.userId, userId),
            eq(keyValuePairTable.key, key)
          )
        )
        .limit(1);

      if (rows && rows.length > 0) {
        return res.json({ found: true, value: rows[0].value });
      }
      return res.json({ found: false, value: null });
    } catch (error: any) {
      console.error(`Error loading key ${req.params.key} from Postgres`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API 2: Set Single Key-Value space (user-isolated)
  app.post("/api/storage", async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Missing key" });
      }
      const userId = getUserId(req);
      await ensureUserExists(userId);

      // Upsert value for the specific user session
      await db
        .insert(keyValuePairTable)
        .values({
          userId,
          key,
          value,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [keyValuePairTable.userId, keyValuePairTable.key],
          set: {
            value,
            updatedAt: new Date(),
          },
        });

      return res.json({ success: true });
    } catch (error: any) {
      console.error(`Error saving key ${req.body?.key} to Postgres`, error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API 3: Get Vendors register (user-isolated)
  app.get("/api/vendors", async (req, res) => {
    try {
      const userId = getUserId(req);
      await ensureUserExists(userId);

      const vendors = await db
        .select()
        .from(vendorProfilesTable)
        .where(eq(vendorProfilesTable.userId, userId));

      return res.json({ success: true, vendors });
    } catch (error: any) {
      console.error("Error fetching vendors from Postgres", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API 4: Save Vendors register (user-isolated)
  app.post("/api/vendors", async (req, res) => {
    try {
      const { vendors } = req.body;
      if (!Array.isArray(vendors)) {
        return res.status(400).json({ error: "Expected array of vendors" });
      }
      const userId = getUserId(req);
      await ensureUserExists(userId);

      for (const vendor of vendors) {
        await db
          .insert(vendorProfilesTable)
          .values({
            userId,
            id: vendor.id,
            legalName: vendor.legalName,
            businessName: vendor.businessName || null,
            email: vendor.email || null,
            phone: vendor.phone || null,
            addressLine1: vendor.addressLine1 || null,
            city: vendor.city || null,
            state: vendor.state || null,
            zipCode: vendor.zipCode || null,
            entityType: vendor.entityType || "Unknown",
            w9Status: vendor.w9Status || "Not Requested",
            notes: vendor.notes || null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [vendorProfilesTable.userId, vendorProfilesTable.id],
            set: {
              legalName: vendor.legalName,
              businessName: vendor.businessName || null,
              email: vendor.email || null,
              phone: vendor.phone || null,
              addressLine1: vendor.addressLine1 || null,
              city: vendor.city || null,
              state: vendor.state || null,
              zipCode: vendor.zipCode || null,
              entityType: vendor.entityType || "Unknown",
              w9Status: vendor.w9Status || "Not Requested",
              notes: vendor.notes || null,
              updatedAt: new Date(),
            },
          });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error saving vendors to Postgres", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API 5: Get All Invoice Templates from Database
  app.get("/api/templates", async (req, res) => {
    try {
      const templates = await db.select().from(invoiceTemplatesTable);
      return res.json({ success: true, templates });
    } catch (error: any) {
      console.error("Error fetching templates from Postgres", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API 6: Save/Sync Invoice Templates to Database
  app.post("/api/templates", async (req, res) => {
    try {
      const { templates } = req.body;
      if (!Array.isArray(templates)) {
        return res.status(400).json({ error: "Expected array of templates" });
      }

      for (const tpl of templates) {
        await db
          .insert(invoiceTemplatesTable)
          .values({
            id: tpl.id,
            name: tpl.name,
            slug: tpl.slug,
            description: tpl.description || null,
            category: tpl.category,
            status: tpl.status,
            isDefault: tpl.isDefault ?? false,
            version: tpl.version ?? 1,
            documentType: tpl.documentType ?? "invoice",
            layoutFamily: tpl.layoutFamily,
            config: tpl.config,
            isPremium: tpl.isPremium ?? false,
            requiredPlan: tpl.requiredPlan ?? "free",
            createdAt: tpl.createdAt ? new Date(tpl.createdAt) : new Date(),
            updatedAt: tpl.updatedAt ? new Date(tpl.updatedAt) : new Date(),
          })
          .onConflictDoUpdate({
            target: invoiceTemplatesTable.id,
            set: {
              name: tpl.name,
              slug: tpl.slug,
              description: tpl.description || null,
              category: tpl.category,
              status: tpl.status,
              isDefault: tpl.isDefault ?? false,
              version: tpl.version ?? 1,
              documentType: tpl.documentType ?? "invoice",
              layoutFamily: tpl.layoutFamily,
              config: tpl.config,
              isPremium: tpl.isPremium ?? false,
              requiredPlan: tpl.requiredPlan ?? "free",
              updatedAt: new Date(),
            },
          });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("Error bulk updating templates to Postgres", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API 7: Verify Admin Password directly through Database app_config values
  app.post("/api/admin/verify", async (req, res) => {
    try {
      const { password } = req.body;
      if (!password) {
        return res.json({ success: false, error: "Password is required" });
      }

      // Query admin passcode from generic app settings table
      const rows = await db
        .select()
        .from(appConfigTable)
        .where(eq(appConfigTable.key, "admin_passcode"))
        .limit(1);

      if (rows && rows.length > 0) {
        const storedPasscode = rows[0].value;
        if (password === storedPasscode) {
          return res.json({ success: true });
        }
      }
      return res.json({ success: false, error: "Invalid admin passcode details." });
    } catch (error: any) {
      console.error("Error verifying admin credentials via Postgres app_config", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Dev server routing with Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
