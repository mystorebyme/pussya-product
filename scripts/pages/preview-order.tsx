"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { apiUrl, LIVE_STORE_URL } from "@/lib/api-base";
import { parseOrderPath } from "@/lib/public-order-path";
import { UpiPayment } from "@/components/upi-payment";

/**
 * GitHub Pages par **order page + payment page** (client-side).
 *
 * Pages par Node server nahi chalta, isliye `/orders/NE-…` aur
 * `/orders/NE-…/pay` static build me bante hi nahi the — customer ko 404 dikhta
 * tha ("payment hi nahi dikh raha"). Ye shell `404.html` ban kar GitHub Pages ki
 * jagah leta hai: URL se order number nikaal kar live store (Vercel) ke
 * `/api/orders/:id/public` se data laata hai aur wahi page dikha deta hai.
 *
 * Live site (Vercel) par ye page use nahi hota — wahan asli server page chalta hai.
 */

type PublicOrder = {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  customerName: string;
  city: string;
  state: string;
  pincode: string;
  phoneMasked: string;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  items: { title: string; handle: string; size: string; quantity: number; price: number; image: string | null }[];
  tracking: { courier?: string | null; awb?: string | null; url?: string | null } | null;
};

type Settings = { upiId: string; upiName: string; whatsapp: string };

