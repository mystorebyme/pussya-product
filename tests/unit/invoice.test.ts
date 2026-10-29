import test from "node:test";
import assert from "node:assert/strict";
import {
  GST_SERVICE_RATE,
  INVOICE_NUMBER_PATTERN,
  apparelGstRate,
  financialYear,
  invoiceNumber,
  splitTax,
} from "@noor/validation";

test("apparel GST: 5% up to Rs. 2,500, 18% above", () => {
  assert.equal(apparelGstRate(149_900), 5);
  assert.equal(apparelGstRate(250_000), 5);
  assert.equal(apparelGstRate(250_100), 18);
  assert.equal(apparelGstRate(499_900), 18);
});

test("tax split never loses a paisa (inclusive prices)", () => {
  for (const gross of [149_900, 250_000, 299_900, 499_900, 5_000, 1]) {
    for (const rate of [5, 18]) {
      const split = splitTax(gross, rate);
      assert.equal(split.taxable + split.tax, gross, `gross ${gross} @ ${rate}%`);
      assert.equal(split.cgst + split.sgst, split.tax);
    }
  }
});

test("inter-state supply uses IGST, intra-state uses CGST + SGST", () => {
  const intra = splitTax(299_900, 5, false);
  assert.equal(intra.igst, 0);
  assert.ok(intra.cgst > 0 && intra.sgst > 0);

  const inter = splitTax(299_900, 5, true);
  assert.equal(inter.cgst, 0);
  assert.equal(inter.sgst, 0);
  assert.equal(inter.igst, inter.tax);
});

test("COD charge is taxed as a service at 18%", () => {
  assert.equal(GST_SERVICE_RATE, 18);
  const split = splitTax(5_000, GST_SERVICE_RATE);
  assert.equal(split.taxable + split.tax, 5_000);
});

test("invoice number follows LK/<FY>/<serial> and the fiscal year flips in April", () => {
  assert.equal(financialYear(new Date("2026-04-01T00:00:00Z")), "2026-27");
  assert.equal(financialYear(new Date("2026-03-31T00:00:00Z")), "2025-26");
  const number = invoiceNumber(1, new Date("2026-10-24T00:00:00Z"));
  assert.equal(number, "LK/2026-27/0001");
  assert.match(number, INVOICE_NUMBER_PATTERN);
});
