import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import "../helpers/webhook-env.ts";
import { verifyWebhookSignature } from "../../apps/api/src/modules/payments/payments.service.ts";

const body = JSON.stringify({
  event: "payment_link.paid",
  payload: { payment_link: { entity: { reference_id: "NE-TEST123", status: "paid" } } },
});

function sign(payload: string, secret = "test_webhook_secret") {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

test("valid signature passes", () => {
  assert.equal(verifyWebhookSignature(body, sign(body)), true);
});

test("wrong secret fails", () => {
  assert.equal(verifyWebhookSignature(body, sign(body, "attacker-secret")), false);
});

test("tampered payload fails", () => {
  const tampered = body.replace("NE-TEST123", "NE-ATTACKER");
  assert.equal(verifyWebhookSignature(tampered, sign(body)), false);
});

test("missing or truncated signature fails without throwing", () => {
  assert.equal(verifyWebhookSignature(body, ""), false);
  assert.equal(verifyWebhookSignature(body, sign(body).slice(0, 20)), false);
});
