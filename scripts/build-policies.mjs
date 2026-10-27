#!/usr/bin/env node
/**
 * Policy markdown → TypeScript module.
 *
 * Kyun: Cloudflare Workers par runtime file system read-only hai, isliye
 * `fs.readFileSync(src/content/policies/*.md)` build ke baad kaam nahi karta
 * (policy pages 404 ho jaate the). Markdown chhota hai (~3 KB per file), isliye
 * build-time par hi bundle me daal dete hain — Next aur Workers dono par same.
 *
 * Chalao: `node scripts/build-policies.mjs` (ya `npm run policies:build`)
 * Output: `apps/web/src/content/policies.generated.ts` (committed — generated
 * catalogue ki tarah, taaki build bina script ke bhi chale).
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceDir = path.join(root, "apps/web/src/content/policies");
const outputFile = path.join(root, "apps/web/src/content/policies.generated.ts");

const files = fs
  .readdirSync(sourceDir)
  .filter((name) => name.endsWith(".md"))
  .sort();

if (files.length === 0) {
  console.error("policies:build — koi .md file nahi mili");
  process.exit(1);
}

const entries = files.map((name) => {
  const slug = name.replace(/\.md$/, "");
  const body = fs.readFileSync(path.join(sourceDir, name), "utf8");
  return `  ${JSON.stringify(slug)}: ${JSON.stringify(body)},`;
});

const output = `/**
 * GENERATED FILE — haath se mat badliye.
 * Source: apps/web/src/content/policies/*.md
 * Generator: \`node scripts/build-policies.mjs\` (npm run policies:build)
 *
 * Policy text bundle me hi hai (runtime fs nahi) — Cloudflare Workers par bhi
 * policy pages kaam karte hain.
 */
export const policyMarkdown: Record<string, string> = {
${entries.join("\n")}
};
`;

fs.writeFileSync(outputFile, output);
console.log(`policies:build — ${files.length} policies → ${path.relative(root, outputFile)}`);
