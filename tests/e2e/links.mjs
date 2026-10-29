#!/usr/bin/env node
/**
 * Internal link crawler — header, footer, home, collections, PDP, account,
 * policies, search, wishlist, track-order.
 *
 *   BASE_URL=http://127.0.0.1:3100 node tests/e2e/links.mjs
 *
 * Kahin bhi 404/500 mile to fail. (External links check nahi hote — CDN/hotlink
 * ka behaviour alag hota hai aur network sandbox me block bhi ho sakta hai.)
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SEEDS = ["/", "/collections", "/search?q=anarkali", "/pages/contact", "/account", "/track-order", "/wishlist"];
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 40);

const seen = new Set();
const queue = [...SEEDS];
const results = [];
let failed = 0;

function internal(href) {
  if (!href) return null;
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return null;
  if (/^https?:\/\//.test(href)) {
    return href.startsWith(BASE) ? href.slice(BASE.length) || "/" : null;
  }
  if (href.startsWith("//")) return null;
  return href;
}

while (queue.length && results.length < MAX_PAGES) {
  const path = queue.shift();
  if (!path || seen.has(path)) continue;
  seen.add(path);
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { redirect: "follow" });
  } catch (error) {
    results.push({ path, status: 0 });
    failed += 1;
    console.log(`  FAIL ${path} — ${error.message}`);
    continue;
  }
  results.push({ path, status: response.status });
  if (response.status >= 400) {
    failed += 1;
    console.log(`  FAIL ${path} — status ${response.status}`);
    continue;
  }
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) continue;
  const html = await response.text();
  // static export ka base path bhi support
  const basePath = BASE.replace(/^https?:\/\/[^/]+/, "");
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    const href = internal(match[1]);
    if (!href) continue;
    let clean = href;
    if (basePath && clean.startsWith(basePath)) clean = clean.slice(basePath.length) || "/";
    if (clean.startsWith("/_next/")) continue;
    if (/\.(png|jpe?g|webp|svg|ico|xml|txt|json|pdf|css|js)$/i.test(clean)) continue;
    if (!seen.has(clean)) queue.push(clean);
  }
}

console.log(`\nlinks: ${results.length} pages checked, ${failed} failed`);
for (const row of results.filter((entry) => entry.status >= 300)) {
  console.log(`  ${row.status} ${row.path}`);
}
if (failed) process.exit(1);
