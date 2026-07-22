import { readFile } from "node:fs/promises";
import { seedTemplates } from "../../invoice-templates/src/index.ts";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const migration = await readFile(
  new URL("../drizzle/0001_auth_control_plane.sql", import.meta.url),
  "utf8",
);
const sql = postgres(databaseUrl, { max: 1 });

try {
  await sql.unsafe(migration);
  const [{ template_count }] = await sql`
    SELECT COUNT(*)::integer AS template_count FROM invoice_templates
  `;

  if (template_count === 0) {
    await sql.begin(async (transaction) => {
      for (const template of seedTemplates) {
        await transaction`
          INSERT INTO invoice_templates (
            id, name, slug, description, category, status, is_default,
            version, document_type, layout_family, config, is_premium,
            required_plan, created_at, updated_at
          ) VALUES (
            ${template.id}, ${template.name}, ${template.slug},
            ${template.description}, ${template.category}, ${template.status},
            ${template.isDefault}, ${template.version}, ${template.documentType},
            ${template.layoutFamily}, ${transaction.json(template.config)},
            ${template.isPremium ?? false}, ${template.requiredPlan ?? "free"},
            ${new Date(template.createdAt)}, ${new Date(template.updatedAt)}
          )
        `;
      }
    });
    console.log(`Seeded ${seedTemplates.length} invoice templates`);
  }
  console.log("Applied 0001_auth_control_plane.sql");
} finally {
  await sql.end();
}
