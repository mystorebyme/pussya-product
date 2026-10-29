# Request / response examples

## GET /products?collection=lehnga-choli&perPage=2

```json
{
  "data": [
    {
      "handle": "saniya-s-wine-gown",
      "title": "Saniya's Wine Gown",
      "productType": "Lehenga",
      "price": 299900,
      "compareAtPrice": 599900,
      "sizes": ["XS [34]", "S [36]", "M [38]", "L [40]", "XL [42]", "2XL [44]", "3XL [46]"],
      "images": ["https://cdn.shopify.com/…"],
      "collections": ["lehnga-choli", "new-arrivals"]
    }
  ],
  "page": 1, "perPage": 2, "total": 23, "totalPages": 12
}
```

## POST /orders (201)

```json
{
  "data": {
    "orderNumber": "NE-05K05TGG",
    "status": "placed",
    "paymentMethod": "cod",
    "paymentStatus": "cod",
    "subtotal": 251910,
    "discount": 25191,
    "shipping": 0,
    "total": 231719,
    "createdAt": "2026-10-24T06:10:51.078Z"
  }
}
```

Same request, same `Idempotency-Key` → `200` with same `orderNumber`.

## POST /orders (400 COD over the limit)

```json
{ "error": { "code": "COD_NOT_ALLOWED",
             "message": "COD is only available under Rs. 3,500" } }
```

## POST /orders (400 unknown size)

```json
{ "error": { "code": "VALIDATION_ERROR",
             "message": "Size \"ZZ [99]\" not available for saniya-s-wine-gown. Options: XS [34], S [36], …" } }
```

## GET /orders/NE-05K05TGG

```json
{
  "data": {
    "orderNumber": "NE-05K05TGG",
    "status": "confirmed",
    "timeline": [
      { "status": "placed", "at": "2026-10-24T06:10:51.078Z" },
      { "status": "confirmed", "at": "2026-10-24T07:02:11.000Z" }
    ],
    "items": [{ "handle": "…", "title": "…", "size": "M [38]", "quantity": 1, "price": 251910 }],
    "total": 231719
  }
}
```

## Webhook (200)

```json
{ "ok": true, "event": "payment_link.paid", "duplicate": false }
```

## Health

```json
{ "data": { "status": "ok", "service": "noor-api", "products": 287, "uptime": 107,
            "time": "2026-10-24T06:24:00.676Z" } }
```

## Errors

`400` validation → `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": { "fields": { "pincode": ["…"] } } } }`.
