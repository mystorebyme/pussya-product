import "server-only";

import type { AuditEntry, InvoiceMeta, Order, OrderItem, PaymentRecord, Tracking } from "@noor/types";
import { withTransaction } from "./db";

/**
 * Order store ka Postgres backend.
 *
 * Design: `database/schema.sql` ke normalized tables hi use hote hain — order,
 * items, shipment, payment, invoice. JSON file wala store fallback hai (dev/test).
 *
 * Reads hamesha DB se aate hain (admin/customer ko stale data na mile), writes
 * me sirf badle hue orders upsert hote hain, isliye har status change par poori
 * table rewrite nahi hoti.
 */

type Row = {
  id: string;
  order_number: string;
  created_at: Date;
  customer_name: string;
  email: string;
  phone: string;
  shipping_address: { line1?: string; city?: string; state?: string; pincode?: string } | null;
  notes: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon_code: string | null;
  payment_method: string;
  payment_status: string;
  status: string;
  status_note: Order["statusNote"] | null;
  audit: AuditEntry[] | null;
  items: OrderItem[] | null;
  shipment: (Omit<Tracking, "deliveredAt"> & { deliveredAt: string | null }) | null;
  payment: {
    gateway: string | null;
    reference: string | null;
    amount: number;
    status: string;
    createdAt: string;
    verifiedAt: string | null;
    verifiedBy: string | null;
    failureReason: string | null;
  } | null;
  invoice: {
    number: string;
    issuedAt: string;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    placeOfSupply: string;
  } | null;
};

const iso = (value: Date | string | null | undefined) =>
  value ? (value instanceof Date ? value.toISOString() : new Date(value).toISOString()) : null;

const ORDER_SELECT = `
  select o.id, o.order_number, o.created_at, o.customer_name, o.email, o.phone,
         o.shipping_address, o.notes, o.subtotal, o.discount, o.shipping, o.total,
         o.coupon_code, o.payment_method::text as payment_method,
         o.payment_status::text as payment_status, o.status::text as status,
         o.status_note, coalesce(o.audit, '[]'::jsonb) as audit,
         coalesce((
           select json_agg(json_build_object(
             'handle', i.handle, 'title', i.title, 'image', coalesce(i.image_url, ''),
             'size', i.size, 'quantity', i.quantity, 'price', i.unit_price) order by i.id)
           from order_items i where i.order_id = o.id), '[]'::json) as items,
         (
           select json_build_object(
             'courier', s.courier, 'awb', s.awb, 'url', s.tracking_url,
             'shippedAt', s.shipped_at, 'deliveredAt', s.delivered_at,
             'updatedAt', s.updated_at, 'updatedBy', s.updated_by)
           from shipments s where s.order_id = o.id order by s.updated_at desc limit 1) as shipment,
         (
           select json_build_object(
             'gateway', p.provider, 'reference', p.gateway_payment_id, 'amount', p.amount,
             'status', p.status::text, 'createdAt', p.created_at, 'verifiedAt', p.verified_at,
             'verifiedBy', p.verified_by, 'failureReason', p.failure_reason)
           from payments p where p.order_id = o.id order by p.created_at desc limit 1) as payment,
         (
           select json_build_object(
             'number', v.number, 'issuedAt', v.issued_at, 'taxableValue', v.taxable_value,
             'cgst', v.cgst, 'sgst', v.sgst, 'igst', v.igst, 'placeOfSupply', v.place_of_supply)
           from invoices v where v.order_id = o.id order by v.issued_at desc limit 1) as invoice
  from orders o
`;

function toOrder(row: Row): Order {
  const address = row.shipping_address ?? {};
  return {
    id: row.id,
    orderNumber: row.order_number,
    createdAt: iso(row.created_at) ?? new Date().toISOString(),
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    address: address.line1 ?? "",
    city: address.city ?? "",
    state: address.state ?? "",
    pincode: address.pincode ?? "",
    notes: row.notes,
    items: (row.items ?? []) as OrderItem[],
    subtotal: row.subtotal,
    discount: row.discount,
    shipping: row.shipping,
    total: row.total,
    couponCode: row.coupon_code,
    paymentMethod: row.payment_method as Order["paymentMethod"],
    paymentStatus: row.payment_status as Order["paymentStatus"],
    payment: row.payment
      ? ({
          ...row.payment,
          createdAt: iso(row.payment.createdAt) ?? new Date().toISOString(),
          verifiedAt: iso(row.payment.verifiedAt),
        } as PaymentRecord)
      : null,
    status: row.status as Order["status"],
    statusNote: row.status_note ?? null,
    tracking: row.shipment
      ? {
          courier: row.shipment.courier ?? null,
          awb: row.shipment.awb ?? null,
          url: row.shipment.url ?? null,
          shippedAt: iso(row.shipment.shippedAt),
          deliveredAt: iso(row.shipment.deliveredAt),
          updatedAt: iso(row.shipment.updatedAt) ?? new Date().toISOString(),
          updatedBy: row.shipment.updatedBy ?? "system",
        }
      : null,
    invoice: row.invoice
      ? ({
          number: row.invoice.number,
          issuedAt: iso(row.invoice.issuedAt) ?? new Date().toISOString(),
          taxableValue: row.invoice.taxableValue,
          cgst: row.invoice.cgst,
          sgst: row.invoice.sgst,
          igst: row.invoice.igst,
          gstRate: 0,
          hsn: process.env.GST_HSN ?? "6204",
          placeOfSupply: row.invoice.placeOfSupply,
        } satisfies InvoiceMeta)
      : null,
    audit: (row.audit ?? []) as AuditEntry[],
  };
}

