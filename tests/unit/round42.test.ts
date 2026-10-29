/**
 * R42 guards — owner ke teen sawaal:
 *
 *  1. "sheet me number aur UPI change kiya, wo dikhega ya nahi?"
 *     → sheet ke **asli** Settings CSV ko parse karke check karte hain ki site
 *       ka settings object me wahi value aati hai (mapping toot na jaye).
 *  2. "header fix" — WhatsApp link khaali number par `wa.me/` (dead link) na bane,
 *     aur announcement strip English rahe.
 *  3. "purana brand kahin na dikhe" — catalog/reviews me purana domain na ho.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseSettingsCsv } from "../../apps/web/src/lib/sheet-format.ts";

// tsx (CJS transform) me `import.meta.dirname` undefined hota hai — tests repo root se chalte hain
const ROOT = process.cwd();

/** Owner ki sheet ka **asli** Settings tab (cols: key, value, note) CSV ki tarah. */
const OWNER_SHEET_CSV = [
  "key,value,note",
  'support_phone,9876543211,"DEMO — apna asli number daaliye (10 digit)"',
  "whatsapp,9876543211,DEMO — apna asli WhatsApp number",
  "support_email,,site par dikhta nahi (internal record)",
  "upi_id,noore@upi,\"DEMO — apni asli UPI ID daaliye, warna paisa kisi aur ko jayega\"",
  "upi_name,Noor Ethnic Wear,UPI app me yahi naam dikhega",
  "announcement,Diwali Sale — Up to 75% OFF,top bar ki line",
  "gstin,,invoice par (khaali = nahi dikhta)",
  "order_prefix,NE,order number NE-XXXX",
  "support_hours,Mon–Sat, 10 AM – 8 PM IST,contact page",
].join("\n");

test("R42-1: sheet ki Settings row site ke settings me bilkul wahi number/UPI deti hai", () => {
  const settings = parseSettingsCsv(OWNER_SHEET_CSV);
  assert.ok(settings, "settings parse honi chahiye");
  assert.equal(settings?.supportPhone, "9876543211");
  assert.equal(settings?.whatsapp, "9876543211");
  assert.equal(settings?.upiId, "noore@upi");
  assert.equal(settings?.upiName, "Noor Ethnic Wear");
  assert.equal(settings?.announcement, "Diwali Sale — Up to 75% OFF");
});

test("R42-2: sheet me value badalte hi parse bhi badalta hai (koi cache/code change nahi)", () => {
  const before = parseSettingsCsv("key,value\nsupport_phone,9876543210\nupi_id,old@upi\n");
  const after = parseSettingsCsv("key,value\nsupport_phone,9876543211\nupi_id,noore@upi\n");
  assert.equal(before?.supportPhone, "9876543210");
  assert.equal(after?.supportPhone, "9876543211");
  assert.equal(before?.upiId, "old@upi");
  assert.equal(after?.upiId, "noore@upi");
});

test("R42-3: khaali cell purani/default value ko overwrite nahi karta", () => {
  const settings = parseSettingsCsv("key,value\nupi_id,\nannouncement,\n");
  assert.equal(settings?.upiId ?? "", "", "khaali UPI = khaali (koi hardcoded payee nahi)");
  assert.equal(settings?.announcement ?? "", "");
});

/** Dead link guard: `wa.me/${whatsappNumber(...)}` sirf validated number par. */
const COMPONENTS = [
  "apps/web/src/components/site-header.tsx",
  "apps/web/src/components/site-footer.tsx",
  "apps/web/src/components/whatsapp-fab.tsx",
];

test("R42-4: WhatsApp link raw `whatsapp` setting se nahi banta (dead wa.me/ se bachne ke liye)", () => {
  for (const file of COMPONENTS) {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.ok(
      source.includes("contactNumber"),
      `${file}: contactNumber (whatsapp || supportPhone) se link banna chahiye`,
    );
    assert.ok(
      !/wa\.me\/\$\{whatsappNumber\(whatsapp\.replace/.test(source),
      `${file}: khaali number par wa.me/ dead link ban jaata hai`,
    );
  }
});

test("R42-5: header ki fallback announcements English hain (Hinglish nahi)", () => {
  const source = fs.readFileSync(path.join(ROOT, "apps/web/src/components/site-header.tsx"), "utf8");
  const block = source.slice(source.indexOf("const defaultAnnouncements"), source.indexOf("];", source.indexOf("const defaultAnnouncements")));
  assert.ok(block.length > 20, "defaultAnnouncements milna chahiye");
  for (const hinglish of [" se ", "kariye", "daaliye", "par ", "nahi"]) {
    assert.ok(!block.includes(hinglish), `announcement me Hinglish text: "${hinglish}"`);
  }
});

test("R42-6: purana brand (likshaclothing) kahin nahi — catalog ka source live store hai", () => {
  const files = [
    "apps/web/src/data/catalog.json",
    "apps/admin/src/data/catalog.json",
    "database/seeds/catalog.json",
    "database/seeds/live/products.json",
    "database/seeds/live/collections.json",
    "database/seeds/live/membership.json",
    "apps/web/src/data/reviews.json",
  ];
  for (const file of files) {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    assert.ok(!/likshaclothing/i.test(text), `${file}: purana brand naam mila`);
  }
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/web/src/data/catalog.json"), "utf8")) as {
    meta?: { source?: string; store?: string };
  };
  assert.equal(catalog.meta?.source, "https://noorethnicwear.in");
  assert.ok(!/liksha/i.test(catalog.meta?.store ?? ""), "meta.store me purana brand");
});

test("R42-7: admin login sirf password se nahi — email bhi env se aata hai (koi brand email code me nahi)", () => {
  const source = fs.readFileSync(path.join(ROOT, "apps/admin/src/lib/auth.ts"), "utf8");
  assert.ok(source.includes("process.env.ADMIN_EMAIL"), "email env se aana chahiye");
  assert.ok(!/@noorethnicwear\.(in|com)\b/.test(source.replace(/\/\*[\s\S]*?\*\//g, "")), "code me brand email hardcoded hai");
});

test("R42-8: hero kabhi crop na kare (contain) aur free-shipping copy na ho", () => {
  const css = fs.readFileSync(path.join(ROOT, "apps/web/src/app/globals.css"), "utf8");
  const heroBlock = css.slice(css.indexOf(".hero-media"));
  assert.ok(/object-fit:\s*contain/.test(heroBlock), "hero par object-fit: contain chahiye");
  assert.ok(!/object-fit:\s*cover/.test(heroBlock), "hero par cover = crop (owner ne mana kiya)");
});
