"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { formatPrice, imageUrl } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";
import { useStoreSettings } from "@/components/store-settings-provider";
import { API_AVAILABLE, LIVE_STORE_URL, apiUrl } from "@/lib/api-base";
import { postJson, readJson } from "@/lib/http-json";
import { checkPincodeOffline } from "@/lib/pincode-offline";
import { INDIAN_STATES, canonicalStateName, statesMatch } from "@/lib/state-match";
import { autoFixPhoneInput, normaliseIndianPhone, whatsappNumber } from "@/lib/phone";
import {
  paymentUrl,
  readPlacedOrder,
  reviewUrl,
  savePlacedOrder,
  type PlacedOrderSnapshot,
} from "@/lib/checkout-session";
import {
  clearCheckoutDetails,
  phoneLast4,
  readCheckoutDetails,
  saveCheckoutDetails,
} from "@/lib/checkout-details";
import { CheckoutPaymentStep } from "@/components/checkout-payment-step";

const indianStates = INDIAN_STATES;

/**
 * `GET /api/orders/<n>/payment-context` ka jawab — checkout ka step 3 isi se chalta
 * hai (amount, sheet se live UPI, payment status, UPI-return token).
 */
type PaymentContext = {
  orderNumber: string;
  total: number;
  status: string;
  paymentStatus: string;
  reference: string | null;
  upi: { id: string; name: string };
  whatsapp: string;
  returnToken: string | null;
  items: { title: string; handle: string; image: string | null; size: string; quantity: number; price: number }[];
  customer: { name: string; city: string; state: string; pincode: string; phoneMasked: string };
};