/** Poora order ledger, newest first. */
export async function loadOrders(): Promise<Order[]> {
  const { query } = await import("./db");
  const rows = await query<Row>(`${ORDER_SELECT} order by o.created_at desc`);
  return rows.map(toOrder);
}

export async function loadOrder(orderNumber: string): Promise<Order | undefined> {
  const { query } = await import("./db");
  const rows = await query<Row>(`${ORDER_SELECT} where o.order_number = $1 limit 1`, [orderNumber]);
  return rows[0] ? toOrder(rows[0]) : undefined;
}

type WritableOrder = Order & { idempotencyKey?: string | null };

async function upsertOrder(client: import("pg").PoolClient, order: WritableOrder): Promise<void> {
  await client.query(
    `insert into orders (id, order_number, customer_name, email, phone, shipping_address, notes,
                         subtotal, discount, shipping, total, coupon_code, payment_method,
                         payment_status, status, audit, idempotency_key, created_at, updated_at, status_note)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::payment_method,$14::payment_status,
             $15::order_status,$16::jsonb,$17,$18,now(),$19::jsonb)
     on conflict (order_number) do update set
       customer_name = excluded.customer_name,
       email = excluded.email,
       phone = excluded.phone,
       shipping_address = excluded.shipping_address,
       notes = excluded.notes,
       subtotal = excluded.subtotal,
       discount = excluded.discount,
       shipping = excluded.shipping,
       total = excluded.total,
       coupon_code = excluded.coupon_code,
       payment_method = excluded.payment_method,
       payment_status = excluded.payment_status,
       status = excluded.status,
       audit = excluded.audit,
       status_note = excluded.status_note,
       idempotency_key = coalesce(excluded.idempotency_key, orders.idempotency_key),
       updated_at = now()`,
    [
      order.id,
      order.orderNumber,
      order.customerName,
      order.email,
      order.phone,
      { line1: order.address, city: order.city, state: order.state, pincode: order.pincode },
      order.notes,
      order.subtotal,
      order.discount,
      order.shipping,
      order.total,
      order.couponCode,
      order.paymentMethod,
      order.paymentStatus,
      order.status,
      JSON.stringify(order.audit ?? []),
      order.idempotencyKey ?? null,
      order.createdAt,
      order.statusNote ? JSON.stringify(order.statusNote) : null,
    ],
  );

  await client.query("delete from order_items where order_id = $1", [order.id]);
  for (const item of order.items) {
    await client.query(
      `insert into order_items (order_id, handle, title, image_url, size, quantity, unit_price, line_total)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [order.id, item.handle, item.title, item.image, item.size, item.quantity, item.price, item.price * item.quantity],
    );
  }

  await client.query("delete from shipments where order_id = $1", [order.id]);
  if (order.tracking) {
    await client.query(
      `insert into shipments (order_id, courier, awb, tracking_url, shipped_at, delivered_at, updated_by, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        order.id,
        order.tracking.courier,
        order.tracking.awb,
        order.tracking.url,
        order.tracking.shippedAt,
        order.tracking.deliveredAt,
        order.tracking.updatedBy,
        order.tracking.updatedAt,
      ],
    );
  }

  await client.query("delete from payments where order_id = $1", [order.id]);
  if (order.payment) {
    await client.query(
      `insert into payments (order_id, provider, gateway_payment_id, amount, status, failure_reason,
                             verified_by, verified_at, created_at, updated_at)
       values ($1,$2,$3,$4,$5::payment_status,$6,$7,$8,$9,now())`,
      [
        order.id,
        order.payment.gateway ?? "manual-upi",
        order.payment.reference,
        order.payment.amount,
        order.payment.status === "cod" ? "pending" : order.payment.status,
        order.payment.failureReason,
        order.payment.verifiedBy,
        order.payment.verifiedAt,
        order.payment.createdAt,
      ],
    );
  }

  await client.query("delete from invoices where order_id = $1", [order.id]);
  if (order.invoice) {
    await client.query(
      `insert into invoices (number, kind, order_id, customer_name, phone, email, billing_address,
                             place_of_supply, taxable_value, cgst, sgst, igst, total, issued_at)
       values ($1,'order',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (number) do update set order_id = excluded.order_id, issued_at = excluded.issued_at`,
      [
        order.invoice.number,
        order.id,
        order.customerName,
        order.phone,
        order.email,
        { line1: order.address, city: order.city, state: order.state, pincode: order.pincode },
        order.invoice.placeOfSupply,
        order.invoice.taxableValue,
        order.invoice.cgst,
        order.invoice.sgst,
        order.invoice.igst,
        order.total,
        order.invoice.issuedAt,
      ],
    );
  }
}

/**
 * Sirf badle hue orders likhta hai. `snapshot` read ke waqt ka JSON hai — isse
 * har status change par poora ledger rewrite nahi hota.
 */
export async function saveOrders(snapshot: Map<string, string>, next: Order[]): Promise<void> {
  const changed = next.filter((order) => snapshot.get(order.orderNumber) !== JSON.stringify(order));
  if (!changed.length) return;
  await withTransaction(async (client) => {
    for (const order of changed) await upsertOrder(client, order as WritableOrder);
  });
}

/** Purana JSON store Postgres me ek baar migrate karne ke liye. */
export async function importOrders(orders: Order[]): Promise<number> {
  if (!orders.length) return 0;
  await withTransaction(async (client) => {
    for (const order of orders) await upsertOrder(client, order as WritableOrder);
  });
  return orders.length;
}
