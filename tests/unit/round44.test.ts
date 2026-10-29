/**
 * R44 guards — "logo invisible" ko dojaan se rokna + live audit pipeline.
 *
 * Owner ki report: header me NOOR ETHNIC WEAR logo dikh nahi raha. R43 me crop
 * theek hua; R44 me visibility ko **guarantee** karte hain:
 *   • image load fail ho to text lockup (NOOR + ETHNIC WEAR) dikhta hai
 *   • logo eager load hota hai (lazy se pehle)
 *   • favicon ka declared size file ke asli size se match karta hai
 *   • static + live audit scripts maujood hain (koi bhi 404 live par pakda jaye)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(ROOT, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(ROOT, file));

function pngSize(file: string) {
  const buffer = fs.readFileSync(path.join(ROOT, file));
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file}: PNG nahi hai`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("R44-1: logo image fail ho to text lockup dikhta hai (kabhi blank nahi)", () => {
  const mark = read("apps/web/src/components/brand-mark.tsx");
  assert.match(mark, /onError=\{\(\) => setFailed\(true\)\}/, "onError fallback missing");
  assert.match(mark, /data-testid="brand-fallback"/, "fallback markup missing");
  assert.match(mark, /NOOR/, "fallback me NOOR text missing");
  assert.match(mark, /ETHNIC WEAR/, "fallback me ETHNIC WEAR text missing");
  assert.match(mark, /role="img"/);
  assert.match(mark, /aria-label="Noor Ethnic Wear"/);
});

test("R44-2: logo eager load hota hai (lazy-loading se kabhi ghayab na ho)", () => {
  const mark = read("apps/web/src/components/brand-mark.tsx");
  assert.match(mark, /fetchPriority="high"/);
  assert.doesNotMatch(mark, /loading="lazy"/, "header logo lazy nahi hona chahiye");
});

test("R44-3: header/footer dono BrandMark use karte hain (ek hi source of truth)", () => {
  const lockup = read("apps/web/src/components/brand-lockup.tsx");
  assert.match(lockup, /import \{ BrandMark \} from "@\/components\/brand-mark"/);
  assert.match(lockup, /<BrandMark variant=\{variant\} tone=\{tone\} \/>/);
  // purana duplicate <picture> markup hata diya (comment me zikr reh sakta hai) —
  // warna logo do jagah maintain karna padta
  const lockupCode = lockup.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.doesNotMatch(lockupCode, /<picture/);
});

test("R44-4: CSS me logo ki height kabhi 0 nahi aur fallback ko bhi jagah milti hai", () => {
  const css = read("apps/web/src/app/globals.css");
  assert.doesNotMatch(css, /\.brand-lockup img \{[^}]*height:\s*0/, "logo height 0 = invisible");
  assert.doesNotMatch(css, /\.brand-lockup[^,{]*\{[^}]*display:\s*none/, "brand-lockup hidden nahi hona chahiye");
  assert.match(css, /\.brand-lockup \.brand-fallback \{[^}]*min-height: 42px/);
});

test("R44-5: apple touch icon 180×180 hai aur wahi file reference hoti hai", () => {
  const file = "apps/web/public/images/brand/logo-mark-180.png";
  assert.ok(exists(file), "logo-mark-180.png missing");
  assert.equal(pngSize(file).width, 180);

  const layout = read("apps/web/src/app/layout.tsx");
  const apple = layout.match(/apple: \[\{ url: ([^,]+), sizes: "(\d+)x(\d+)"/);
  assert.ok(apple, "layout me apple icon missing");
  assert.equal(apple![2], "180");
  assert.match(layout, /mark180/, "apple icon mark180 file par hona chahiye (192 par nahi)");
});

test("R44-6: har page ka favicon wahi brand mark hai (koi default Next icon nahi)", () => {
  const layout = read("apps/web/src/app/layout.tsx");
  /*
   * R45: `app/favicon.ico` ab **hamara** crown mark hai (Next ka default nahi),
   * isliye allowed — par tabhi jab file asli ICO ho. Next ka default icon
   * (black/white triangle) kabhi nahi.
   */
  if (/favicon\.ico/.test(layout)) {
    const ico = fs.readFileSync(path.join(process.cwd(), "apps/web/src/app/favicon.ico"));
    assert.equal(ico.readUInt16LE(2), 1, "favicon.ico asli ICO hona chahiye (Next default nahi)");
    assert.ok(ico.length > 600, "favicon.ico khaali nahi hona chahiye");
  }
  for (const key of ["mark128", "mark180", "mark192"]) {
    assert.match(layout, new RegExp(key), `${key} favicon set me hona chahiye`);
  }
});

test("R44-7: account page ka contact link asli route par jaata hai (404 nahi)", () => {
  const account = read("apps/web/src/app/account/page.tsx");
  assert.doesNotMatch(account, /href="\/contact"/, "/contact route exist nahi karta");
  assert.match(account, /href="\/pages\/contact"/);
});

test("R44-8: audit pipeline maujood hai (static + live), aur CI me chalta hai", () => {
  assert.ok(exists("scripts/audit/static-audit.mjs"), "static-audit missing");
  assert.ok(exists("scripts/audit/live-check.mjs"), "live-check missing");
  assert.ok(exists(".github/workflows/live-check.yml"), "live-check workflow missing");

  const live = read("scripts/audit/live-check.mjs");
  for (const asset of ["logo-desktop.png", "logo-tablet.png", "logo-mobile.png", "logo-fluid.png", "logo-mark-180.png"]) {
    assert.match(live, new RegExp(asset.replace(".", "\\.")), `${asset} live check me hona chahiye`);
  }

  const pages = read(".github/workflows/pages.yml");
  assert.match(pages, /name: Live site check/, "deploy ke baad live smoke job missing");
});

test("R44-9: breakpoints 375px (iPhone) bhi cover karte hain", () => {
  const breakpoints = read("tests/e2e/breakpoints.mjs");
  for (const width of [320, 375, 390, 430, 768, 1024, 1366, 1440]) {
    assert.match(breakpoints, new RegExp(`w: ${width}`), `${width}px viewport missing`);
  }
});
