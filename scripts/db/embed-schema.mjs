#!/usr/bin/env node
/**
 * `database/schema.sql` + `database/migrations/*.sql` ko TypeScript string me
 * embed karta hai (`apps/web/src/lib/db-schema.ts`), taaki serverless hosting
 * (Vercel) par bhi app khud migration chala sake.
 *
 *   node scripts/db/embed-schema.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const schema = fs.readFileSync(path.join(ROOT, "database/schema.sql"), "utf8");
const migrations = fs
  .readdirSync(path.join(ROOT, "database/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => [name, fs.readFileSync(path.join(ROOT, "database/migrations", name), "utf8")]);

const body = `/**
 * DB schema + migrations — **generated file** (haath se edit na karein).
 *
 * Source of truth: \`database/schema.sql\` + \`database/migrations/*.sql\`.
 * Regenerate: \`node scripts/db/embed-schema.mjs\`.
 *
 * Kyun embed: Vercel/Supabase par koi shell nahi hota, isliye app pehli DB
 * query par khud schema apply kar leta hai (advisory lock ke saath, idempotent).
 */

export const SCHEMA_SQL = ${JSON.stringify(schema)};

export const MIGRATIONS: Record<string, string> = {
${migrations.map(([name, sql]) => `  ${JSON.stringify(name)}: ${JSON.stringify(sql)},`).join("\n")}
};
`;

fs.writeFileSync(path.join(ROOT, "apps/web/src/lib/db-schema.ts"), body);
console.log(`[embed-schema] written (${body.length} chars, ${migrations.length} migrations)`);
