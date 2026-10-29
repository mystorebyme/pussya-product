"use server";

import { createAdminOrder } from "@/lib/data";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  checkCredentials,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";
import {
  appendAudit,
  createManualInvoice,
  getDelivery,
  saveDelivery,
  markMessageHandled,
  setMessageReplied,
  saveSettings,
  setOrderNote,
  setOrderTracking,
  reverseOrderPayment,
  updateOrderContact,
  updateOrderStatus,
  verifyOrderPayment,
} from "@/lib/data";
import {
  createAdminProduct,
  publishCatalog,
  saveCollectionOverride,
  saveProductOverride,
  setProductHidden,
} from "@/lib/catalog-admin";
import { requireSession } from "@/lib/session";
import type { OrderStatus } from "@noor/types";

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!checkCredentials(email, password)) {
    return { error: "Email ya password galat hai." };
  }

  const token = createSessionToken(email);
  const store = await cookies();
  const options = sessionCookieOptions();
  // "Keep me signed in" hata dein to browser band hone par session khatam (session cookie)
  const remember = String(formData.get("remember") ?? "on") !== "off";
  store.set(SESSION_COOKIE, token, remember ? options : { ...options, maxAge: undefined });

  appendAudit({ actor: email, action: "auth.login", target: "admin" });
  redirect(next.startsWith("/") ? next : "/");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

/** Website message ko "handled" mark karna (Messages page) */
export async function markMessageHandledAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const ok = await markMessageHandled(id, session.email);
  if (ok) appendAudit({ actor: session.email, action: "message.handled", target: id });
  revalidatePath("/messages");
  revalidatePath("/");
}

/** "Replied" toggle — admin inbox me jawab diya hua message mark/undo */
export async function setMessageReplyAction(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const replied = String(formData.get("replied") ?? "") === "true";
  const ok = await setMessageReplied(id, replied, session.email);
  if (ok) appendAudit({ actor: session.email, action: replied ? "message.replied" : "message.unreplied", target: id });
  revalidatePath("/messages");
  revalidatePath("/");
}

export async function updateStockAction(formData: FormData) {
  // middleware ke saath defense-in-depth: action seedha bhi call ho sakta hai
  const session = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const inStock = formData.get("inStock") === "true";
  const actor = session.email;
  if (!saveProductOverride(handle, { inStock }, actor)) return;
  appendAudit({ actor, action: inStock ? "product.in_stock" : "product.out_of_stock", target: handle });
  revalidatePath("/products");
  revalidatePath("/inventory");
}

export async function updatePriceAction(formData: FormData) {
  const session = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const rupees = Number(formData.get("price") ?? 0);
  const actor = session.email;
  if (!Number.isFinite(rupees) || rupees <= 0) return;
  if (!saveProductOverride(handle, { price: Math.round(rupees * 100) }, actor)) return;
  appendAudit({ actor, action: "product.price_updated", target: handle, meta: { rupees } });
  revalidatePath("/products");
}

/**
 * Customer ki details edit — galat naam/phone/pincode ya call par address
 * change. Order page par inline form se aata hai.
 */
export async function updateContactAction(formData: FormData) {
  const session = await requireSession();
  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  if (!orderNumber) redirect("/orders?error=order-missing");
  const field = (name: string) => {
    const value = formData.get(name);
    return value === null ? undefined : String(value);
  };
  const actor = session.email;
  const updated = await updateOrderContact(
    orderNumber,
    {
      customerName: field("customerName"),
      email: field("email"),
      phone: field("phone"),
      address: field("address"),
      city: field("city"),
      state: field("state"),
      pincode: field("pincode"),
    },
    actor,
  );
  if (!updated) redirect(`/orders/${encodeURIComponent(orderNumber)}?error=order-missing`);
  appendAudit({ actor, action: "order.contact_updated", target: orderNumber });
  revalidatePath(`/orders/${orderNumber}`);
  revalidatePath("/orders");
  revalidatePath("/customers");
  redirect(`/orders/${encodeURIComponent(orderNumber)}?contactSaved=1`);
}

export async function updateTrackingAction(formData: FormData) {
  const session = await requireSession();
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const courier = String(formData.get("courier") ?? "");
  const awb = String(formData.get("awb") ?? "");
  const url = String(formData.get("url") ?? "");
  const actor = session.email;
  const updated = await setOrderTracking(orderNumber, { courier, awb, url }, actor);
  if (updated) {
    appendAudit({ actor, action: "order.tracking_updated", target: orderNumber, meta: { courier, awb } });
  }
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderNumber}`);
}

/** "Abhi kahan atka hai" — customer ko tracking page par ye note dikhta hai. */
export async function setOrderNoteAction(formData: FormData) {
  const session = await requireSession();
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const text = String(formData.get("text") ?? "");
  const actor = session.email;
  const updated = await setOrderNote(orderNumber, text, actor);
  if (updated) {
    appendAudit({ actor, action: "order.note_updated", target: orderNumber, meta: { text } });
  }
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderNumber}`);
}

