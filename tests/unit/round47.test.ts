/**
 * Round 47 — owner ka reference-based polish request:
 *
 *   "header ka bars icon, Size guide (header me), Our story (header me),
 *    size guide kholne par saari cheezein, category icons unique + animated,
 *    website ki smoothness"
 *
 * Reference site se **kuch cheezein** li gayi hain (layout ideas), koi copy nahi:
 * koi text, photo, product ya brand asset copy nahi kiya gaya. Ye guards un
 * cheezon ko pakadte hain jo owner ne maangi thi.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(root, file));

/* ------------------------------------------------------------ header items */

test("R47-1: header me bars icon har screen par hai (menu drawer khulta hai)", () => {
  const header = read("apps/web/src/components/site-header.tsx");
  const button = header.slice(header.indexOf('data-testid="mobile-menu"') - 700, header.indexOf('data-testid="mobile-menu"') + 400);
  assert.match(button, /aria-label="Open menu"/);
  // pehle `lg:hidden` tha — ab desktop par bhi dikhna chahiye
  assert.doesNotMatch(button, /lg:hidden/, "menu icon desktop par chhupna nahi chahiye");
  // bars = 3 lines wala path
  assert.match(header, /M3 6h18M3 11h13M3 16h18/, "bars (hamburger) icon");
});

test("R47-2: header me Size guide (slide-over) aur Our story link hai", () => {
  const header = read("apps/web/src/components/site-header.tsx");
  assert.match(header, /data-testid="header-size-guide"/, "desktop nav me size guide button");
  assert.match(header, /onClick=\{openSizeGuide\}/, "size guide panel kholta hai (page change nahi)");
  assert.match(header, /data-testid="header-our-story"/, "desktop nav me our story link");
  assert.match(header, /href: "\/pages\/about-us"/, "our story asli page par jaata hai (dead link nahi)");
  assert.ok(exists("apps/web/src/app/pages/[slug]/page.tsx"));
  // mobile drawer me bhi dono
  const drawer = header.slice(header.indexOf('id="noor-menu"'));
  assert.match(drawer, /openSizeGuide/, "drawer me size guide");
  assert.match(drawer, /storyLink\.href/, "drawer me our story");
});

/* ------------------------------------------------------------- size guide */

test("R47-3: size guide panel me saari cheezein hain (chart, units, steps, tips, help)", () => {
  const dialog = read("apps/web/src/components/size-guide-dialog.tsx");
  // R48: panel ki body `SizeGuideContent` me hai (page bhi wahi component use karta hai)
  assert.ok(dialog.includes("SizeGuideContent"), "panel me size guide body missing");
  const body = read("apps/web/src/components/size-guide-content.tsx");
  for (const required of [
    "SizeChartTable",
    "MEASURE_STEPS",
    "FIT_TIPS",
    "UNSTITCHED_NOTE",
    "findSizeForBust",
    "Ask on WhatsApp",
    "Full size guide",
  ]) {
    assert.ok(body.includes(required), `panel body me ${required} missing`);
  }
  // keyboard + scroll lock + escape
  assert.match(dialog, /event\.key === "Escape"/, "Escape se band ho");
  assert.match(dialog, /aria-modal="true"/, "accessible dialog");
  assert.match(dialog, /document\.body\.style\.overflow = "hidden"/, "background scroll lock");
  // layout me ek hi instance (har page par available)
  assert.match(read("apps/web/src/app/layout.tsx"), /<SizeGuideDialog \/>/);
});

