# Sequence diagrams

## 1. Place order (COD)

```
Customer        CheckoutForm        /api/orders          orders.ts         .data/orders.json
   │  submit ──────►│                    │                   │                    │
   │               │ POST + Idem-Key ──►│                   │                    │
   │               │                    │ zod validate ─────►│                    │
   │               │                    │ lookup product     │                    │
   │               │                    │ recompute total    │                    │
   │               │                    │ createOrder ──────►│                    │
   │               │                    │                    │ atomic write ─────►│
   │               │◄── 201 orderNumber │◄───────────────────│                    │
   │◄── redirect ──│                    │                   │                    │
```

## 2. Webhook payment

```
Razorpay         /api/webhooks/razorpay       orders.ts             email queue
   │  POST raw ─────►│                              │                     │
   │                 │ HMAC verify (fail → 401)     │                     │
   │                 │ event-id dedupe               │                     │
   │                 │ markPaymentPaid ─────────────►│                     │
   │◄── 200 {ok} ────│                              │                     │
   │                 │ enqueue(email) ──────────────┼────────────────────►│
```

## 3. Admin status update

```
Owner    /orders/[id] form    server action         data.ts           audit + orders.json
  │  submit ──►│                   │                   │                    │
  │            │ action(data) ─────►│                   │                    │
  │            │                   │ updateOrderStatus ►│                    │
  │            │                   │ appendAudit ──────►│                    │
  │            │                   │ revalidatePath    │                    │
  │◄── UI refresh (status + audit trail)              │                    │
```

## 4. Search

```
Customer types → debounce 220ms → GET /api/search?q= → store.searchProducts() → 8 hits
                → click → /products/[handle] (static page)
```
