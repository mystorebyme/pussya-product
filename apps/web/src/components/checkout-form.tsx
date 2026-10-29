"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice, imageUrl } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";
import { useStoreSettings } from "@/components/store-settings-provider";
import { API_AVAILABLE, apiUrl } from "@/lib/api-base";
import { postJson, readJson } from "@/lib/http-json";
import { checkPincodeOffline } from "@/lib/pincode-offline";
import { INDIAN_STATES, canonicalStateName, statesMatch } from "@/lib/state-match";
import { autoFixPhoneInput, normaliseIndianPhone, whatsappNumber } from "@/lib/phone";
import { savePlacedOrder, type PlacedOrderSnapshot } from "@/lib/checkout-session";
import { clearCheckoutDetails, readCheckoutDetails, saveCheckoutDetails } from "@/lib/checkout-details";

const indianStates = INDIAN_STATES;

type PendingItem = { title: string; size?: string; colour?: string; quantity: number; price: number };

/**
 * Checkout — **two steps, no online payment** (owner, R50).
 *
 *   1. Delivery details → 2. Review → **Send order on WhatsApp**
 *
 * The order is saved to the Google Sheet / owner panel first (so it has an order
 * number), and the full summary is then opened in WhatsApp in the same click, so
 * the customer only has to press send. No UPI screen, no gateway, no card form —
 * the owner confirms every order in chat.
 *
 * Every string on this page is English (owner rule: all site copy in English).
 */
