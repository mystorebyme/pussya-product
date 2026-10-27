import test from "node:test";
import assert from "node:assert/strict";
import { issuePhoneToken, readPhoneToken } from "../../apps/web/src/lib/phone-token.ts";

test("phone token round-trips and carries the normalised number", () => {
  const token = issuePhoneToken("+91 98765 43210");
  const parsed = readPhoneToken(token);
  assert.equal(parsed?.phone, "9876543210");
});

test("tampered or expired tokens are rejected", () => {
  const token = issuePhoneToken("9876543210");
  const [payload, signature] = token.split(".");
  const forged = `${payload}.${signature!.slice(0, -2)}aa`;
  assert.equal(readPhoneToken(forged), null);
  assert.equal(readPhoneToken(issuePhoneToken("9876543210", -1)), null);
  assert.equal(readPhoneToken(undefined), null);
  assert.equal(readPhoneToken("not-a-token"), null);
});
