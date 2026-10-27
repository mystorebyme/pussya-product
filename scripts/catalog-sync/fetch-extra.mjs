#!/usr/bin/env node
/**
 * Extra catalogue sync — thestoreofbufani.com
 *
 * User ne kaha: noor ke products ke saath extra collections bhi add karo
 * (saree chhod ke). Store Shopify par hai, isliye public JSON endpoints use hote hain.
 *
 * GitHub Actions me roz chalta hai aur seeds commit karta hai:
 *   database/seeds/extra/{collections,products,membership}.json
 *
 * Ek bhi cheez fail ho to purana seed waisa hi rehta hai (site kabhi khaali nahi hoti).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const OUT = path.join(ROOT, "database/seeds/extra");
const STORE = process.env.EXTRA_STORE_URL ?? "https://www.thestoreofbufani.com";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
/** user ne saree nahi chahiye kaha */
const SKIP = /(saree|sari|sarees)/i;

const diagnostics = { store: STORE, at: new Date().toISOString(), steps: [], errors: [] };

async function getJson(url) {
  const response = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function main() {
  const collectionsPayload = await getJson(`${STORE}/collections.json?limit=250`);
  const allCollections = (collectionsPayload.collections ?? []).filter(
    (collection) => !SKIP.test(collection.handle) && !SKIP.test(collection.title ?? ""),
  );
  diagnostics.steps.push(`collections: ${allCollections.length} (saree skipped)`);

  const products = new Map();
  const membership = {};

  for (const collection of allCollections) {
    const handles = [];
    for (let page = 1; page <= 10; page += 1) {
      let payload;
      try {
        payload = await getJson(`${STORE}/collections/${collection.handle}/products.json?limit=250&page=${page}`);
      } catch (error) {
        diagnostics.errors.push(`${collection.handle} p${page}: ${error.message.slice(0, 80)}`);
        break;
      }
      const list = payload.products ?? [];
      if (!list.length) break;
      for (const product of list) {
        if (SKIP.test(product.handle) || SKIP.test(product.title ?? "")) continue;
        if (!product.handle || !product.title) continue;
        const images = (product.images ?? []).filter((image) => image?.src);
        if (!images.length) continue;
        products.set(product.handle, {
          id: product.id,
          title: product.title,
          handle: product.handle,
          body_html: product.body_html ?? "",
          published_at: product.published_at ?? null,
          created_at: product.created_at ?? null,
          vendor: product.vendor ?? "",
          product_type: product.product_type ?? "",
          tags: product.tags ?? [],
          variants: (product.variants ?? []).map((variant) => ({
            option1: variant.option1 ?? variant.title ?? null,
            price: variant.price,
            compare_at_price: variant.compare_at_price ?? null,
            available: Boolean(variant.available),
            sku: variant.sku ?? null,
            image: variant.image ?? null,
          })),
          images: images.map((image) => ({ id: image.id ?? null, src: image.src, alt: image.alt ?? null })),
        });
        handles.push(product.handle);
      }
      if (list.length < 250) break;
    }
    if (handles.length) membership[collection.handle] = handles;
  }

  diagnostics.steps.push(`products: ${products.size}`);

  if (!products.size) {
    diagnostics.errors.push("koi product nahi mila — purana seed waisa hi rahega");
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "last-sync.json"), `${JSON.stringify(diagnostics, null, 1)}\n`);
    console.warn("extra catalogue: kuch nahi mila");
    return;
  }

  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, payload) =>
    fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(payload, null, 1)}\n`);

  write("products.json", { fetchedAt: diagnostics.at, origin: STORE, products: [...products.values()] });
  write("collections.json", {
    fetchedAt: diagnostics.at,
    origin: STORE,
    collections: allCollections
      .filter((collection) => membership[collection.handle]?.length)
      .map((collection) => ({
        handle: collection.handle,
        title: collection.title ?? collection.handle,
        description: String(collection.description ?? "").replace(/<[^>]+>/g, " ").trim().slice(0, 200),
        published_at: collection.published_at ?? null,
      })),
  });
  write("membership.json", { fetchedAt: diagnostics.at, collections: membership });
  write("last-sync.json", diagnostics);
  console.log(`extra catalogue saved: ${products.size} products / ${Object.keys(membership).length} collections`);
}

await main().catch((error) => {
  console.warn("extra catalogue sync failed (non-fatal):", error.message);
  try {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(
      path.join(OUT, "last-sync.json"),
      `${JSON.stringify({ ...diagnostics, fatal: error.message }, null, 1)}\n`,
    );
  } catch {
    /* ignore */
  }
});
