import test from "node:test";
import assert from "node:assert/strict";
import "../helpers/search-env.ts";
import {
  catalogMeta,
  findProduct,
  listProducts,
} from "../../apps/api/src/modules/products/products.service.ts";

test("search finds anarkali styles by word", () => {
  const { items, total } = listProducts({ q: "anarkali", perPage: 10 });
  assert.ok(total > 50, `expected many anarkali hits, got ${total}`);
  assert.equal(items.length, 10);
});

test("search is case-insensitive and multi-word AND", () => {
  const { total } = listProducts({ q: "SILK anarkali", perPage: 5 });
  assert.ok(total > 0);
});

test("search with no match returns empty, not an error", () => {
  const { items, total } = listProducts({ q: "zzzz-not-a-product", perPage: 10 });
  assert.equal(total, 0);
  assert.deepEqual(items, []);
});

test("collection filter narrows results", () => {
  const lehnga = listProducts({ collection: "lehnga-choli", perPage: 200 });
  // live store ke lehnga-choli (22) + extra-store merge ke baad kam se kam 22
  assert.ok(lehnga.total >= 22, `only ${lehnga.total} lehnga products`);
  for (const item of lehnga.items) assert.ok(item.collections.includes("lehnga-choli"));
});

test("price sorting works both ways", () => {
  const low = listProducts({ sort: "price-low", perPage: 3 });
  const high = listProducts({ sort: "price-high", perPage: 3 });
  assert.ok(low.items[0]!.price <= low.items[1]!.price);
  assert.ok(high.items[0]!.price >= high.items[1]!.price);
  assert.ok(low.items[0]!.price < high.items[0]!.price);
});

test("pagination slices without dropping the total", () => {
  const page1 = listProducts({ page: 1, perPage: 24 });
  const page2 = listProducts({ page: 2, perPage: 24 });
  assert.ok(page1.total >= 287, `only ${page1.total} products`);
  assert.equal(page1.items.length, 24);
  assert.notEqual(page1.items[0]!.handle, page2.items[0]!.handle);
});

test("unknown handle returns undefined", () => {
  assert.equal(findProduct("definitely-not-real"), undefined);
});

test("catalogue meta reports the live store", () => {
  const meta = catalogMeta();
  assert.ok(meta.productCount >= 287);
  assert.equal(meta.liveProductCount, 287);
  assert.equal(meta.source, "https://noorethnicwear.in");
  assert.equal(meta.moneyUnit, "paise");
});
