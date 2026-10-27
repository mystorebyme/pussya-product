#!/usr/bin/env node
/**
 * Review photos ko saaf karo — sirf **customer ki asli photo**, aur koi duplicate nahi.
 *
 * Owner ka rule (Round 13):
 *   1. Review me wo image kabhi nahi dikhni chahiye jo product ki gallery me pehle se hai.
 *   2. Ek hi photo do reviews me nahi.
 *   3. Jis product ke reviews me customer photo mili hai, wo photo usi review me rahe.
 *
 * Trustoo se `database/seeds/reviews/reviews.json` (roz sync) me customer photos
 * (`img.trustoo.io` + customer uploads) aati hain. Ye script unhe hi rakhti hai:
 * catalogue ki koi image hata di jaati hai, duplicate hata di jaati hai.
 *
 * Usage: node scripts/reviews-sync/attach-review-photos.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const CATALOG = path.join(ROOT, "database/seeds/catalog.json");

// Round 16: sample seed hata diya — sirf asli Trustoo reviews
const files = [path.join(ROOT, "database/seeds/reviews/reviews.json")];

const key = (src) => String(src).split("?")[0].replace(/\/+$/, "").toLowerCase();

const catalog = JSON.parse(fs.readFileSync(CATALOG, "utf8"));

/** product gallery ki saari images — review photo me kabhi nahi */
const productImages = new Set();
for (const product of catalog.products) {
  for (const src of product.images ?? []) productImages.add(key(src));
}

const loaded = files
  .filter((file) => fs.existsSync(file))
  .map((file) => ({ file, parsed: JSON.parse(fs.readFileSync(file, "utf8")) }));

/** dono files ke saare reviews — duplicate check poore set par */
const seen = new Set();
let removedProduct = 0;
let removedDuplicate = 0;

for (const { parsed } of loaded) {
  for (const block of Object.values(parsed.products ?? {})) {
    for (const review of block.reviews ?? []) {
      if (!review.photos?.length) continue;
      const keep = [];
      for (const photo of review.photos) {
        if (productImages.has(key(photo))) {
          removedProduct += 1;
          continue;
        }
        if (seen.has(key(photo))) {
          removedDuplicate += 1;
          continue;
        }
        seen.add(key(photo));
        keep.push(photo);
      }
      review.photos = keep;
      // review khud verified hai (Trustoo order se) — photo hatne se wo nahi badalta
    }
  }
}

for (const { file, parsed } of loaded) {
  fs.writeFileSync(file, `${JSON.stringify(parsed, null, 1)}\n`);
}

const reviews = loaded.flatMap(({ parsed }) =>
  Object.values(parsed.products ?? {}).flatMap((block) => block.reviews ?? []),
);
const withPhotos = reviews.filter((review) => review.photos?.length);
const products = loaded.flatMap(({ parsed }) =>
  Object.entries(parsed.products ?? {}).filter(([, block]) =>
    (block.reviews ?? []).some((review) => review.photos?.length),
  ),
);

console.log(`catalogue images removed: ${removedProduct}`);
console.log(`duplicate photos removed: ${removedDuplicate}`);
console.log(`total reviews: ${reviews.length}, with a real customer photo: ${withPhotos.length}`);
console.log(`unique photos: ${seen.size}`);
console.log(`products showing photo reviews: ${products.length}`);