const STATUS_COPY: Record<string, string> = {
  placed: "Order placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
const TIMELINE = ["placed", "confirmed", "packed", "shipped", "delivered"];

/**
 * Data na milne par live store (Vercel) ke usi page par bhej do — Pages par
 * server nahi hota, isliye API se jawab na aaye to customer ko dead-end na
 * dikhe: asli order/payment page wahan bilkul kaam karta hai.
 *
 * (API up ho to redirect nahi hota — page yahin render hota hai.)
 */
function goToLiveStore(livePath: string): boolean {
  const search = window.location.search || "";
  const target = `${LIVE_STORE_URL}${livePath}${search}`;
  try {
    // Safety: same origin par redirect = infinite reload loop. Aisa ho to ruk jao
    // aur seedha "khul nahi paaya" screen dikhao.
    if (new URL(target, window.location.href).origin === window.location.origin) return false;
  } catch {
    return false;
  }
  window.location.replace(target);
  return true;
}

export default function PreviewOrderPage() {
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error" | "not-order" | "redirecting">("loading");
  const [order, setOrder] = useState<PublicOrder | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pay, setPay] = useState(false);

  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";
    const parsed = parseOrderPath(window.location.pathname, base);
    if (!parsed) {
      setState("not-order");
      return;
    }
    setPay(parsed.pay);
    const { orderNumber, livePath } = parsed;
    let cancelled = false;

    /** API se jawab nahi aaya → live store ka wahi page (payment wahan chalta hai) */
    const fallbackToLiveStore = () => {
      if (cancelled) return;
      if (goToLiveStore(livePath)) {
        setState("redirecting");
      } else {
        setState("error");
      }
    };

    // API hi configure nahi (build me base missing) — seedha live store
    if (!apiUrl("/").replace(/\/+$/, "")) {
      fallbackToLiveStore();
      return;
    }

    // 12 second se zyada intezaar na karein — customer ko blank screen na mile
    const timer = setTimeout(fallbackToLiveStore, 12_000);

    (async () => {
      try {
        const [orderResponse, settingsResponse] = await Promise.all([
          fetch(apiUrl(`/api/orders/${encodeURIComponent(orderNumber)}/public`), { cache: "no-store" }),
          fetch(apiUrl("/api/settings"), { cache: "no-store" }).catch(() => null),
        ]);
        if (cancelled) return;
        clearTimeout(timer);
        const contentType = orderResponse.headers.get("content-type") ?? "";
        if (orderResponse.status === 404) {
          // Do tarah ke 404 hote hain:
          //   • JSON   → API chal rahi hai, par is number ka order nahi (galat number)
          //   • HTML   → API route hi maujood nahi (purana deploy) → live store par bhejo
          if (contentType.includes("application/json")) {
            setState("missing");
          } else {
            fallbackToLiveStore();
          }
          return;
        }
        if (!orderResponse.ok) {
          // purana deploy / route missing — live store par yahi page khul jayega
          fallbackToLiveStore();
          return;
        }
        const payload = (await orderResponse.json()) as { data: PublicOrder };
        setOrder(payload.data);
        if (settingsResponse?.ok) {
          const settingsPayload = (await settingsResponse.json()) as { data: Settings };
          setSettings(settingsPayload.data);
        }
        setState("ready");
      } catch {
        fallbackToLiveStore();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  if (state === "loading" || state === "redirecting") {
    return (
      <div className="container-noor py-16 text-center text-[13px] text-[#8a8078]">
        {state === "redirecting" ? "Payment page khul raha hai…" : "Order khul raha hai…"}
        <noscript>
          <span className="mt-2 block">
            JavaScript band hai — order dekhne ke liye yahan click kariye:{" "}
            <a className="underline" href={LIVE_STORE_URL}>
              {LIVE_STORE_URL.replace(/^https?:\/\//, "")}
            </a>
          </span>
        </noscript>
      </div>
    );
  }

  if (state === "not-order") {
    // koi doosra 404 — site ka normal "page nahi mila" screen
    return (
      <div className="container-noor py-16 text-center">
        <p className="text-[11px] tracking-[.2em] text-[#9c8f82] uppercase">404</p>
        <h1 className="mt-2 font-display text-[28px] font-medium">This page has moved on</h1>
        <p className="mt-2 text-[13px] text-[#6b6259]">
          Ye page maujood nahi hai. Naye arrivals aur sale dekhiye.
        </p>
        <a
          href={(process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "") + "/"}
          className="mt-5 inline-flex bg-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-white uppercase"
        >
          Back to home
        </a>
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="container-noor py-16 text-center">
        <h1 className="font-display text-[26px] font-medium">Order nahi mila</h1>
        <p className="mt-2 text-[13px] text-[#6b6259]">
          Order number dobara check kariye (jaise <span className="mono">NE-ABC123XYZ</span>) — ya WhatsApp par
          poochh lein.
        </p>
      </div>
    );
  }

  if (state === "error" || !order) {
    return (
      <div className="container-noor py-16 text-center">
        <h1 className="font-display text-[26px] font-medium">Order khul nahi paaya</h1>
        <p className="mt-2 text-[13px] text-[#6b6259]">Internet check karke page refresh kariye.</p>
        <a
          href={`${LIVE_STORE_URL}/track-order`}
          className="mt-4 inline-flex bg-[#862222] px-5 py-2.5 text-[11px] font-semibold tracking-[.14em] text-white uppercase"
        >
          Track order
        </a>
      </div>
    );
  }

  const paid = order.paymentStatus === "paid";
  const base = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";
  const currentStep = TIMELINE.indexOf(order.status);

  return (
    <div className="container-noor py-8 lg:py-12">
      <div className="mx-auto max-w-[760px]">
        <div className="border border-[#e9dfd4] bg-white p-5 sm:p-7">
          <p className="text-[10.5px] tracking-[.18em] text-[#9c8f82] uppercase">
            {pay ? "Step 2 of 2 — payment" : "Your order"}
          </p>
          <h1 className="mt-1 font-display text-[26px] leading-tight font-medium sm:text-[32px]">
            {paid ? "Order confirmed" : pay ? `Pay ${formatPrice(order.total)}` : `Order ${order.orderNumber}`}
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6259]">
            {paid
              ? "Payment mil gaya — order confirm hai aur dispatch ke liye taiyaar ho raha hai."
              : pay
                ? "Order place ho gaya hai. Neeche UPI se payment kariye — paisa milne par order confirm ho jayega."
                : "Order reserved hai. Payment complete karte hi order confirm ho jayega."}
          </p>

          <div className="mt-4 grid gap-3 border-y border-[#eee6de] py-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Order number</p>
              <p className="mt-0.5 font-display text-[17px] text-[#862222]">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Amount</p>
              <p className="mt-0.5 font-display text-[17px]">{formatPrice(order.total)}</p>
            </div>
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Items</p>
              <p className="mt-0.5 text-[12.5px] text-[#4a423b]">
                {order.items.length} {order.items.length === 1 ? "item" : "items"} · prepaid only
              </p>
            </div>
          </div>

          {!paid && pay && settings ? (
            <UpiPayment
              orderNumber={order.orderNumber}
              amount={order.total}
              upiId={settings.upiId}
              upiName={settings.upiName}
              paymentStatus={order.paymentStatus}
              reference={null}
              whatsapp={settings.whatsapp}
            />
          ) : null}

          <div className="mt-5">
            <h2 className="text-[11px] font-semibold tracking-[.14em] uppercase">Aapka order</h2>
            <ul className="mt-3 space-y-2.5">
              {order.items.map((item) => (
                <li key={`${item.handle}-${item.size}`} className="flex items-center gap-3">
                  <span className="h-14 w-11 shrink-0 overflow-hidden bg-[#f4efe9]">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] font-medium">{item.title}</span>
                    <span className="block text-[11px] text-[#8a8078]">
                      Size {item.size} · Qty {item.quantity}
                    </span>
                  </span>
                  <span className="text-[12.5px]">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t border-[#eee6de] pt-3 text-[12.5px]">
              Total payable <strong>{formatPrice(order.total)}</strong>
            </p>
            <p className="mt-1 text-[11.5px] text-[#8a8078]">
              Deliver to {order.customerName.split(" ")[0]}, {order.city} {order.pincode} · {order.phoneMasked}
            </p>
          </div>

          <div className="mt-5 border-t border-[#eee6de] pt-4">
            <p className="text-[11px] text-[#8a8078]">
              Status: <strong className="text-[#862222]">{STATUS_COPY[order.status] ?? order.status}</strong>
              {" · "}
              Payment: <strong>{paid ? "paid" : order.paymentStatus}</strong>
            </p>
            <ol className="mt-3 grid grid-cols-5 gap-1.5 text-center">
              {TIMELINE.map((step, index) => (
                <li key={step}>
                  <span
                    className={`block h-1 ${
                      currentStep >= index ? "bg-[#862222]" : "bg-[#eee6de]"
                    }`}
                  />
                  <span className="mt-1 block text-[9.5px] tracking-[.06em] text-[#8a8078] uppercase">
                    {STATUS_COPY[step]}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {!paid ? (
            <a
              href={`${base}/orders/${order.orderNumber}/pay`}
              className="mt-5 inline-flex bg-[#862222] px-5 py-2.5 text-[11px] font-semibold tracking-[.14em] text-white uppercase"
            >
              {pay ? "Order details dekhein" : "Complete payment"}
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
