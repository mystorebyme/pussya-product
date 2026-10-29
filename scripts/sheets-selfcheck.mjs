#!/usr/bin/env node
/**
 * Apps Script deployment ka self-check — owner (ya main) ek hi command me pata kar
 * sake ki URL + token sahi hain aur sheet me likha ja raha hai ya nahi.
 *
 *   node scripts/sheets-selfcheck.mjs "https://script.google.com/macros/s/AKfy.../exec" "mera-token"
 *
 * Kya karta hai (sirf padhta hai + ek test row Audit tab me daalta hai):
 *   1. `?action=health` — token + deployment sahi hai?
 *   2. `?action=settings` — Settings tab padhi ja rahi hai?
 *   3. POST append (Audit tab) — likhne ka raasta chalu hai?
 *   4. Bataata hai kaunsa tab kitni rows ka hai, aur problem ho to exact fix.
 *
 * Exit code 0 = sab theek, 1 = kuch toota.
 */
const rawUrl = (process.argv[2] ?? process.env.GOOGLE_SHEETS_WEBAPP_URL ?? "").trim();
const token = (process.argv[3] ?? process.env.GOOGLE_SHEETS_TOKEN ?? "").trim();

const ok = (message) => console.log(`  ok   ${message}`);
const bad = (message) => console.log(`  FAIL ${message}`);
const info = (message) => console.log(`       ${message}`);

let failures = 0;
function expect(name, condition, detail = "") {
  if (condition) {
    ok(name);
  } else {
    failures += 1;
    bad(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}

console.log("\n── Noor Sheet self-check ─────────────────────────────");

if (!rawUrl || !token) {
  console.log("Usage: node scripts/sheets-selfcheck.mjs \"<Web app URL (/exec)>\" \"<TOKEN>\"\n");
  console.log("URL/token kahan se: docs/00-overview/apps-script-code.md (Step 6 aur 3).");
  process.exit(1);
}

if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(rawUrl)) {
  console.log(`\n  ⚠ URL ka shape theek nahi lag raha: ${rawUrl}`);
  console.log("    Sahi shape: https://script.google.com/macros/s/AKfycb.../exec");
  console.log("    (Deploy → Web app URL; `/dev` nahi, `/exec` chahiye.)\n");
}
// testing/mock ke liye base override (production me iski zaroorat nahi)
const base = (process.env.SHEETS_SELFCHECK_BASE ?? rawUrl).replace(/\/+$/, "");

async function getJson(query) {
  const url = `${base}?${query}&token=${encodeURIComponent(token)}`;
  const response = await fetch(url, { redirect: "follow", headers: { accept: "application/json" } });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 300) };
  }
  return { status: response.status, body, text };
}

