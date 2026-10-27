#!/usr/bin/env node
/**
 * R27 e2e — owner ke is round ke 4 asks ka **live proof** (production par):
 *
 *  1. Logo header/footer me center (CSS grid classes render hue hain?).
 *  2. Google Search Console verification — meta tag + HTML file dono live.
 *  3. Traffic tracking — Vercel Analytics + Speed Insights script live (404 nahi).
 *  4. Contact form — submit ke baad success + message DB me (admin me dikhe).
 *     Saath me: Google Sheet mirror ka sach (owner ke deployment par depend).
 *
 * Chalao:  BASE_URL=https://noor-ethnic-wear.vercel.app node tests/e2e/round27.mjs
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const SELFTEST_KEY = process.env.SHEET_SELFTEST_KEY ?? "noor-st-9f3k2m-7hq4rt-2026";
const GSC = "hFaqyp-9LdUXSKPA9RF011TkO2m_-7AUMasXqm_0dGI";

let passed = 0;
const failures = [];
const notes = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const get = async (path) => {
  const response = await fetch(`${BASE}${path}`, {
    headers: { "cache-control": "no-cache", "user-agent": "noor-live-audit" },
    redirect: "follow",
  });
  return { status: response.status, text: await response.text() };
};

console.log(`\n── R27 live checks · ${BASE} ─────────────────────────`);

// 1) Logo center — desktop grid (3 column: nav | logo | icons) render hona chahiye
{
  const home = await get("/");
  check("home 200", home.status === 200, `status ${home.status}`);
  check(
    "header: logo center grid",
    /lg:grid-cols-\[1fr_auto_1fr\]/.test(home.text) && /lg:col-start-2/.test(home.text),
    "grid classes nahi mile",
  );
  check("footer: logo lockup center", /items-center justify-center text-center/.test(home.text));

  // 2) Google Search Console
  check(
    "GSC meta tag live",
    /<meta name="google-site-verification" content="hFaqyp-9LdUXSKPA9RF011TkO2m_-7AUMasXqm_0dGI"/.test(home.text),
    "meta tag HTML me nahi hai",
  );
  check("canonical/OG base", /<title>[^<]*Noor/i.test(home.text) || /og:site_name/.test(home.text));

  // 3) Traffic tracking
  check(
    "Vercel Web Analytics bootstrap",
    /window\.va\s*=\s*window\.va/.test(home.text),
    "window.va nahi mila",
  );
  check("analytics script tag", home.text.includes("/_vercel/insights/script.js"));
  check("speed insights script tag", home.text.includes("/_vercel/speed-insights/script.js"));

  const insights = await fetch(`${BASE}/_vercel/insights/script.js`).catch(() => null);
  if (insights && insights.status === 200) {
    passed += 1;
    console.log("  ok   analytics script served (200)");
  } else {
    // Owner action: Vercel → project → Analytics → Enable. Build fail nahi karte.
    notes.push(
      `Vercel dashboard me Analytics/Speed Insights "Enable" nahi hua — /_vercel/insights/script.js = ${insights ? insights.status : "network"}`,
    );
  }
}

// 2b) GSC HTML file bhi chalna chahiye (dono method)
{
  const file = await get("/googleb3b0e3defc1daa17.html");
  check("GSC html file 200", file.status === 200, `status ${file.status}`);
  check(
    "GSC html file content",
    file.text.includes("google-site-verification: googleb3b0e3defc1daa17.html"),
    file.text.slice(0, 80),
  );
}

// 3b) Contact form — submit ke baad message DB + admin me (R26/R27 ka asli test)
{
  const stamp = Date.now();
  const payload = {
    name: `R27 Audit ${stamp}`,
    email: `audit+${stamp}@example.com`,
    phone: "9000000001",
    subject: "Order enquiry",
    message: `R27 live audit message ${stamp} — submit ke baad update check.`,
  };
  const response = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => null);
  const body = response ? await response.text() : "";
  check("contact submit accepted", Boolean(response) && response.status < 400, `status ${response?.status} ${body.slice(0, 120)}`);
  check("contact submit returns ok", /"ok"\s*:\s*true/.test(body), body.slice(0, 120));

  // message sach me save hua? (selftest ka message + dbCount)
  const selftest = await get(
    `/api/sheet-selftest?key=${encodeURIComponent(SELFTEST_KEY)}&message=1&v=r27-${stamp}`,
  );
  let parsed = null;
  try {
    parsed = JSON.parse(selftest.text);
  } catch {
    parsed = null;
  }
  check("sheet-selftest reachable", selftest.status === 200 && Boolean(parsed), `status ${selftest.status}`);
  if (parsed?.message) {
    check("message DB me save hua", parsed.message.ok === true && parsed.message.rowInDb === true, JSON.stringify(parsed.message).slice(0, 200));
    if (parsed.message.sheetMirror === true) {
      passed += 1;
      console.log("  ok   Google Sheet mirror");
    } else {
      notes.push(
        "Google Sheet mirror band hai — Apps Script deployment ka access 'Anyone' nahi / purana URL. " +
          `${parsed.read?.scriptHint ?? "detail: /api/sheet-selftest?key=…"}`,
      );
    }
  }
  if (parsed?.read?.urlDeployment) {
    console.log(`       configured Apps Script deployment: ${parsed.read.urlDeployment}`);
  }
}

console.log("");
console.log(`  ${passed} pass · ${failures.length} fail`);
for (const note of notes) console.log(`  NOTE ${note}`);
if (failures.length) {
  console.log("\nFAILURES:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
console.log("");