test("R47-4: chart ka data ek hi jagah se aata hai (panel + page alag na ho)", () => {
  const chart = read("apps/web/src/lib/size-chart.ts");
  // site par pehle se publish numbers (S–XXL, bust 34–42) hi rahein
  for (const row of ["S", "M", "L", "XL", "XXL"]) assert.ok(chart.includes(`size: "${row}"`), `${row} row`);
  assert.match(chart, /bust: 34/);
  assert.match(chart, /bust: 42/);

  const page = read("apps/web/src/app/pages/[slug]/page.tsx");
  assert.match(page, /SizeGuideContent/, "size-guide page bhi wahi guide dikhata hai");
  assert.match(read("apps/web/src/components/size-guide-content.tsx"), /MEASURE_STEPS/);
  assert.match(read("apps/web/src/components/size-guide-content.tsx"), /FIT_TIPS/);
  // page par purana hardcoded array wapas na aaye
  assert.doesNotMatch(page, /\["S", "34", "30", "36", "38"\]/, "hardcoded size rows nahi");

  // PDP ka size guide link panel kholta hai (shopping flow tootta nahi)
  const pdp = read("apps/web/src/components/product-detail.tsx");
  assert.match(pdp, /data-testid="pdp-size-guide"/);
  assert.match(pdp, /openSizeGuide/);
  assert.doesNotMatch(pdp, /href="\/pages\/size-guide"/, "PDP par seedha page link nahi");
});

/* --------------------------------------------------------- category icons */

test("R47-5: har category ka apna icon hai (7 categories, 7 alag paths)", () => {
  const icons = read("apps/web/src/components/category-icon.tsx");
  const names = ["anarkali", "lehenga", "printed", "sparkle", "crown", "sale", "wedding"];
  for (const name of names) assert.match(icons, new RegExp(`^  ${name}: \\{`, "m"), `${name} icon missing`);
  // har icon ke paths alag hone chahiye (copy-paste icon nahi)
  const groups = [...icons.matchAll(/lines: \[([\s\S]*?)\],\s*\n\s*dots:/g)].map((match) => match[1]);
  assert.ok(groups.length >= 7, `sirf ${groups.length} icon groups mile`);
  assert.equal(new Set(groups).size, groups.length, "do icons ke paths same hain");

  const circles = read("apps/web/src/components/category-circles.tsx");
  assert.match(circles, /<CategoryIcon name=\{icon\}/, "circle par icon badge");
  assert.match(read("apps/web/src/app/collections/page.tsx"), /<CategoryIcon/, "collection cards par bhi icon");
});

test("R47-6: icons animated hain aur reduced-motion par band ho jaate hain", () => {
  const css = read("apps/web/src/app/globals.css");
  assert.match(css, /@keyframes catDraw/, "stroke draw animation");
  assert.match(css, /@keyframes catPop/, "dots pop");
  assert.match(css, /@keyframes catFloat/, "float");
  assert.match(css, /\.cat-icon \.cat-icon-line \{[^}]*stroke-dashoffset: 1/, "line chhupi hui shuru hoti hai");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.cat-icon \.cat-icon-line/, "reduced motion me lines band");
  assert.match(reduced, /\.cat-icon \.cat-icon-dot/, "reduced motion me dots band");

  const icons = read("apps/web/src/components/category-icon.tsx");
  assert.match(icons, /pathLength=\{1\}/, "har path ka length same (timing consistent)");
  assert.match(icons, /cat-icon-line/, "line class");
  assert.match(icons, /cat-icon-dot/, "dot class");
});

/* --------------------------------------------------------------- smoothness */

test("R47-7: smoothness — page transition, drawer slide, tap highlight, focus ring", () => {
  const css = read("apps/web/src/app/globals.css");
  for (const key of ["@keyframes noorPageIn", "@keyframes noorSlideFromLeft", "@keyframes noorSlideFromRight"]) {
    assert.ok(css.includes(key), `${key} missing`);
  }
  assert.match(css, /scroll-padding-top: 118px/, "sticky header ke neeche anchor na chhupe");
  assert.match(css, /-webkit-tap-highlight-color: transparent/, "mobile tap flash band");
  assert.match(css, /:focus-visible \{[^}]*outline: 2px solid #862222/, "keyboard focus ring");

  const transition = read("apps/web/src/components/page-transition.tsx");
  assert.match(transition, /"use client"/);
  assert.match(transition, /key=\{pathname\}/, "har naye page par animation");
  assert.match(read("apps/web/src/app/layout.tsx"), /<PageTransition>/, "layout me laga hua");

  const header = read("apps/web/src/components/site-header.tsx");
  assert.match(header, /motion-drawer-left/, "mobile drawer slide");
  assert.match(header, /motion-panel-right/, "cart drawer slide");
  assert.match(header, /motion-backdrop/, "backdrop fade");
});
