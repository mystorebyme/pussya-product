import test from "node:test";
import assert from "node:assert/strict";
import { RAILS, railPool } from "../../apps/web/src/lib/rails.ts";
import {
  ROTATION_MS,
  compactProduct,
  msUntilNextBucket,
  rotatePick,
  rotationBucket,
} from "../../apps/web/src/lib/rotation.ts";

/**
 * Home rail rotation — client ki requirement: items har 10 minute me badlein,
 * aur poora catalogue samay ke saath home par aaye.
 */

test("rotation window 10 minute ka hai", () => {
  assert.equal(ROTATION_MS, 10 * 60 * 1000);
  const start = 1_000_000 * ROTATION_MS;
  assert.equal(rotationBucket(start), 1_000_000);
  assert.equal(rotationBucket(start + ROTATION_MS - 1), 1_000_000);
  assert.equal(rotationBucket(start + ROTATION_MS), 1_000_001);
  assert.equal(msUntilNextBucket(start + 60_000), ROTATION_MS - 60_000);
});

test("same bucket par same picks (SSR aur client match)", () => {
  const items = Array.from({ length: 50 }, (_, index) => `p${index}`);
  const a = rotatePick(items, "trendy:100", 8);
  const b = rotatePick(items, "trendy:100", 8);
  assert.deepEqual(a, b);
  assert.equal(a.length, 8);
  assert.equal(new Set(a).size, 8, "ek hi window me duplicate nahi");
});

test("agle bucket par set badal jaata hai", () => {
  const items = Array.from({ length: 50 }, (_, index) => `p${index}`);
  const first = new Set(rotatePick(items, "trendy:100", 8));
  const second = rotatePick(items, "trendy:101", 8);
  assert.ok(second.some((item) => !first.has(item)), "naye window me naye items");
});

test("samay ke saath poora catalogue cover hota hai", () => {
  const items = Array.from({ length: 40 }, (_, index) => `p${index}`);
  const seen = new Set<string>();
  for (let bucket = 0; bucket < 60; bucket += 1) {
    for (const item of rotatePick(items, `explore:${bucket}`, 8)) seen.add(item);
  }
  assert.equal(seen.size, items.length, "har product ko home par aane ka mauka milta hai");
});

test("har rail ka pool sahi collections se aata hai", () => {
  const products = [
    { handle: "a", collections: ["trending"] },
    { handle: "b", collections: ["lehnga-choli"] },
    { handle: "c", collections: [] },
  ] as unknown as Parameters<typeof railPool>[1];
  assert.deepEqual(
    railPool("trendy", products).map((product: { handle: string }) => product.handle),
    ["a"],
  );
  assert.deepEqual(
    railPool("lehnga", products).map((product: { handle: string }) => product.handle),
    ["b"],
  );
  assert.equal(railPool("explore", products).length, 3, "explore rail poora catalogue");
  assert.ok(RAILS.explore.title.length > 0);
});

test("compactProduct sirf card ke liye zaroori fields bhejta hai", () => {
  const product = {
    handle: "h",
    sourceHandle: "h",
    title: "T",
    price: 100,
    compareAtPrice: null,
    images: ["1", "2", "3", "4"],
    collections: ["trending"],
    category: "Anarkali suit",
    fabric: "Silk",
    color: "Red",
    sizes: ["M"],
    details: ["x"],
    description: "long text",
    descriptionHtml: "<p>big html</p>",
    rating: 5,
    reviewCount: 3,
    inStock: true,
    featured: true,
  };
  const compact = compactProduct(product as never);
  assert.equal(compact.images.length, 2);
  assert.equal(compact.descriptionHtml, undefined);
  assert.equal(compact.description, "");
  assert.deepEqual(compact.details, []);
});
