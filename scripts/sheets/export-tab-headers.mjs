#!/usr/bin/env node
/**
 * Sheet tab headers → CSV files (docs/09-devops/sheet-tabs/*.csv).
 *
 * Kyun: owner ko Google Sheet me tabs banane ke liye bas "File → Import" karna hai —
 * column ke naam yaad rakhne ki zaroorat nahi. Headers ka **ek hi source** hai
 * `scripts/google-apps-script/noor-sheets.gs` (var HEADERS + DEFAULT_SETTINGS),
 * isliye CSV kabhi script se out-of-sync nahi hoti.
 *
 *   node scripts/sheets/export-tab-headers.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const GS = path.join(ROOT, "scripts/google-apps-script/noor-sheets.gs");
const OUT = path.join(ROOT, "docs/09-devops/sheet-tabs");

const source = fs.readFileSync(GS, "utf8");

/** `var HEADERS = { ... };` block nikalo */
const headersBlock = source.slice(
  source.indexOf("var HEADERS = {"),
  source.indexOf("};", source.indexOf("var HEADERS = {")) + 2,
);
const settingsBlock = source.slice(
  source.indexOf("var DEFAULT_SETTINGS = ["),
  source.indexOf("];", source.indexOf("var DEFAULT_SETTINGS = [")) + 2,
);

const csvCell = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** JS object literal → tab names + columns (safe parse: keys aur single-quoted strings) */
const tabs = [];
const tabRegex = /(\w+):\s*\[([\s\S]*?)\],/g;
let match;
while ((match = tabRegex.exec(headersBlock))) {
  const columns = [...match[2].matchAll(/'([^']*)'/g)].map((entry) => entry[1]);
  if (columns.length) tabs.push({ name: match[1], columns });
}

const settingsRows = [...settingsBlock.matchAll(/\['([^']+)',\s*'([^']*)'\]/g)].map((entry) => [entry[1], entry[2]]);

fs.mkdirSync(OUT, { recursive: true });

/** Settings tab: key/value (blank values = owner bhar ke site par live kar dega) */
fs.writeFileSync(
  path.join(OUT, "Settings.csv"),
  ["key,value", ...settingsRows.map((row) => row.map(csvCell).join(","))].join("\n") + "\n",
);

for (const tab of tabs) {
  fs.writeFileSync(path.join(OUT, `${tab.name}.csv`), tab.columns.map(csvCell).join(",") + "\n");
}

fs.writeFileSync(
  path.join(OUT, "README.md"),
  `# Sheet tabs (ready to import)

Ye CSV files **script se hi banti hain** — column ke naam manually mat badliye:

\`\`\`bash
node scripts/sheets/export-tab-headers.mjs
\`\`\`

Google Sheet me import kaise karein:

1. [sheets.new](https://sheets.new) → nayi sheet.
2. Har CSV ke liye: **File → Import → Upload** → file chuniye → *Insert new sheet(s)* → Import.
3. Import ke baad tab ka naam wahi rakhiye jo CSV ka naam hai
   (${["Settings", ...tabs.map((tab) => tab.name)].join(", ")}).
4. \`Settings\` tab me apni values bhariye — phone, WhatsApp, UPI ID, announcement, GSTIN.
   Jo cell khaali hai wo site par dikhta hi nahi (koi hardcoded fallback nahi).

Tabs: ${tabs.length + 1} · columns total: ${tabs.reduce((sum, tab) => sum + tab.columns.length, 0) + 2}
`,
);

console.log(`sheet tabs ✔ ${tabs.length + 1} CSV →`, path.relative(ROOT, OUT));
