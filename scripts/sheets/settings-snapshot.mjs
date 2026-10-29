#!/usr/bin/env node
/**
 * Settings snapshot refresh.
 *
 * Owner ki Google Sheet (tab: `Settings`) repo mirror me kabhi-kabhi copy karni
 * padti hai — sirf tab jab Sheet private ho aur Actions me koi sheet secret set
 * na ho. Site pehle Sheet/API se hi values leti hai; snapshot aakhri fallback hai.
 *
 * Usage:
 *   node scripts/sheets/settings-snapshot.mjs --from <url-or-file>
 *   node scripts/sheets/settings-snapshot.mjs --from https://script.google.com/macros/s/…/exec
 *   node scripts/sheets/settings-snapshot.mjs --print          # sirf dikhado, likho mat
 *
 * `<url-or-file>` in teeno ko samajhta hai:
 *   1. Apps Script web app (`?action=settings` laga kar JSON)
 *   2. Published Sheet CSV (`docs.google.com/spreadsheets/…/pub?output=csv`)
 *   3. Sheet gviz CSV (`…/gviz/tq?tqx=out:csv&sheet=Settings`) — sheet public ho tab
 *   4. Local CSV / JSON file
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, "config/store-settings.snapshot.json");

const args = process.argv.slice(2);
const fromIndex = args.indexOf("--from");
const from = fromIndex >= 0 ? (args[fromIndex + 1] ?? "").trim() : "";
const printOnly = args.includes("--print");

function parseCsvLine(line) {
  const fields = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function settingsFromCsv(csv) {
  const rows = {};
  for (const line of csv.split(/\r?\n/)) {
    const fields = parseCsvLine(line);
    if (fields.length < 2) continue;
    const key = fields[0].trim().toLowerCase().replace(/\s+/g, "_");
    const value = fields.slice(1).join(",").trim();
    if (!key || key === "key") continue;
    rows[key] = value;
  }
  return rows;
}

async function load(source) {
  if (!source) throw new Error("--from <url-or-file> chahiye (ya --print ke saath URL)");
  let body;
  if (/^https?:\/\//.test(source)) {
    const url = new URL(source);
    if (/script\.google\.com/.test(source)) url.searchParams.set("action", "settings");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { accept: "application/json, text/csv;q=0.9, */*;q=0.8" },
    });
    if (!response.ok) throw new Error(`${url.host} → HTTP ${response.status}`);
    body = await response.text();
  } else {
    body = fs.readFileSync(path.resolve(ROOT, source), "utf8");
  }

  const trimmed = body.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const raw = JSON.parse(trimmed);
    return raw.settings ?? raw.data ?? raw;
  }
  if (trimmed.startsWith("/*O_o*/")) {
    throw new Error("gviz JSON mila — URL me `tqx=out:csv` lagao");
  }
  return settingsFromCsv(body);
}

function text(value) {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value).replace(/\s+/g, " ").trim();
}

const keep = [
  "store_name",
  "whatsapp",
  "support_phone",
  "support_email",
  "announcement",
  "daily_special",
  "upi_id",
  "upi_name",
  "free_shipping",
  "store_url",
  "admin_url",
  "order_prefix",
  "prepaid_only",
  "support_hours",
  "return_window_days",
];

const source = await load(from);
const settings = {};
for (const key of keep) {
  const value = text(source[key]);
  if (value) settings[key] = value;
}
if (!settings.whatsapp) {
  throw new Error("Settings tab me `whatsapp` khaali hai — snapshot nahi likha");
}

const snapshot = {
  _readme:
    "Mirror of the owner's Google Sheet (tab: Settings). Source of truth is always the Sheet: at build time the site first tries the Apps Script web app, then the published Settings CSV, then the Sheet gviz CSV, then the live store API. Only when none of those are reachable does this file act as the last fallback, so a private Sheet never leaves the site without a WhatsApp number. Refresh it with: node scripts/sheets/settings-snapshot.mjs --from <csv-url-or-file>",
  source: "Google Sheet — Settings tab",
  sheetId: (process.env.SHEET_ID ?? "").trim() || null,
  capturedAt: new Date().toISOString(),
  settings,
};

if (printOnly) {
  console.log(JSON.stringify(snapshot, null, 2));
} else {
  fs.writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`snapshot → ${path.relative(ROOT, OUT)} (whatsapp ****${settings.whatsapp.slice(-2)})`);
}