export function CheckoutForm() {
  const { lines, subtotal, count, clear, isOpen, closeCart, removeLine } = useCart();
  const router = useRouter();
  // festive sale me final price already 499–699 hai — koi extra coupon nahi
  const { whatsapp, upiId: settingsUpiId, upiName: settingsUpiName } = useStoreSettings();
  /**
   * Sirf tab set hota hai jab order **server par save na ho** (static preview ya
   * network/API fail). Checkout par UPI ID / QR / "pay here" **kabhi nahi** —
   * payment sirf step 3 (payment page) par. Ye block sirf help ke liye hai.
   */
  const [fallbackHref, setFallbackHref] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  // sirf prepaid — COD option hata diya gaya hai
  const payment = "prepaid" as const;
  const [submitting, setSubmitting] = useState(false);
  /**
   * 3-step checkout: 1) delivery details → 2) review → 3) **payment (isi page par)**.
   * Owner (R36): payment ka alag page nahi khulta — step 3 yahin chalta hai, browser
   * ka back review par jaata hai, aur wahi order dobara kholne par (`?step=payment&
   * order=NE-…`) payment phir se chal jaata hai.
   */
  const [step, setStep] = useState<"details" | "review" | "payment">("details");
  /**
   * R33 (owner): payment page se **back** karne par customer ko seedha review
   * (step 2) par laana hai — address form dobara nahi. Order place hote hi cart
   * khali hota hai, isliye order ka snapshot `sessionStorage` se padhte hain.
   */
  const searchParams = useSearchParams();
  const resumeOrderNumber = searchParams.get("order");
  const wantsReview = searchParams.get("step") === "review";
  const wantsPayment = searchParams.get("step") === "payment";
  const [resumedSnapshot, setResumed] = useState<PlacedOrderSnapshot | null>(null);
  const [resumeChecked, setResumeChecked] = useState(false);
  /** order abhi place hua — URL sync na bhi ho to step 3 chalta rahe */
  const [placedOrderNumber, setPlacedOrderNumber] = useState<string | null>(null);
  /** `/api/orders/<n>/payment-context` — amount, live UPI, status, return token */
  const [context, setContext] = useState<PaymentContext | null>(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  /** step 3 khud push kiya tha (back button se review par jaane ke liye) */
  const pushedPayment = useRef(false);
  /** pichhli baar bhari details localStorage se aa gayi — customer ko batate hain */
  const [usedSavedDetails, setUsedSavedDetails] = useState(false);
  const [savedPhone, setSavedPhone] = useState("");
  /** jis order ka payment chal raha hai */
  const orderNumber = placedOrderNumber ?? resumeOrderNumber;
  // OTP step hata diya gaya hai (owner request) — order sirf details par
  const [error, setError] = useState<string | null>(null);
  // delivery check — admin ke rules + India Post data se
  const [pinStatus, setPinStatus] = useState<
    { ok: boolean; message: string; state: string | null; district: string | null } | null
  >(null);
  const [pinBusy, setPinBusy] = useState(false);
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

  useEffect(() => {
    if (isOpen) closeCart();
  }, [isOpen, closeCart]);

  /**
   * `?order=NE-…&step=review` — payment page ka "back". Snapshot mil gaya to
   * review seedha dikhta hai (cart khali hone par bhi).
   */
  useEffect(() => {
    if (!resumeOrderNumber) {
      setResumeChecked(true);
      return;
    }
    setResumed(readPlacedOrder(resumeOrderNumber));
    setResumeChecked(true);
  }, [resumeOrderNumber]);

  /**
   * URL hi step batata hai (refresh / share / back-forward): `?step=review` → step 2,
   * warna `?order=` ke saath seedha step 3 (order place ho chuka hai).
   */
  useEffect(() => {
    if (!resumeOrderNumber) return;
    setStep(wantsReview ? "review" : "payment");
  }, [resumeOrderNumber, wantsReview, wantsPayment]);

  /**
   * History hum khud `pushState` karte hain (server round-trip nahi), isliye
   * back/forward par step URL se dobara sync karte hain.
   */
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const order = params.get("order");
      if (!order) return;
      setPlacedOrderNumber((current) => current ?? order);
      setStep(params.get("step") === "review" ? "review" : "payment");
    };
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  /**
   * Step 3 ka data — amount, **sheet se live UPI**, payment status aur UPI-return
   * ka signed token. Order place hote hi, ya `?order=` ke saath page khulte hi.
   */
  useEffect(() => {
    const target = orderNumber;
    if (!target || !API_AVAILABLE) return;
    let active = true;
    setContextLoading(true);
    fetch(apiUrl(`/api/orders/${encodeURIComponent(target)}/payment-context`), { cache: "no-store" })
      .then((response) => readJson<{ data?: PaymentContext }>(response))
      .then((parsed) => {
        const data = parsed.data?.data;
        if (!active || !data) return;
        setContext(data);
        setPaymentStatus(data.paymentStatus);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setContextLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderNumber]);

  /**
   * Owner (R36): "ek baar address card ki detail bhar de to agli baar direct
   * recommend ho jaaye". Saved details `localStorage` se aati hain aur sirf tab
   * bhari jaati hain jab form khali ho (abhi likha hua kabhi override nahi hota).
   */
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
    setSavedPhone(saved.phone);
    setUsedSavedDetails(true);
  }, []);

  // 6 digit poore hone par apne aap check — galat/blocked pincode par aage nahi jaane dete
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
        .then((response) => readJson<{ data?: { serviceable: boolean; message: string; state: string | null; district: string | null } }>(response))
        .then(async (parsed) => {
          if (!active) return;
          // API na ho (static Pages) ya reply kharab ho to India Post data se khud check
          const result = parsed.data?.data ?? (await checkPincodeOffline(pin));
          if (!active) return;
          setPinStatus({ ok: result.serviceable, message: result.message, state: result.state, district: result.district });
          // state auto-fill: admin ne jis state ko allow kiya hai wahi select rahe
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
  }, [form.pincode]);

  /** customer checkout tak pahuncha — ek hi baar log hota hai */
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || lines.length === 0) return;
    startedRef.current = true;
    trackCheckout("checkout.started");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines.length]);

  const discount = 0;
  const total = Math.max(0, subtotal - discount);

  /**
   * Owner rule: pincode jis state ka hai, wahi state select hona chahiye.
   * Mismatch par aage nahi jaane dete aur sahi state ek tap me set ho jaati hai.
   */
  const pinState = canonicalStateName(pinStatus?.state) ?? pinStatus?.state ?? null;
  const stateMismatch = Boolean(pinStatus?.ok && pinState && !statesMatch(form.state, pinState));

  /** Step 1 → Step 2: delivery details theek hon tabhi aage */
  function goToReview() {
    const missing =
      form.customerName.trim().length < 2
        ? "Poora naam likhiye."
        : !/^\S+@\S+\.\S+$/.test(form.email.trim())
          ? "Email theek likhiye — invoice/update isi par aata hai."
          : !normaliseIndianPhone(form.phone)
            ? "10 digit ka mobile number daaliye."
            : form.address.trim().length < 8
              ? "Poora address likhiye (house, street, area)."
              : form.city.trim().length < 2
                ? "City likhiye."
                : form.pincode.length !== 6
                  ? "6 digit pincode daaliye."
                  : !pinStatus
                    ? "Pincode check hone dein — delivery availability verify ho rahi hai."
                    : !pinStatus.ok
                      ? pinStatus.message
                      : stateMismatch
                        ? `Ye pincode ${pinState} ka hai — State me "${pinState}" select kariye (abhi "${form.state}" chuna hua hai).`
                        : null;
    if (missing) {
      setError(missing);
      return;
    }
    setError(null);
    /** ek baar bhari details yaad — agle order me pehle se bhari aayengi (owner, R36) */
    saveCheckoutDetails(form);
    setStep("review");
    trackCheckout("checkout.review");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  /**
   * Checkout funnel — har stage DB me (`checkout_events`) aur owner ki Google
   * Sheet me (Checkout tab) jaata hai: checkout tak pahuncha, review tak aaya,
   * order place hua, ya fail hua. Isse owner ko pata rahe kahan log ruk rahe hain.
   */
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

  /** static preview par order save nahi hota — live store par bhejte hain */
  function liveStoreCheckoutUrl() {
    return `${LIVE_STORE_URL.replace(/\/+$/, "")}/checkout`;
  }

  /** static preview / server down — poora order WhatsApp par (owner usi se confirm karta hai) */
  function whatsappOrderLink(): string {
    const itemLines = lines
      .map((line) => `• ${line.title} — size ${line.size}${line.colour ? `, ${line.colour}` : ""} × ${line.quantity}`)
      .join("\n");
    const text = [
      "Hi Noor Ethnic Wear, I want to place this order:",
      "",
      itemLines,
      "",
      `Total: ${formatPrice(total)} (prepaid)`,
      "",
      `Name: ${form.customerName}`,
      `Phone: ${form.phone}`,
      `Email: ${form.email}`,
      `Address: ${form.address}, ${form.city}, ${form.state} — ${form.pincode}`,
      form.notes ? `Notes: ${form.notes}` : "",
      "",
      "I will share the UPI payment screenshot here.",
    ]
      .filter(Boolean)
      .join("\n");
    return `https://wa.me/${whatsappNumber(whatsapp.replace(/\D/g, "").slice(-10))}?text=${encodeURIComponent(text)}`;
  }

  /**
   * Step 3 (payment) — **isi page par**, alag payment page nahi (owner, R36).
   * Order pehle hi ban chuka ho (back / revisit / doosra tab) to dobara banta nahi.
   *
   * History: pehle review URL `replaceState` (cart khali ho chuka hai, isliye back
   * par review snapshot se dikhega), phir payment URL `pushState` — isliye browser
   * ka **back** = review, aur payment URL refresh/share karne par bhi step 3 khulta hai.
   */
  function goToPayment(target: string) {
    pushedPayment.current = true;
    setPlacedOrderNumber((current) => current ?? target);
    setStep("payment");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    if (typeof window === "undefined") return;
    try {
      window.history.replaceState({}, "", reviewUrl(target));
      window.history.pushState({}, "", paymentUrl(target));
    } catch {
      // history block ho to router se hi sahi — step 3 khulna zaroori hai
      router.push(paymentUrl(target));
    }
  }

  /** Step 3 → step 2 (review). Direct link par history entry nahi hoti → replaceState. */
  function backToReview() {
    setStep("review");
    if (typeof window === "undefined") return;
    if (pushedPayment.current) {
      window.history.back();
      return;
    }
    if (!orderNumber) return;
    try {
      window.history.replaceState({}, "", reviewUrl(orderNumber));
    } catch {
      /* URL update fail ho to bhi review dikhta hai */
    }
  }

  /** "Naya address bharein" — saved details hata kar form khali (owner, R36) */
  function resetSavedDetails() {
    clearCheckoutDetails();
    setUsedSavedDetails(false);
    setSavedPhone("");
    setPinStatus(null);
    setForm({ customerName: "", email: "", phone: "", address: "", city: "", state: "Gujarat", pincode: "", notes: "" });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (resumed) {
      goToPayment(resumed.orderNumber);
      return;
    }
    if (lines.length === 0) return;
    if (!pinStatus) {
      setError("Please check your delivery pincode first — we only ship to verified pincodes.");
      return;
    }
    if (!pinStatus.ok) {
      setError(pinStatus.message);
      return;
    }
    setError(null);
    setFallbackHref(null);
    setFallbackReason(null);

    /**
     * GitHub Pages (static preview) par koi server nahi hota — wahan order save
     * nahi ho sakta. Customer ko clearly batate hain aur live store par bhejte
     * hain (payment wahan step 3 par hi khulta hai).
     */
    if (!API_AVAILABLE) {
      setFallbackReason("preview");
      setFallbackHref(liveStoreCheckoutUrl());
      return;
    }

    setSubmitting(true);
    try {
      // idempotency key -> double click par do order nahi bante
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const result = await postJson<{ orderNumber?: string; error?: string }>(
        apiUrl("/api/orders"),
        {
          ...form,
          paymentMethod: payment,
          items: lines.map((line) => ({ handle: line.handle, size: line.size, quantity: line.quantity })),
        },
        { timeoutMs: 25_000, headers: { "Idempotency-Key": idempotencyKey } },
      );

      if (!result.data?.orderNumber) {
        const message =
          result.data?.error ?? result.error ?? "Order place nahi hua. Details check karke dobara try kariye.";
        setError(message);
        setFallbackReason("failed");
        setFallbackHref(whatsappOrderLink());
        trackCheckout("order.failed", { reason: message });
        setSubmitting(false);
        return;
      }
      trackCheckout("order.placed", { orderNumber: result.data.orderNumber, total });
      /**
       * Snapshot pehle save — `clear()` ke baad bhi payment page se "back" par
       * review dikh sake (owner rule, R33). Koi payment detail isme nahi jaati.
       */
      savePlacedOrder({
        orderNumber: result.data.orderNumber,
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
      });
      /** address yaad — agle order me pehle se bhara aayega (owner, R36) */
      saveCheckoutDetails(form);
      clear();
      /**
       * Payment **step 3** ab checkout ke andar hi khulta hai (owner, R36) —
       * alag page nahi, aur UPI app apne aap nahi khulti ("Pay on UPI" dabane par
       * hi intent chalta hai). Back = review (step 2).
       */
      goToPayment(result.data.orderNumber);
    } catch (error) {
      console.warn("order submit failed", error);
      setError("Order server tak nahi pahuncha. Dobara try kariye, ya WhatsApp par order bhej dijiye — wahan hum turant confirm karte hain.");
      setFallbackReason("failed");
      setFallbackHref(whatsappOrderLink());
      trackCheckout("order.failed", { reason: (error as Error)?.message ?? "network" });
      setSubmitting(false);
    }
  }

  /**
   * Snapshot (sessionStorage) na ho — doosra tab/device, ya purana link — to
   * payment-context se hi review/summary ban jaati hai. Poora address/email isme
   * nahi hote (public API privacy ke liye wahi nahi bhejta), isliye sirf
   * naam + sheher + pincode dikhta hai.
   */
  const resumed: PlacedOrderSnapshot | null =
    resumedSnapshot ??
    (context
      ? {
          orderNumber: context.orderNumber,
          total: context.total,
          placedAt: "",
          items: context.items.map((item) => ({
            title: item.title,
            image: item.image ?? "",
            size: item.size,
            quantity: item.quantity,
            price: item.price,
          })),
          customer: {
            name: context.customer.name,
            phone: "",
            email: "",
            address: "",
            city: context.customer.city,
            state: context.customer.state,
            pincode: context.customer.pincode,
            notes: undefined,
          },
        }
      : null);

  /** step 3 = payment, checkout ke andar hi */
  const isPayment = step === "payment" && Boolean(orderNumber);

  /**
   * Review par jo dikhta hai: normal checkout me cart, "back from payment" me
   * order ka snapshot. Dono jagah same layout, isliye customer ko farq nahi padta.
   */
  const shownItems = resumed
    ? resumed.items.map((item, index) => ({ key: `placed-${index}`, ...item }))
    : lines.map((line) => ({
        key: line.key,
        title: line.title,
        image: line.image,
        size: line.size,
        colour: line.colour,
        quantity: line.quantity,
        price: line.price,
      }));
  const shownCount = resumed ? resumed.items.reduce((sum, item) => sum + item.quantity, 0) : count;
  /** back-from-payment me review dikhta hai (details form kabhi nahi) */
  const showDetails = !isPayment && !resumed && step === "details";
  /** review ki address/contact line — context-only case me address khaali hota hai */
  const shownAddress = resumed
    ? [resumed.customer.address, `${resumed.customer.city}, ${resumed.customer.state} — ${resumed.customer.pincode}`]
        .filter(Boolean)
        .join(", ")
    : `${form.address}, ${form.city}, ${form.state} — ${form.pincode}`;
  const shownContact = resumed
    ? [resumed.customer.phone, resumed.customer.email].filter(Boolean).join(" · ")
    : `${form.phone} · ${form.email}`;
  const shownSubtotal = resumed ? resumed.total : subtotal;
  const shownTotal = resumed ? resumed.total : total;
  /**
   * `?order=` aaya par na snapshot mila na context (doosra tab/device + API/DB down)
   * — order phir bhi safe hai, payment page se pay ho jaata hai.
   */
  const resumeMissing = Boolean(orderNumber && resumeChecked && !resumed && !contextLoading);
  /** snapshot/context padhne se pehle "cart empty" na dikhe (ek pal ka flash bhi nahi) */
  const resumePending = Boolean(orderNumber && !resumed && (!resumeChecked || contextLoading));

  if (resumePending) {
    return (
      <div className="border border-[#eee6de] px-6 py-16 text-center" data-testid="review-loading">
        <p className="text-sm text-[#6b6259]">Review khol rahe hain…</p>
      </div>
    );
  }

  if (resumeMissing) {
    return (
      <div className="border border-[#eee6de] px-6 py-16 text-center" data-testid="review-unavailable">
        <p className="text-sm text-[#4a423b]">
          Order <strong className="text-[#862222]">{resumeOrderNumber}</strong> place ho chuka hai — payment
          page se aage badhiye (step 3 yahan load nahi ho paaya).
        </p>
        <Link
          href={`/orders/${encodeURIComponent(resumeOrderNumber ?? "")}/pay`}
          data-testid="review-open-payment"
          className="mt-5 inline-block bg-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
        >
          Payment page kholein
        </Link>
        <p className="mt-3 text-[11.5px] text-[#8a8078]">
          Details dekhni hain to{" "}
          <Link href={`/orders/${encodeURIComponent(resumeOrderNumber ?? "")}`} className="text-[#862222] underline">
            order page
          </Link>{" "}
          kholein.
        </p>
      </div>
    );
  }

  if (lines.length === 0 && !resumed) {
    return (
      <div className="border border-[#eee6de] px-6 py-20 text-center">
        <p className="text-sm text-[#6b6259]">Your cart is empty — add a suit set to checkout.</p>
        <Link
          href="/collections/party-wear-gown"
          className="mt-5 inline-block bg-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
        >
          Shop now
        </Link>
      </div>
    );
  }

  const leftColumn = (
      <div className="space-y-6">
        {/* 3-step indicator — payment step 3, isi page par (owner, R36) */}
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] tracking-[.14em] uppercase" data-testid="checkout-steps">
          {[
            { n: 1, label: "Delivery", active: showDetails },
            { n: 2, label: "Review", active: !showDetails && !isPayment },
            { n: 3, label: "Payment", active: isPayment },
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

        {isPayment ? (
          /* Step 3 — payment yahin, alag page nahi (owner, R36) */
          <CheckoutPaymentStep
            orderNumber={orderNumber ?? ""}
            total={shownTotal}
            paymentStatus={context?.paymentStatus ?? paymentStatus}
            reference={context?.reference ?? null}
            upiId={context?.upi.id || settingsUpiId}
            upiName={context?.upi.name || settingsUpiName}
            whatsapp={context?.whatsapp || whatsapp}
            returnToken={context?.returnToken ?? null}
            last4Hint={phoneLast4(form.phone || savedPhone)}
            loading={contextLoading && !context}
            onStatusChange={setPaymentStatus}
            onBackToReview={backToReview}
          />
        ) : showDetails ? (
        <>
        {usedSavedDetails ? (
          <div
            className="flex flex-wrap items-center justify-between gap-2 border border-[#cfe0d2] bg-[#f4faf5] px-3 py-2.5"
            data-testid="saved-address"
          >
            <p className="text-[11.5px] leading-relaxed text-[#2f6b3f]">
              Aapka pichhla address pehle se bhara hua hai — badalna ho to edit kar lijiye.
            </p>
            <button
              type="button"
              onClick={resetSavedDetails}
              data-testid="saved-address-clear"
              className="border border-[#2f6b3f] bg-white px-2.5 py-1.5 text-[10px] font-semibold tracking-[.08em] text-[#2f6b3f] uppercase"
            >
              Naya address bharein
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
              /* R37 (owner): +91 / 91 / 0 prefix type karte hi khud hat jaata hai */
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
          <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">Shipping address</h2>
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
            <div>
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
            <div>
              <Field
                label="Pincode"
                required
                inputMode="numeric"
                autoComplete="postal-code"
                value={form.pincode}
                onChange={(v) => update("pincode", v.replace(/\D/g, "").slice(0, 6))}
              />
              {pinBusy ? <p className="mt-1 text-[11px] text-[#8a8078]">Checking delivery…</p> : null}
              {pinStatus ? (
                <p
                  className={`mt-1 text-[11px] leading-relaxed ${pinStatus.ok ? "text-[#2f7a3f]" : "text-[#a11d1d]"}`}
                  data-testid="pincode-status"
                >
                  {pinStatus.ok
                    ? `Deliverable${pinStatus.district ? ` — ${pinStatus.district}, ${pinStatus.state}` : ""}. Free shipping, 4-7 business days.`
                    : pinStatus.message}
                </p>
              ) : null}
              {/*
                Owner rule: pincode aur state match hone chahiye. Mismatch par
                saaf message + ek tap me sahi state set (aage jaana block rehta hai).
              */}
              {stateMismatch ? (
                <div
                  className="mt-1.5 border border-[#e6c9a8] bg-[#fdf6ea] px-2.5 py-2"
                  data-testid="state-mismatch"
                  role="alert"
                >
                  <p className="text-[11px] leading-relaxed text-[#8a5a14]">
                    Ye pincode <strong>{pinState}</strong> ka hai, par State me{" "}
                    <strong>{form.state}</strong> chuna hua hai. State badal kar {pinState} kariye.
                  </p>
                  <button
                    type="button"
                    onClick={() => update("state", pinState ?? form.state)}
                    className="mt-1.5 inline-flex h-7 items-center border border-[#8a5a14] bg-white px-2.5 text-[10px] font-semibold tracking-[.08em] text-[#8a5a14] uppercase"
                    data-testid="state-fix"
                  >
                    State {pinState} set kariye
                  </button>
                </div>
              ) : null}
            </div>
            <Field label="Order notes (optional)" autoComplete="off" value={form.notes} onChange={(v) => update("notes", v)} />
          </div>
        </section>

        <section>
          <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">Payment</h2>
          {/* Payment ki poori detail order page par — order place hote hi wahi khulta hai.
              Yahan sirf itna ki prepaid hai, taaki checkout lamba na ho. */}
          <div className="mt-3 flex items-start gap-3 border border-[#e5dbd0] bg-[#fdf8f7] p-3.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#862222" strokeWidth="1.7" className="mt-0.5 shrink-0" aria-hidden>
              <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 7.6S5 16.2 5 12V6l7-3z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <p className="text-[12.5px] leading-relaxed text-[#4a423b]" data-testid="prepaid-note">
              Prepaid order. <strong>Place order</strong> dabate hi step 3 (payment) isi page par
              khulega — UPI QR, &quot;Pay on UPI&quot; button aur confirm. Payment seedha store
              account me jaata hai, koi gateway charge nahi.
            </p>
          </div>
        </section>
        </>
        ) : (
          <>
            {/* Step 2 — review. Yahan koi input nahi, sirf confirm (payment next page). */}
            <section data-testid="checkout-review">
              <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">
                Review your order
              </h2>
              <div className="mt-3 border border-[#eee6de] bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10.5px] tracking-[.12em] text-[#9a8f85] uppercase">Deliver to</p>
                    <p className="mt-1 text-[13px] font-medium text-[#2f2a25]" data-testid="review-name">
                      {resumed ? resumed.customer.name : form.customerName}
                    </p>
                    <p className="mt-0.5 text-[12px] leading-relaxed text-[#5c534b]" data-testid="review-address">
                      {shownAddress}
                    </p>
                    {shownContact ? <p className="mt-1 text-[12px] text-[#5c534b]">{shownContact}</p> : null}
                    {(resumed ? resumed.customer.notes : form.notes) ? (
                      <p className="mt-1 text-[11.5px] text-[#8a8078]">
                        Note: {resumed ? resumed.customer.notes : form.notes}
                      </p>
                    ) : null}
                  </div>
                  {resumed ? (
                    <span className="shrink-0 border border-[#e0d6ca] px-3 py-1.5 text-[10px] font-semibold tracking-[.12em] text-[#9a8f85] uppercase">
                      Placed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setStep("details")}
                      data-testid="review-edit"
                      className="shrink-0 border border-[#862222] px-3 py-1.5 text-[10px] font-semibold tracking-[.12em] text-[#862222] uppercase"
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">
                Items ({shownCount})
              </h2>
              <ul className="mt-3 divide-y divide-[#eee6de] border border-[#eee6de] bg-white" data-testid="review-items">
                {shownItems.map((line) => (
                  <li key={line.key} className="flex gap-3 p-3">
                    <SafeImage src={imageUrl(line.image, 160)} alt={line.title} className="h-16 w-12 shrink-0 object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[12px] leading-snug">{line.title}</p>
                      <p className="mt-0.5 text-[11px] text-[#8a8078]">
                        Size {line.size}
                        {line.colour ? ` · ${line.colour}` : ""} · Qty {line.quantity}
                      </p>
                    </div>
                    <span className="text-[12px] font-medium">{formatPrice(line.price * line.quantity)}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">Payment</h2>
              <div className="mt-3 flex items-start gap-3 border border-[#e5dbd0] bg-[#fdf8f7] p-3.5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#862222" strokeWidth="1.7" className="mt-0.5 shrink-0" aria-hidden>
                  <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 7.6S5 16.2 5 12V6l7-3z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <p className="text-[12.5px] leading-relaxed text-[#4a423b]" data-testid="prepaid-note">
                  Prepaid order. <strong>Place order</strong> dabate hi order number banega aur
                  payment step 3 isi page par khulega (alag page nahi). UPI app tab hi khulti hai
                  jab aap &quot;Pay on UPI&quot; dabate hain. Payment confirm hone par hi order
                  confirm hoga.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
  );

  const summaryAside = (
      <aside className="h-fit border border-[#eee6de] bg-[#faf8f5] p-5 lg:sticky lg:top-[92px]">
        <h2 className="text-[11px] font-semibold tracking-[.16em] uppercase">Order summary ({shownCount})</h2>
        <ul className="mt-3 divide-y divide-[#eee6de]">
          {shownItems.map((line) => (
            <li key={line.key} className="flex gap-2.5 py-2.5">
              <SafeImage src={imageUrl(line.image, 200)} alt={line.title} className="h-16 w-12 shrink-0 object-cover" />
              <div className="flex-1">
                <p className="line-clamp-2 text-[11.5px] leading-snug">{line.title}</p>
                <p className="mt-0.5 text-[10.5px] text-[#8a8078]">
                  {line.size}
                  {line.colour ? ` · ${line.colour}` : ""} · Qty {line.quantity}
                </p>
                {resumed ? null : (
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    data-testid="summary-remove"
                    aria-label={`Remove ${line.title} from order`}
                    className="mt-1 text-[10px] tracking-[.06em] text-[#9a8f85] uppercase underline transition hover:text-[#862222]"
                  >
                    Remove
                  </button>
                )}
              </div>
              <span className="text-[11.5px] font-medium">{formatPrice(line.price * line.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 border-t border-[#e7ddd2] pt-3 text-[12.5px]">
          <div className="flex justify-between">
            <span className="text-[#6b6259]">Subtotal</span>
            <span>{formatPrice(shownSubtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#6b6259]">Shipping</span>
            <span className="text-[#2f7a3f]">Free</span>
          </div>
          <div className="flex items-center justify-between border-t border-[#e7ddd2] pt-2.5 text-[14.5px] font-semibold">
            <span>Total</span>
            <span className="text-[#862222]">{formatPrice(shownTotal)}</span>
          </div>
        </div>

        {error ? <p className="mt-3 text-[11.5px] text-[#b3261e]">{error}</p> : null}

        {/*
          Fallback only — customer ko checkout par UPI ID / QR / "pay here" kabhi
          nahi dikhta (owner rule: payment sirf 3rd step par). Yahan sirf itna ki
          order save nahi hua to kya karein.
        */}
        {fallbackHref ? (
          <div
            className="mt-3 border border-[#e7ddd2] bg-white p-3"
            data-testid="checkout-fallback"
          >
            {fallbackReason === "preview" ? (
              <p className="text-[11.5px] leading-relaxed text-[#6b6259]">
                Ye static preview hai — yahan se order save nahi hota. Live store par order kariye;
                payment ka page wahan agle step par khulega.
              </p>
            ) : (
              <p className="text-[11.5px] leading-relaxed text-[#6b6259]">
                Order server par save nahi hua. <strong>Dobara try</strong> kariye — ya WhatsApp par
                order bhej dijiye, team turant confirm karegi.
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {fallbackReason === "preview" ? (
                <a
                  href={fallbackHref}
                  className="inline-flex h-9 items-center bg-[#862222] px-3 text-[10px] font-semibold tracking-[.12em] text-white uppercase"
                >
                  Live store par order kariye
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setFallbackHref(null)}
                    className="inline-flex h-9 items-center border border-[#862222] px-3 text-[10px] font-semibold tracking-[.12em] text-[#862222] uppercase"
                  >
                    Try again
                  </button>
                  <a
                    href={fallbackHref}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 items-center bg-[#25D366] px-3 text-[10px] font-semibold tracking-[.12em] text-white uppercase"
                  >
                    WhatsApp par bhejein
                  </a>
                </>
              )}
            </div>
          </div>
        ) : null}

        {isPayment ? (
          <>
            {/* Step 3: order ban chuka hai — ab sirf payment + order details */}
            <Link
              href={`/orders/${encodeURIComponent(orderNumber ?? "")}`}
              data-testid="payment-order-details"
              className="mt-4 w-full bg-[#862222] px-4 py-3 text-center text-[11.5px] font-semibold tracking-[.16em] text-white uppercase"
            >
              Order details dekhein
            </Link>
            <button
              type="button"
              onClick={backToReview}
              data-testid="payment-back-review-aside"
              className="mt-2 w-full border border-[#ddd2c6] py-2.5 text-[10.5px] font-semibold tracking-[.14em] text-[#6b6259] uppercase"
            >
              ← Review order
            </button>
            <p className="mt-2 text-center text-[10.5px] leading-relaxed text-[#8a8078]">
              Order <strong className="text-[#862222]">{orderNumber}</strong> place ho chuka hai — payment
              upar UPI se kariye. Page band karne par bhi ye link dobara kholne se payment chal jaayega.
            </p>
          </>
        ) : resumed ? (
          <>
            {/* Review se aage — payment step 3, isi page par */}
            <button
              type="button"
              onClick={() => goToPayment(resumed.orderNumber)}
              data-testid="review-continue-payment"
              className="mt-4 w-full bg-[#862222] py-3 text-[11.5px] font-semibold tracking-[.16em] text-white uppercase"
            >
              Continue to payment · {formatPrice(shownTotal)}
            </button>
            <p className="mt-2 text-center text-[10.5px] leading-relaxed text-[#8a8078]">
              Order <strong className="text-[#862222]">{resumed.orderNumber}</strong> already place ho chuka hai.
              Address badalna ho to WhatsApp par likhiye.
            </p>
          </>
        ) : showDetails ? (
          <button
            type="button"
            onClick={goToReview}
            data-testid="checkout-continue"
            className="mt-4 w-full bg-[#862222] py-3 text-[11.5px] font-semibold tracking-[.16em] text-white uppercase"
          >
            Continue to review
          </button>
        ) : (
          <>
            <button
              type="submit"
              data-testid="checkout-submit"
              disabled={submitting}
              className="mt-4 w-full bg-[#862222] py-3 text-[11.5px] font-semibold tracking-[.16em] text-white uppercase disabled:opacity-60"
            >
              {submitting ? "Placing order…" : `Place order & pay · ${formatPrice(total)}`}
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
          Final price is already sale price — no coupon needed. By placing this order you agree to our{" "}
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

  /**
   * Step 3 par shell `<div>` hai: UPI card ke andar apna `<form>` (last-4 confirm)
   * hota hai, aur nested form invalid HTML hai — outer submit bhi trigger ho jaata
   * (doosra order ban jaata). Isliye payment step par `<form>` render hi nahi hota.
   */
  if (isPayment) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]" data-testid="checkout-payment-step">
        {leftColumn}
        {summaryAside}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      {leftColumn}
      {summaryAside}
    </form>
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
  /**
   * Browser ka apna autofill bhi kaam kare (owner, R36) — saved details ke saath
   * mil kar customer ko dobara type nahi karna padta.
   */
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
