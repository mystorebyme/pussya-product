import { randomUUID } from "node:crypto";
import type { Order, OrderStatus } from "@noor/types";
import {
  COD_FEE,
  COD_MAX_SUBTOTAL,
  canTransition,
  computeDiscount,
  generateOrderNumber,
  type CreateOrderInput,
} from "@noor/validation";
import { catalog, readRows, writeRows } from "../../config/data";
import { HttpError } from "../../middlewares/error.middleware";
import { ERROR_CODES } from "../../constants";

const FILE = "orders.json";

export function listOrders(status?: string): Order[] {
  const rows = readRows<Order>(FILE);
  return status ? rows.filter((order) => order.status === status) : rows;
}

export function findByNumber(orderNumberValue: string): Order | undefined {
  return readRows<Order>(FILE).find((order) => order.orderNumber === orderNumberValue);
}

export function create(input: CreateOrderInput): Order {
  const products = catalog().products;

  const items = input.items.map((line) => {
    const product = products.find((candidate) => candidate.handle === line.handle);
    if (!product) throw new HttpError(400, `Product not found: ${line.handle}`, ERROR_CODES.validation);
    if (!product.sizes.includes(line.size)) {
      throw new HttpError(
        400,
        `Size "${line.size}" not available for ${product.handle}. Options: ${product.sizes.join(", ")}`,
        ERROR_CODES.validation,
      );
    }
    const size = line.size;
    return {
      handle: product.handle,
      title: product.title,
      image: product.images[0] ?? "",
      size,
      quantity: line.quantity,
      price: product.price,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  if (input.paymentMethod === "cod" && subtotal > COD_MAX_SUBTOTAL) {
    throw new HttpError(400, "COD is only available under Rs. 3,500", ERROR_CODES.codNotAllowed);
  }
  const discount = computeDiscount(subtotal, input.couponCode ?? null);
  const total = Math.max(0, subtotal - discount + (input.paymentMethod === "cod" ? COD_FEE : 0));
  const now = new Date().toISOString();

  const order: Order = {
    id: randomUUID(),
    orderNumber: generateOrderNumber(),
    createdAt: now,
    customerName: input.customerName,
    email: input.email,
    phone: input.phone,
    address: input.address,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    notes: input.notes ?? null,
    items,
    subtotal,
    discount,
    shipping: 0,
    total,
    couponCode: input.couponCode ?? null,
    paymentMethod: input.paymentMethod,
    paymentStatus: input.paymentMethod === "cod" ? "cod" : "pending",
    status: "placed",
    audit: [{ at: now, actor: "customer", action: "order.placed" }],
  };

  const rows = readRows<Order>(FILE);
  rows.unshift(order);
  writeRows(FILE, rows);
  return order;
}

export function updateStatus(orderNumberValue: string, status: OrderStatus, actor: string, note?: string) {
  const rows = readRows<Order>(FILE);
  const index = rows.findIndex((order) => order.orderNumber === orderNumberValue);
  if (index === -1) throw new HttpError(404, "Order not found", ERROR_CODES.notFound);
  const current = rows[index]!;
  if (!canTransition(current.status, status)) {
    throw new HttpError(
      409,
      `Invalid transition: ${current.status} -> ${status}`,
      ERROR_CODES.invalidTransition,
    );
  }
  rows[index] = {
    ...current,
    status,
    audit: [
      { at: new Date().toISOString(), actor, action: `order.status.${status}`, meta: note ? { note } : undefined },
      ...current.audit,
    ],
  };
  writeRows(FILE, rows);
  return rows[index]!;
}

export function markPaid(orderNumberValue: string, reference: string) {
  const rows = readRows<Order>(FILE);
  const index = rows.findIndex((order) => order.orderNumber === orderNumberValue);
  if (index === -1) return undefined;
  const current = rows[index]!;
  rows[index] = {
    ...current,
    paymentStatus: "paid",
    status: current.status === "placed" ? "confirmed" : current.status,
    audit: [
      { at: new Date().toISOString(), actor: "webhook", action: "payment.paid", meta: { reference } },
      ...current.audit,
    ],
  };
  writeRows(FILE, rows);
  return rows[index];
}

export function stats() {
  const orders = listOrders();
  const paid = orders.filter((order) => order.paymentStatus === "paid" || order.paymentStatus === "cod");
  return {
    orders: orders.length,
    revenue: paid.reduce((sum, order) => sum + order.total, 0),
    pending: orders.filter((order) => order.status === "placed").length,
    shipped: orders.filter((order) => order.status === "shipped").length,
    delivered: orders.filter((order) => order.status === "delivered").length,
    averageOrderValue: paid.length ? Math.round(paid.reduce((sum, order) => sum + order.total, 0) / paid.length) : 0,
  };
}
