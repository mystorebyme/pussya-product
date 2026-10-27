-- ============================================================
-- DB-level safety. Application code bhool bhi jaye, DB rule na todne de.
-- Run: psql $DATABASE_URL -f database/sql/constraints.sql
-- ============================================================

-- 1. Stock kabhi negative na ho
ALTER TABLE "ProductVariant"
  ADD CONSTRAINT "variant_stock_non_negative" CHECK (stock >= 0),
  ADD CONSTRAINT "variant_reserved_non_negative" CHECK (reserved >= 0),
  ADD CONSTRAINT "variant_reserved_lte_stock" CHECK (reserved <= stock);

-- 2. Paisa negative na ho
ALTER TABLE "Order"
  ADD CONSTRAINT "order_totals_non_negative"
  CHECK (subtotal >= 0 AND discount >= 0 AND shipping >= 0 AND total >= 0),
  ADD CONSTRAINT "order_total_math"
  CHECK (total = subtotal - discount + shipping);

ALTER TABLE "Product"
  ADD CONSTRAINT "product_price_positive" CHECK (price > 0),
  ADD CONSTRAINT "product_mrp_gte_price" CHECK (compare_at_price IS NULL OR compare_at_price >= price);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "order_item_qty_positive" CHECK (quantity BETWEEN 1 AND 10),
  ADD CONSTRAINT "order_item_price_positive" CHECK (price > 0);

-- 3. Webhook dedupe: provider + event id unique
CREATE UNIQUE INDEX IF NOT EXISTS "webhook_event_unique"
  ON "WebhookEvent" (provider, "eventId");

-- 4. Idempotency key unique (double order nahi)
CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempt_idempotency_unique"
  ON "PaymentAttempt" ("idempotencyKey")
  WHERE "idempotencyKey" IS NOT NULL;

-- 5. Ek cart me ek variant sirf ek baar
CREATE UNIQUE INDEX IF NOT EXISTS "cart_item_unique" ON "CartItem" ("cartId", "variantId");

-- 6. Pincode valid format
ALTER TABLE "Order"
  ADD CONSTRAINT "order_pincode_format" CHECK (pincode ~ '^[1-9][0-9]{5}$');

-- 7. Rating 1..5
ALTER TABLE "Review"
  ADD CONSTRAINT "review_rating_range" CHECK (rating BETWEEN 1 AND 5);

-- 8. Order number format
ALTER TABLE "Order"
  ADD CONSTRAINT "order_number_format" CHECK ("orderNumber" ~ '^NE-[A-Z0-9]{6,12}$');

-- 9. Atomic stock decrement ka pattern (service layer me isi query ka use karein):
-- UPDATE "ProductVariant" SET stock = stock - $qty
--  WHERE id = $id AND stock >= $qty;   -- 0 rows affected => out of stock