// ── 1. health ───────────────────────────────────────────────────────────────
let health = null;
try {
  health = await getJson("action=health");
  expect("Web app jawab de raha hai", health.status === 200, `HTTP ${health.status}`);
  expect("token sahi hai", health.body?.ok === true, JSON.stringify(health.body).slice(0, 160));

  if (health.body?.ok === true) {
    expect("script version 2 hai", health.body.version === 2, String(health.body.version));
    expect("Spreadsheet khul raha hai", Boolean(health.body.spreadsheet), health.body.spreadsheet);
    info(`spreadsheet: ${health.body.spreadsheet}`);
    /**
     * Sabse ahem check: script **aapki** sheet pakde hue hai ya kisi copy ko?
     * (25 Oct 2026 ko yahi bug tha — data ek copy me ja raha tha.)
     */
    const wantedId = (process.argv[4] ?? process.env.EXPECTED_SHEET_ID ?? process.env.SHEET_EXPECTED_ID ?? "").trim();
    if (health.body.spreadsheetId) {
      const match = health.body.spreadsheetId === wantedId;
      expect("script sahi sheet pakde hue hai", match, `mila: ${health.body.spreadsheetId} · chahiye: ${wantedId}`);
      info(`sheet id: ${health.body.spreadsheetId}`);
      if (!match) {
        console.log("       FIX: Code.gs me `book_()` update kariye (SPREADSHEET_ID pehle),");
        console.log("            phir Deploy → Manage deployments → ✏️ → New version → Deploy.");
      }
    } else {
      info("sheet id nahi mila — purana code chal raha hai (book_() update karke New version deploy kariye)");
    }

    const sheets = Array.isArray(health.body.sheets) ? health.body.sheets : [];
    const wanted = ["Settings", "Orders", "Payments", "Checkout", "Messages", "Newsletter", "Audit"];
    for (const name of wanted) {
      const found = sheets.find((sheet) => sheet.name === name);
      expect(`tab "${name}" maujood`, Boolean(found), found ? `${found.rows} rows` : "missing — `setup` chalaiye");
    }
    console.log("       tab-wise rows:");
    for (const sheet of sheets) info(`${sheet.name.padEnd(11)} → tab "${sheet.tab}" · ${sheet.rows} rows`);
  }
} catch (error) {
  failures += 1;
  bad(`Web app tak pahunch nahi paya — ${error.message}`);
  console.log("       Checks: (1) URL poora hai? (2) Deploy me 'Who has access: Anyone'?");
  console.log("               (3) Deployment 'New version' ke saath live hai?");
}

// ── 2. settings ─────────────────────────────────────────────────────────────
let settings = null;
try {
  settings = await getJson("action=settings");
  expect("Settings tab padhi ja rahi hai", settings.body?.ok === true, JSON.stringify(settings.body).slice(0, 160));
  const values = settings.body?.settings ?? {};
  const keys = Object.keys(values);
  info(`settings mili: ${keys.length ? keys.join(", ") : "(khaali — Settings tab me key/value rows daaliye)"}`);
  expect("support_phone set hai", Boolean(values.support_phone), String(values.support_phone ?? ""));
  expect("upi_id set hai", Boolean(values.upi_id), String(values.upi_id ?? ""));
} catch (error) {
  failures += 1;
  bad(`Settings read fail — ${error.message}`);
}

// ── 3. write (Audit tab me ek test row) ─────────────────────────────────────
try {
  const payload = {
    token,
    action: "append",
    rows: [
      {
        sheet: "Audit",
        row: {
          Timestamp: new Date().toISOString(),
          Actor: "selfcheck",
          Action: "sheet.selfcheck",
          Target: "scripts/sheets-selfcheck.mjs",
          Details: "website deploy ke baad ek baar chalaya gaya",
        },
      },
    ],
  };
  const response = await fetch(base, {
    method: "POST",
    redirect: "follow",
    // Apps Script preflight (OPTIONS) handle nahi karta — simple request bhejte hain
    headers: { "content-type": "text/plain;charset=utf-8", accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  expect("sheet me likha ja raha hai (Audit tab)", body?.ok === true && body?.written === 1, JSON.stringify(body).slice(0, 160));
  if (body?.ok === true) info("Audit tab kholein — ek 'sheet.selfcheck' row dikhni chahiye.");
} catch (error) {
  failures += 1;
  bad(`Write fail — ${error.message}`);
}

// ── 4. verdict ──────────────────────────────────────────────────────────────
console.log("────────────────────────────────────────────────────────");
if (failures === 0) {
  console.log("✅ Sab theek — ab Vercel me ye 2 env var daal kar redeploy kariye:\n");
  console.log("   GOOGLE_SHEETS_WEBAPP_URL = " + base);
  console.log("   GOOGLE_SHEETS_TOKEN      = (aapka token)\n");
  process.exit(0);
}
console.log(`❌ ${failures} problem mili — upar ke FAIL messages dekhiye.`);
console.log("   Poora troubleshooting: docs/00-overview/sheet-setup-owner.md\n");
process.exit(1);
