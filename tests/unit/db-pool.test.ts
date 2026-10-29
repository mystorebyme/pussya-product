/**
 * DB pool regression (R22) — production me order page / UTR submit 500 ka asli
 * reason: serverless par har instance 5 connections kholta tha, Supabase ka
 * session pooler sirf ~15 deta hai → `EMAXCONNSESSION max clients reached`.
 *
 * Guards:
 *   • serverless (VERCEL) par pool chhota (1) + idle par release
 *   • transient pooler errors par ek chhota retry (user ko 500 na dikhe)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const db = fs.readFileSync(path.join(process.cwd(), "apps/web/src/lib/db.ts"), "utf8");

test("serverless par pool chhota hai (pooler limit ke andar)", () => {
  assert.match(db, /IS_SERVERLESS/);
  assert.match(db, /max: POOL_MAX/);
  assert.match(db, /IS_SERVERLESS \? 1 : 5/);
  assert.match(db, /allowExitOnIdle: IS_SERVERLESS/);
});

test("pooler ke transient errors retry hote hain", () => {
  assert.match(db, /EMAXCONNSESSION/);
  assert.match(db, /withDbRetry/);
  assert.match(db, /withDbRetry\(\(\) => getPool\(\)\.query/);
  assert.match(db, /return withDbRetry\(async \(\) => \{/);
});