export async function updateOrderStatusAction(formData: FormData) {
  const session = await requireSession();
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  const note = String(formData.get("note") ?? "") || undefined;
  const actor = session.email;
  const updated = await updateOrderStatus(orderNumber, status, actor, note);
  // invalid transition par kuch nahi likha jaata — UI refresh par purana status hi dikhega
  if (updated) {
    appendAudit({ actor, action: `order.status.${status}`, target: orderNumber, meta: note ? { note } : undefined });
  }
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderNumber}`);
  revalidatePath("/");
}

export async function saveSettingsAction(formData: FormData) {
  const session = await requireSession();
  const actor = session.email;
  await saveSettings({
    announcement: String(formData.get("announcement") ?? ""),
    freeShipping: formData.get("freeShipping") === "on",
    upiId: String(formData.get("upiId") ?? ""),
    upiName: String(formData.get("upiName") ?? ""),
    gstin: String(formData.get("gstin") ?? ""),
    sellerName: String(formData.get("sellerName") ?? ""),
    sellerAddress: String(formData.get("sellerAddress") ?? ""),
    sellerState: String(formData.get("sellerState") ?? ""),
    supportPhone: String(formData.get("supportPhone") ?? ""),
    supportEmail: String(formData.get("supportEmail") ?? ""),
    whatsapp: String(formData.get("whatsapp") ?? ""),
    adminUrl: String(formData.get("adminUrl") ?? ""),
  }, actor);
  appendAudit({ actor, action: "settings.updated", target: "store" });
  revalidatePath("/settings");
}

/* ───────────────── product edits -> seed overrides -> publish ───────────────── */

/** Product ka poora edit (title, price, MRP, stock, description, collections, size pricing, images). */
export async function saveProductEditAction(formData: FormData) {
  const session = await requireSession();
  const actor = session.email;
  const handle = String(formData.get("handle") ?? "");
  if (!handle) return;

  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const rupees = (key: string) => {
    const value = Number(formData.get(key) ?? "");
    return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : undefined;
  };

  const patch: Parameters<typeof saveProductOverride>[1] = {};
  const title = text("title");
  if (title) patch.title = title;

  const price = rupees("price");
  if (price) patch.price = price;

  const compareAt = rupees("compareAtPrice");
  patch.compareAtPrice = compareAt ?? null;

  patch.inStock = formData.get("inStock") === "on";
  patch.featured = formData.get("featured") === "on";

  const description = text("description");
  if (description) patch.description = description;

  const collections = formData.getAll("collections").map((value) => String(value));
  patch.collections = collections;

  // size rows: size_<SIZE> price rupees + avail_<SIZE>
  const sizePricing: Record<string, { price?: number; available?: boolean }> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("size_")) continue;
    const size = key.slice(5).replace(/_/g, " ");
    const sizePrice = Number(value);
    const available = formData.get(`avail_${size.replace(/ /g, "_")}`) === "on";
    sizePricing[size] = {
      ...(Number.isFinite(sizePrice) && sizePrice > 0 ? { price: Math.round(sizePrice * 100) } : {}),
      available,
    };
  }
  if (Object.keys(sizePricing).length) patch.sizePricing = sizePricing;

  saveProductOverride(handle, patch, actor);
  appendAudit({ actor, action: "product.edited", target: handle, meta: { price, collections } });
  revalidatePath("/products");
  revalidatePath(`/products/${handle}`);
}

export async function toggleProductVisibilityAction(formData: FormData) {
  const session = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  const hidden = formData.get("hidden") === "true";
  setProductHidden(handle, hidden, session.email);
  appendAudit({ actor: session.email, action: hidden ? "product.hidden" : "product.visible", target: handle });
  revalidatePath("/products");
}

export async function saveCollectionEditAction(formData: FormData) {
  const session = await requireSession();
  const handle = String(formData.get("handle") ?? "");
  saveCollectionOverride(handle, {
    title: String(formData.get("title") ?? "").trim() || undefined,
    subtitle: String(formData.get("subtitle") ?? "").trim() || undefined,
  });
  appendAudit({ actor: session.email, action: "collection.edited", target: handle });
  revalidatePath("/collections");
}

/** Admin ka "Publish" — catalogue rebuild, website turant naya data dikhati hai. */
export async function publishCatalogAction() {
  const session = await requireSession();
  const result = await publishCatalog();
  appendAudit({
    actor: session.email,
    action: result.ok ? "catalog.published" : "catalog.publish_failed",
    target: "website",
    meta: { log: result.log.slice(-600) },
  });
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/collections");
}

/* ───────────────────────── naya product + 10 photos ───────────────────────── */

export async function createProductAction(formData: FormData) {
  const session = await requireSession();
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const images = formData
    .getAll("image")
    .map((value) => String(value).trim())
    .filter(Boolean)
    .slice(0, 10);

  const priceRupees = Number(text("price"));
  const result = createAdminProduct(
    {
      title: text("title"),
      handle: text("handle"),
      price: Number.isFinite(priceRupees) ? Math.round(priceRupees * 100) : 0,
      images,
      collections: formData.getAll("collections").map((value) => String(value)),
      sizes: formData.getAll("sizes").map((value) => String(value)),
      description: text("description"),
      fabric: text("fabric"),
      color: text("color"),
      category: text("category") || "anarkali",
    },
    session.email,
  );

  if (!result.ok || !result.handle) {
    redirect(`/products/new?error=${encodeURIComponent(result.error ?? "Product save nahi hua")}`);
  }

  const publish = await publishCatalog();
  appendAudit({
    actor: session.email,
    action: "product.created",
    target: result.handle!,
    meta: { images: images.length, published: publish.ok },
  });
  revalidatePath("/products");
  revalidatePath("/");
  redirect(`/products/${encodeURIComponent(result.handle!)}?created=1`);
}

/* ───────────────────────── manual order (admin) ───────────────────────── */

export async function createOrderAction(formData: FormData) {
  const session = await requireSession();
  const text = (key: string) => String(formData.get(key) ?? "").trim();
  const items = text("handle")
    ? [{ handle: text("handle"), size: text("size"), quantity: Math.max(1, Number(text("quantity")) || 1) }]
    : [];

  const result = await createAdminOrder({
    customerName: text("customerName"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    city: text("city"),
    state: text("state"),
    pincode: text("pincode"),
    notes: text("notes") || undefined,
    items,
    markPaid: formData.get("markPaid") === "on",
    reference: text("reference") || undefined,
    actor: session.email,
  });

  if (!result.order) {
    redirect(`/orders/new?error=${encodeURIComponent(result.error ?? "Order create nahi hua")}`);
  }

  appendAudit({
    actor: session.email,
    action: "order.created.manual",
    target: result.order!.orderNumber,
    meta: { total: result.order!.total },
  });
  revalidatePath("/orders");
  revalidatePath("/");
  redirect(`/orders/${encodeURIComponent(result.order!.orderNumber)}`);
}

/* ───────────────────────── manual invoice (admin) ───────────────────────── */

export async function createManualInvoiceAction(formData: FormData) {
  const session = await requireSession();
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  // items: title[] size[] qty[] price[] (blank rows skip)
  const titles = formData.getAll("itemTitle").map(String);
  const sizes = formData.getAll("itemSize").map(String);
  const quantities = formData.getAll("itemQty").map(String);
  const prices = formData.getAll("itemPrice").map(String);

  const items = titles
    .map((title, index) => ({
      title: title.trim(),
      size: (sizes[index] ?? "").trim() || undefined,
      quantity: Math.max(1, Number(quantities[index] ?? 1) || 1),
      price: Math.round((Number(prices[index] ?? 0) || 0) * 100),
    }))
    .filter((item) => item.title && item.price > 0);

  if (!items.length) return;

  const invoice = await createManualInvoice({
    createdBy: session.email,
    customerName: text("customerName") || "Customer",
    phone: text("phone"),
    email: text("email") || undefined,
    address: text("address"),
    city: text("city"),
    state: text("state") || "Rajasthan",
    pincode: text("pincode"),
    items,
    notes: text("notes") || undefined,
    orderRef: text("orderRef") || undefined,
  });
  appendAudit({ actor: session.email, action: "invoice.manual_created", target: invoice.number });
  redirect(`/invoices/${encodeURIComponent(invoice.number)}`);
}

/* ───────────────────────── payments ───────────────────────── */

export async function verifyPaymentAction(formData: FormData) {
  const session = await requireSession();
  const orderNumber = String(formData.get("orderNumber") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  const amountRupees = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim();
  if (!orderNumber || !reference) return;
  const updated = await verifyOrderPayment(orderNumber, {
    reference,
    amount: Math.round((Number.isFinite(amountRupees) ? amountRupees : 0) * 100),
    actor: session.email,
    note: note || undefined,
  });
  if (updated) {
    appendAudit({ actor: session.email, action: "payment.verified", target: orderNumber, meta: { reference } });
  }
  revalidatePath("/payments");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderNumber}`);
}