export function CheckoutForm() {
  const { lines, subtotal, count, clear, isOpen, closeCart } = useCart();
  const { whatsapp, supportPhone } = useStoreSettings();

  const [step, setStep] = useState<"details" | "review" | "sent">("details");
  const searchParams = useSearchParams();
  const resumeOrderNumber = searchParams.get("order");
  const wantsReview = searchParams.get("step") === "review";

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedSavedDetails, setUsedSavedDetails] = useState(false);
  const [pinStatus, setPinStatus] = useState<
    { ok: boolean; message: string; state: string | null; district: string | null } | null
  >(null);
  const [pinBusy, setPinBusy] = useState(false);
  /** the WhatsApp hand-off we just created — shown again on the confirmation screen */
  const [handoff, setHandoff] = useState<{ orderNumber: string | null; href: string } | null>(null);
  const [form, setForm] = useState({
    customerName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "Gujarat",
    pincode: "",
    notes: "",
  });

  const startedRef = useRef(false);

  useEffect(() => {
    if (isOpen) closeCart();
  }, [isOpen, closeCart]);

  /** a link to `?order=…&step=review` (old bookmarks) opens the review step */
  useEffect(() => {
    if (!resumeOrderNumber) return;
    setStep(wantsReview ? "review" : "sent");
    setHandoff({
      orderNumber: resumeOrderNumber,
      href: `https://wa.me/${whatsappNumber(whatsapp || supportPhone)}?text=${encodeURIComponent(
        `Hi Noor Ethnic Wear, I am following up on order ${resumeOrderNumber}.`,
      )}`,
    });
  }, [resumeOrderNumber, wantsReview, whatsapp, supportPhone]);

  /** one saved delivery address, remembered for the next order */
  useEffect(() => {
    const saved = readCheckoutDetails();
    if (!saved) return;
    setForm({
      customerName: saved.customerName,
      email: saved.email,
      phone: saved.phone,
      address: saved.address,
      city: saved.city,
      state: (indianStates as readonly string[]).includes(saved.state) ? saved.state : "Gujarat",
      pincode: saved.pincode,
      notes: saved.notes,
    });
    setUsedSavedDetails(true);
  }, []);

  /** check the pincode as soon as six digits are typed */
  useEffect(() => {
    const pin = form.pincode;
    if (pin.length !== 6) {
      setPinStatus(null);
      return;
    }
    let active = true;
    setPinBusy(true);
    const timer = setTimeout(() => {
      fetch(`/api/delivery/check?pincode=${encodeURIComponent(pin)}`, { cache: "no-store" })
        .then((response) =>
          readJson<{ data?: { serviceable: boolean; message: string; state: string | null; district: string | null } }>(
            response,
          ),
        )
        .then(async (parsed) => {
          if (!active) return;
          const result = parsed.data?.data ?? (await checkPincodeOffline(pin));
          if (!active) return;
          setPinStatus({ ok: result.serviceable, message: result.message, state: result.state, district: result.district });
          if (result.serviceable && result.state) update("state", result.state);
        })
        .catch(async () => {
          if (!active) return;
          const result = await checkPincodeOffline(pin);
          if (!active) return;
          setPinStatus({ ok: result.serviceable, message: result.message, state: result.state, district: result.district });
          if (result.serviceable && result.state) update("state", result.state);
        })
        .finally(() => {
          if (active) setPinBusy(false);
        });
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      setPinBusy(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pincode]);

  /** checkout funnel — the owner sees where customers stop (Sheet → Checkout tab) */
  useEffect(() => {
    if (startedRef.current || lines.length === 0) return;
    startedRef.current = true;
    trackCheckout("checkout.started");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  const discount = 0;
  const total = Math.max(0, subtotal - discount);
  const contactNumber = whatsappNumber(whatsapp || supportPhone);
  const pinState = canonicalStateName(pinStatus?.state) ?? pinStatus?.state ?? null;
  const stateMismatch = Boolean(pinStatus?.ok && pinState && !statesMatch(form.state, pinState));

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function trackCheckout(event: string, extra: Record<string, unknown> = {}) {
    if (!API_AVAILABLE) return;
    void fetch(apiUrl("/api/checkout/events"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event,
        step,
        items: lines.map((line) => ({ handle: line.handle, size: line.size, quantity: line.quantity })),
        subtotal,
        ...extra,
      }),
    }).catch(() => {});
  }

  /** the full order, as one English WhatsApp message */
  function buildWhatsappHref(orderNumber: string | null, items: PendingItem[]): string {
    const itemLines = items
      .map(
        (item) =>
          `• ${item.title} — size ${item.size ?? "—"}${item.colour ? `, ${item.colour}` : ""} × ${item.quantity} — ${formatPrice(item.price * item.quantity)}`,
      )
      .join("\n");
    const totals = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const text = [
      `Hi Noor Ethnic Wear, I would like to place this order${orderNumber ? ` (order ${orderNumber})` : ""}:`,
      "",
      itemLines,
      "",
      `Total: ${formatPrice(totals)}`,
      "",
      `Name: ${form.customerName}`,
      `Phone: ${form.phone}`,
      `Email: ${form.email}`,
      `Address: ${form.address}`,
      `City: ${form.city}, ${form.state} — ${form.pincode}`,
      form.notes ? `Note: ${form.notes}` : "",
      "",
      "Please confirm my order and share the payment details here. Thank you!",
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${contactNumber}?text=${encodeURIComponent(text)}`;
  }

  function goToReview() {
    const missing =
      form.customerName.trim().length < 2
        ? "Please enter your full name."
        : !/^\S+@\S+\.\S+$/.test(form.email.trim())
          ? "Please enter a valid email address — your invoice and updates go there."
          : !normaliseIndianPhone(form.phone)
            ? "Please enter a 10-digit mobile number."
            : form.address.trim().length < 8
              ? "Please enter your full address (house, street, area)."
              : form.city.trim().length < 2
                ? "Please enter your city."
                : form.pincode.length !== 6
                  ? "Please enter a 6-digit pincode."
                  : !pinStatus
                    ? "Please wait while we check delivery for your pincode."
                    : !pinStatus.ok
                      ? pinStatus.message
                      : stateMismatch
                        ? `This pincode belongs to ${pinState}. Please select "${pinState}" as the state.`
                        : null;
    if (missing) {
      setError(missing);
      return;
    }
    setError(null);
    saveCheckoutDetails(form);
    setStep("review");
    trackCheckout("checkout.review");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetSavedDetails() {
    clearCheckoutDetails();
    setUsedSavedDetails(false);
    setPinStatus(null);
    setForm({ customerName: "", email: "", phone: "", address: "", city: "", state: "Gujarat", pincode: "", notes: "" });
  }

  /**
   * Place the order, then open WhatsApp with the whole summary — in the same
   * click, so the browser allows the new tab and the customer only presses send.
   */
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lines.length === 0) return;
    if (!pinStatus?.ok) {
      setError(pinStatus?.message ?? "Please check your delivery pincode first.");
      return;
    }
    setError(null);
    setSubmitting(true);

    const items: PendingItem[] = lines.map((line) => ({
      title: line.title,
      size: line.size,
      colour: line.colour,
      quantity: line.quantity,
      price: line.price,
    }));

    let orderNumber: string | null = null;
    if (API_AVAILABLE) {
      try {
        const idempotencyKey =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`;
        const result = await postJson<{ orderNumber?: string; error?: string }>(
          apiUrl("/api/orders"),
          {
            ...form,
            items: lines.map((line) => ({ handle: line.handle, size: line.size, quantity: line.quantity })),
          },
          { timeoutMs: 25_000, headers: { "Idempotency-Key": idempotencyKey } },
        );
        orderNumber = result.data?.orderNumber ?? null;
        if (!orderNumber) {
          // the order still goes to WhatsApp — nothing is lost for the customer
          trackCheckout("order.failed", { reason: result.data?.error ?? "save failed" });
        }
      } catch (problem) {
        console.warn("order save failed", problem);
        trackCheckout("order.failed", { reason: (problem as Error)?.message ?? "network" });
      }
    }

    const href = buildWhatsappHref(orderNumber, items);
    setHandoff({ orderNumber, href });
    if (orderNumber) {
      trackCheckout("order.placed", { orderNumber, total });
      const snapshot: PlacedOrderSnapshot = {
        orderNumber,
        total,
        placedAt: new Date().toISOString(),
        items: lines.map((line) => ({
          title: line.title,
          image: line.image,
          size: line.size,
          colour: line.colour,
          quantity: line.quantity,
          price: line.price,
        })),
        customer: {
          name: form.customerName,
          phone: normaliseIndianPhone(form.phone) ?? form.phone,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
          notes: form.notes || undefined,
        },
      };
      savePlacedOrder(snapshot);
    }
    saveCheckoutDetails(form);
    clear();

    // open WhatsApp immediately (same user gesture → no popup blocker)
    if (typeof window !== "undefined") {
      const opened = window.open(href, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = href;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    setSubmitting(false);
    setStep("sent");
  }

  if (step === "sent" && handoff) {
    return <OrderSentPanel handoff={handoff} onResend={() => window.open(handoff.href, "_blank", "noopener,noreferrer")} />;
  }

  if (lines.length === 0) {
    return (
      <div className="border border-[#eee6de] px-6 py-20 text-center" data-testid="checkout-empty">
        <p className="text-sm text-[#6b6259]">Your bag is empty — add a suit set to continue.</p>
        <Link
          href="/collections"
          className="mt-5 inline-block bg-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
        >
          Shop now
        </Link>
      </div>
    );
  }

  const leftColumn = (
    <div className="space-y-6">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] tracking-[.14em] uppercase" data-testid="checkout-steps">
        {[
          { n: 1, label: "Delivery", active: step === "details" },
          { n: 2, label: "Review", active: step === "review" },
          { n: 3, label: "WhatsApp", active: false },
        ].map((item, index) => (
          <li key={item.n} className="flex items-center gap-2">
            {index > 0 ? <span className="text-[#c9bfb4]">→</span> : null}
            <span
              className={
                item.active
                  ? "bg-[#862222] px-2.5 py-1 text-white"
                  : "border border-[#e0d6ca] px-2.5 py-1 text-[#9a8f85]"
              }
            >
              {item.n} · {item.label}
            </span>
          </li>
        ))}
      </ol>

      {step === "details" ? (
        <div className="checkout-step-enter space-y-6" key="details">
          {usedSavedDetails ? (
            <div
              className="flex flex-wrap items-center justify-between gap-2 border border-[#cfe0d2] bg-[#f4faf5] px-3 py-2.5"
              data-testid="saved-address"
            >
              <p className="text-[11.5px] leading-relaxed text-[#2f6b3f]">
                We filled in the address you used last time — edit anything you need.
              </p>
              <button
                type="button"
                onClick={resetSavedDetails}
                data-testid="saved-address-clear"
                className="border border-[#2f6b3f] bg-white px-2.5 py-1.5 text-[10px] font-semibold tracking-[.08em] text-[#2f6b3f] uppercase"
              >
                Use a new address
              </button>
            </div>
          ) : null}

          <section>
            <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">Contact</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Full name" required autoComplete="name" value={form.customerName} onChange={(v) => update("customerName", v)} />
              <Field
                label="Mobile number"
                required
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={form.phone}
                onChange={(v) => update("phone", autoFixPhoneInput(v))}
              />
              <Field
                label="Email"
                required
                type="email"
                className="sm:col-span-2"
                autoComplete="email"
                value={form.email}
                onChange={(v) => update("email", v)}
              />
            </div>
          </section>

          <section>
            <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">Delivery address</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field
                label="Address (house, street, area)"
                required
                className="sm:col-span-2"
                autoComplete="street-address"
                value={form.address}
                onChange={(v) => update("address", v)}
              />
              <Field label="City" required autoComplete="address-level2" value={form.city} onChange={(v) => update("city", v)} />
              <Field
                label="Pincode"
                required
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.pincode}
                onChange={(v) => update("pincode", v.replace(/\D/g, "").slice(0, 6))}
              />
              <div className="sm:col-span-2">
                <label className="text-[10.5px] tracking-[.12em] text-[#6b6259] uppercase">State</label>
                <select
                  value={form.state}
                  autoComplete="address-level1"
                  onChange={(event) => update("state", event.target.value)}
                  className="mt-1 h-11 w-full border border-[#ddd2c6] bg-white px-3 text-[13px] outline-none focus:border-[#862222]"
                >
                  {indianStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="text-[10.5px] tracking-[.12em] text-[#6b6259] uppercase">Order note (optional)</label>
                <textarea
                  value={form.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  rows={2}
                  className="mt-1 w-full border border-[#ddd2c6] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#862222]"
                  placeholder="Stitching, delivery timing or any special request"
                />
              </div>
            </div>

            <div className="mt-3 min-h-[34px] text-[11.5px]" data-testid="pin-status">
              {pinBusy ? (
                <span className="text-[#8a8078]">Checking delivery for {form.pincode}…</span>
              ) : pinStatus ? (
                <span className={pinStatus.ok ? "text-[#2f6b3f]" : "text-[#a33a2b]"}>
                  {pinStatus.message}
                  {pinStatus.district ? ` · ${pinStatus.district}` : ""}
                </span>
              ) : null}
              {stateMismatch ? (
                <span className="ml-2 inline-flex items-center gap-2" data-testid="state-mismatch">
                  <span className="text-[#a33a2b]">This pincode belongs to {pinState}.</span>
                  <button
                    type="button"
                    onClick={() => update("state", pinState ?? form.state)}
                    data-testid="state-fix"
                    className="border border-[#862222] px-2 py-0.5 text-[10px] font-semibold tracking-[.08em] text-[#862222] uppercase"
                  >
                    Set state to {pinState}
                  </button>
                </span>
              ) : null}
            </div>
          </section>

          {error ? (
            <p className="border border-[#e3b7ae] bg-[#fdf3f1] px-3 py-2 text-[12px] text-[#9c3222]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="checkout-step-enter space-y-5" key="review" data-testid="checkout-review">
          <section className="border border-[#eee6de] bg-[#fcfaf7] px-4 py-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">Delivering to</h2>
                <p className="mt-1 text-[13px] text-[#2f2a25]">{form.customerName}</p>
                <p className="text-[12px] leading-relaxed text-[#6b6259]">
                  {form.address}, {form.city}, {form.state} — {form.pincode}
                </p>
                <p className="text-[12px] text-[#6b6259]">
                  {form.phone} · {form.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep("details")}
                className="border border-[#ddd2c6] px-2.5 py-1.5 text-[10px] font-semibold tracking-[.08em] text-[#6b6259] uppercase"
              >
                Edit
              </button>
            </div>
            {form.notes ? <p className="mt-2 text-[12px] text-[#6b6259]">Note: {form.notes}</p> : null}
          </section>

          <section>
            <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">
              {count} {count === 1 ? "item" : "items"} in your order
            </h2>
            <ul className="mt-3 divide-y divide-[#f0eae3] border border-[#eee6de]">
              {lines.map((line) => (
                <li key={line.key} className="flex gap-3 px-3 py-3">
                  <div className="relative h-20 w-16 shrink-0 overflow-hidden bg-[#f6f1ec]">
                    {line.image ? (
                      <SafeImage src={imageUrl(line.image, 200)} alt={line.title} sizes="64px" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] leading-snug text-[#2f2a25]">{line.title}</p>
                    <p className="mt-0.5 text-[11px] text-[#8a8078]">
                      {line.size ? `Size ${line.size}` : "Free size"}
                      {line.colour ? ` · ${line.colour}` : ""} · Qty {line.quantity}
                    </p>
                  </div>
                  <p className="text-[12.5px] font-medium text-[#2f2a25]">{formatPrice(line.price * line.quantity)}</p>
                </li>
              ))}
            </ul>
          </section>

          <div className="border border-[#e6d3a8] bg-[#fdf9ee] px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[.14em] text-[#8a6a1f] uppercase">How your order is confirmed</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#6b6259]">
              No online payment on this site. You press the button below, WhatsApp opens with your full order already written,
              you send it, and our team replies with the payment details and confirmation.
            </p>
          </div>

          {error ? (
            <p className="border border-[#e3b7ae] bg-[#fdf3f1] px-3 py-2 text-[12px] text-[#9c3222]" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );

  const summaryAside = (
    <aside className="h-fit border border-[#eee6de] bg-[#fcfaf7] p-4 lg:sticky lg:top-28">
      <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">Order summary</h2>
      <dl className="mt-3 space-y-1.5 text-[12.5px]">
        <div className="flex justify-between">
          <dt className="text-[#6b6259]">Subtotal ({count} items)</dt>
          <dd>{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-[#6b6259]">Shipping</dt>
          <dd className="text-[#2f6b3f]">Included</dd>
        </div>
        <div className="flex justify-between border-t border-[#e6ded4] pt-2 text-[13.5px] font-semibold">
          <dt>Total</dt>
          <dd>{formatPrice(total)}</dd>
        </div>
      </dl>

      {step === "details" ? (
        <button
          type="button"
          onClick={goToReview}
          data-testid="checkout-continue"
          className="cta-sheen mt-4 w-full bg-[#862222] py-3 text-[11.5px] font-semibold tracking-[.16em] text-white uppercase"
        >
          Continue to review
        </button>
      ) : (
        <>
          <button
            type="submit"
            data-testid="checkout-submit"
            disabled={submitting}
            className="cta-sheen wa-cta mt-4 flex w-full items-center justify-center gap-2 bg-[#128c4b] py-3 text-[11.5px] font-semibold tracking-[.14em] text-white uppercase disabled:opacity-60"
          >
            <WhatsappGlyph />
            {submitting ? "Sending…" : `Send order on WhatsApp · ${formatPrice(total)}`}
          </button>
          <button
            type="button"
            onClick={() => setStep("details")}
            className="mt-2 w-full border border-[#ddd2c6] py-2.5 text-[10.5px] font-semibold tracking-[.14em] text-[#6b6259] uppercase"
          >
            ← Edit delivery details
          </button>
        </>
      )}

      <p className="mt-2 text-center text-[10.5px] leading-relaxed text-[#8a8078]">
        Final price is already the sale price — no coupon needed. By ordering you agree to our{" "}
        <Link href="/policies/terms-and-conditions" className="underline">
          Terms &amp; Conditions
        </Link>
        ,{" "}
        <Link href="/policies/refund-and-return-policy" className="underline">
          Refund &amp; Return
        </Link>{" "}
        and{" "}
        <Link href="/policies/privacy-policy" className="underline">
          Privacy
        </Link>{" "}
        policies.
      </p>
    </aside>
  );

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr]" data-testid="checkout-form">
      {leftColumn}
      {summaryAside}
    </form>
  );
}

/** Confirmation screen after the order has been handed to WhatsApp. */
function OrderSentPanel({
  handoff,
  onResend,
}: {
  handoff: { orderNumber: string | null; href: string };
  onResend: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl border border-[#e6d3a8] bg-[#fdf9ee] px-6 py-10 text-center" data-testid="order-sent">
      <div className="order-sent-tick mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#128c4b] text-white">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
          <path d="m5 13 4 4L19 7" />
        </svg>
      </div>
      <h1 className="mt-4 font-display text-[26px] text-[#862222]">
        {handoff.orderNumber ? "Order created" : "Your order is ready"}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-[#5c534b]">
        {handoff.orderNumber ? (
          <>
            Your order <strong className="text-[#862222]">{handoff.orderNumber}</strong> is saved. WhatsApp should have opened
            with the full summary — just press send.
          </>
        ) : (
          <>WhatsApp should have opened with your full order — just press send and our team will confirm it.</>
        )}
      </p>
      <p className="mt-1 text-[12px] text-[#8a8078]">
        Nothing opened? Use the button below, or message us on the WhatsApp icon in the corner of any page.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={onResend}
          className="wa-cta flex items-center justify-center gap-2 bg-[#128c4b] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-white uppercase"
        >
          <WhatsappGlyph />
          Open WhatsApp again
        </button>
        {handoff.orderNumber ? (
          <Link
            href={`/orders/${encodeURIComponent(handoff.orderNumber)}`}
            className="flex items-center justify-center border border-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-[#862222] uppercase"
          >
            View order
          </Link>
        ) : null}
        <Link
          href="/collections"
          className="flex items-center justify-center border border-[#ddd2c6] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-[#6b6259] uppercase"
        >
          Continue shopping
        </Link>
      </div>
    </div>
  );
}

function WhatsappGlyph() {
  return (
    <svg width="15" height="15" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
      <path d="M16.04 3C8.9 3 3.1 8.8 3.1 15.94c0 2.28.6 4.51 1.74 6.47L3 29l6.76-1.77a12.9 12.9 0 0 0 6.28 1.6h.01c7.13 0 12.94-5.8 12.94-12.94 0-3.46-1.35-6.7-3.79-9.14A12.85 12.85 0 0 0 16.04 3Zm0 23.66h-.01a10.72 10.72 0 0 1-5.46-1.5l-.39-.23-4.02 1.05 1.08-3.92-.26-.4a10.7 10.7 0 0 1-1.64-5.72c0-5.93 4.83-10.75 10.76-10.75 2.87 0 5.57 1.12 7.6 3.15a10.68 10.68 0 0 1 3.15 7.61c0 5.93-4.83 10.75-10.75 10.75Zm5.9-8.05c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.58-1.6a9.72 9.72 0 0 1-1.79-2.23c-.19-.32-.02-.5.14-.66.15-.15.32-.38.48-.57.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.75-.99-2.39-.26-.63-.53-.54-.72-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.42 4.79.76.33 1.35.52 1.81.67.76.24 1.46.21 2.01.13.61-.09 1.91-.78 2.18-1.54.27-.75.27-1.4.19-1.54-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  className = "",
  inputMode,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  className?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  autoComplete?: string;
}) {
  return (
    <div className={className}>
      <label className="text-[10.5px] tracking-[.12em] text-[#6b6259] uppercase">{label}</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        className="mt-1 h-11 w-full border border-[#ddd2c6] bg-white px-3 text-[13px] outline-none focus:border-[#862222]"
      />
    </div>
  );
}