/**
 * Auto-confirm undo — UPI return se paid mark hua order, par bank me paisa nahi
 * aaya. Payment wapas pending + (confirm tha to) order placed.
 */
export async function reversePaymentAction(formData: FormData) {
  const session = await requireSession();
  const orderNumber = String(formData.get("orderNumber") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim() || "payment not received";
  if (!orderNumber) return;
  const updated = await reverseOrderPayment(orderNumber, { actor: session.email, reason });
  if (updated) {
    appendAudit({ actor: session.email, action: "payment.reversed", target: orderNumber, meta: { reason } });
  }
  revalidatePath("/payments");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderNumber}`);
}

/* ───────────────── delivery (pincode) rules ─────────────────────────────────
 * Source of truth storefront hai. Remote mode me API se save hota hai, isliye
 * admin ka block turant website ke pincode check par lagta hai. */

function parsePinLines(value: string): { pincode: string; note?: string }[] {
  return String(value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pin, ...rest] = line.split(/[|\-–—,]/);
      return { pincode: String(pin ?? "").replace(/\D/g, "").slice(0, 6), note: rest.join(" ").trim() || undefined };
    })
    .filter((row) => /^[1-9]\d{5}$/.test(row.pincode));
}

export async function saveDeliverySettingsAction(formData: FormData) {
  const session = await requireSession();
  const actor = session.email;

  const current = await getDelivery();
  const settings = current.settings;

  const mode = String(formData.get("stateMode") ?? "all");
  const states: Record<string, boolean> = {};
  const selected = new Set(formData.getAll("states").map((value) => String(value)));
  for (const state of Object.keys(settings.states)) {
    states[state] = selected.has(state);
  }
  for (const state of selected) states[state] = true;

  const blockedText = formData.get("blockedPincodes");
  const allowedText = formData.get("allowedPincodes");

  const next = {
    ...settings,
    allowAllStates: mode === "all",
    states,
    // textarea diya gaya ho tabhi list replace karenge, warna per-row buttons ne jo kiya wahi rahega
    ...(blockedText === null
      ? {}
      : {
          blockedPincodes: parsePinLines(String(blockedText)).map((row) => ({
            ...row,
            at: new Date().toISOString(),
            by: actor,
          })),
        }),
    ...(allowedText === null
      ? {}
      : {
          allowedPincodes: parsePinLines(String(allowedText)).map((row) => ({
            ...row,
            at: new Date().toISOString(),
            by: actor,
          })),
        }),
    deliveryDays: String(formData.get("deliveryDays") ?? settings.deliveryDays).trim() || settings.deliveryDays,
    freeShipping: formData.get("freeShipping") === "on",
  };

  await saveDelivery(next, actor);
  appendAudit({
    actor,
    action: "delivery.settings_updated",
    target: "serviceability",
    meta: {
      allowAllStates: next.allowAllStates,
      blocked: next.blockedPincodes.length,
      allowed: next.allowedPincodes.length,
    },
  });
  revalidatePath("/delivery");
}

export async function togglePinRuleAction(formData: FormData) {
  const session = await requireSession();
  const actor = session.email;
  const pincode = String(formData.get("pincode") ?? "").replace(/\D/g, "").slice(0, 6);
  const list = String(formData.get("list") ?? "blocked"); // blocked | allowed
  const op = String(formData.get("op") ?? "add"); // add | remove
  const note = String(formData.get("note") ?? "").trim() || undefined;
  if (!/^[1-9]\d{5}$/.test(pincode)) return;

  const { settings } = await getDelivery();
  const key = list === "allowed" ? "allowedPincodes" : "blockedPincodes";
  const rows = settings[key].filter((row) => row.pincode !== pincode);
  if (op === "add") rows.push({ pincode, note, at: new Date().toISOString(), by: actor });

  await saveDelivery({ ...settings, [key]: rows }, actor);
  appendAudit({
    actor,
    action: op === "add" ? `delivery.${list}_added` : `delivery.${list}_removed`,
    target: pincode,
    meta: note ? { note } : undefined,
  });
  revalidatePath("/delivery");
}
