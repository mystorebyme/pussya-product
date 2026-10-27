"use client";

import { readJson } from "@/lib/http-json";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { openSizeGuide } from "@/lib/panels";
import { discountPercent, formatPrice } from "@/lib/format";
import { categoryHref, categoryLabel } from "@/lib/categories";
import { colourSwatch } from "@/lib/colour";
import type { ColourOption, Product } from "@/types/catalog";
import { ProductGallery } from "@/components/product-gallery";
import { Stars } from "@/components/product-reviews";
import { useStoreSettings } from "@/components/store-settings-provider";
import { ShippingNote } from "@/components/shipping-note";
import { productUrl } from "@/lib/whatsapp";
import { checkPincodeOffline } from "@/lib/pincode-offline";
import { whatsappNumber } from "@/lib/phone";

/** catalogue me hai lekin type import ke liye alias */
type Variant = ColourOption;

export function ProductDetail({
  product,
  colours = [],
  rating = 0,
  reviewCount = 0,
}: {
  product: Product;
  colours?: Variant[];
  /** synced reviews se aata hai (0 = abhi koi review nahi) */
  rating?: number;
  reviewCount?: number;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const { whatsapp } = useStoreSettings();

  // ek hi design ke saare colours yahin switch hote hain — page reload nahi
  const variants = useMemo<Variant[]>(() => {
    if (colours.length) return colours;
    return [
      {
        name: product.colourName ?? product.color,
        handle: product.handle,
        price: product.price,
        compareAtPrice: product.compareAtPrice,
        image: product.images[0] ?? "",
        images: product.images,
        sizes: product.sizes,
        sizePricing: product.sizePricing,
        inStock: product.inStock,
        colourCode: product.color,
      },
    ];
  }, [colours, product]);

  const [activeHandle, setActiveHandle] = useState(product.handle);
  const active = variants.find((variant) => variant.handle === activeHandle) ?? variants[0]!;

  const firstAvailable =
    active.sizes.find((size) => active.sizePricing?.[size]?.available) ?? active.sizes[0] ?? "Free Size";
  const [size, setSize] = useState(firstAvailable);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState<string | null>("details");
  const [pincode, setPincode] = useState("");
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinOk, setPinOk] = useState<boolean | null>(null);
  const [pinBusy, setPinBusy] = useState(false);

  const sizePricing = active.sizePricing?.[size];
  const price = sizePricing?.price ?? active.price;
  const compareAt = sizePricing?.compareAtPrice ?? active.compareAtPrice;
  const off = discountPercent(price, compareAt);
  const savings = useMemo(() => (compareAt ? compareAt - price : 0), [compareAt, price]);
  const bigSizeSurcharge = Boolean(sizePricing && sizePricing.price > active.price);

  function changeColour(handle: string) {
    if (handle === activeHandle) return;
    const next = variants.find((variant) => variant.handle === handle);
    if (!next) return;
    setActiveHandle(handle);
    const nextSize =
      next.sizes.find((option) => next.sizePricing?.[option]?.available) ?? next.sizes[0] ?? "Free Size";
    setSize(nextSize);
    setQuantity(1);
    // URL bhi usi colour ka — share/copy karne par wahi khulta hai
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/products/${handle}`);
    }
  }

  const sizeSoldOut = Boolean(sizePricing && sizePricing.available === false);
  const productSoldOut =
    !active.inStock ||
    active.sizes.every((option) => {
      const pricing = active.sizePricing?.[option];
      return pricing ? pricing.available === false : false;
    });

  function add(quantityOverride?: number) {
    // UI disabled hai, par keyboard/screen-reader se bhi guard — sold out kabhi cart me na jaye
    if (sizeSoldOut || productSoldOut) return;
    addItem(
      {
        handle: active.handle,
        title: active.title ?? product.title,
        price,
        compareAtPrice: compareAt ?? null,
        image: active.images[0],
        size,
        colour: active.name,
      },
      quantityOverride ?? quantity,
    );
  }

  async function checkPin() {
    const pin = pincode.trim();
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinOk(false);
      setPinMessage("Please enter a valid 6-digit pincode.");
      return;
    }
    setPinBusy(true);
    setPinMessage(null);
    try {
      // asli check: India Post data + admin ke state/pincode rules
      const response = await fetch(`/api/delivery/check?pincode=${encodeURIComponent(pin)}`, {
        cache: "no-store",
      });
      const parsed = await readJson<{
        data?: { serviceable: boolean; message: string; deliveryDays: string | null; district: string | null; state: string | null };
      }>(response);
      const result = parsed.data?.data ?? (await checkPincodeOffline(pin));
      if (!result) {
        setPinOk(false);
        setPinMessage("We could not check delivery right now. Please try again.");
        return;
      }
      setPinOk(result.serviceable);
      setPinMessage(
        result.serviceable
          ? `Delivering to ${pin}${result.district ? ` — ${result.district}, ${result.state}` : ""}. Delivery in ${result.deliveryDays ?? "4-7 business days"}.`
          : result.message,
      );
    } catch {
      const result = await checkPincodeOffline(pin);
      setPinOk(result.serviceable);
      setPinMessage(result.message);
    } finally {
      setPinBusy(false);
    }
  }

  const accordions = [
    {
      key: "details",
      title: "Product Details",
      content: product.descriptionHtml ? (
        <div
          className="product-rich text-[12.5px] leading-relaxed text-[#5c534b] [&_br]:block [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_strong]:font-semibold"
          // live store ka body_html — build script me sanitize hota hai (script/iframe/img/emoji/NOTE strip)
          dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
        />
      ) : (
        <ul className="space-y-1.5">
          {product.details.map((detail) => (
            <li key={detail} className="flex gap-2 text-[12.5px] leading-relaxed text-[#5c534b]">
              <span className="text-[#862222]">•</span>
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "shipping",
      title: "Shipping & Delivery",
      content: (
        <p className="text-[12.5px] leading-relaxed text-[#5c534b]">
          Ready to dispatch in 1-2 days. Prepaid orders only (UPI) —
          4-7 business days delivery. Cash on Delivery available nahi hai, isliye order place karte hi
          UPI se payment confirm kar lein.
        </p>
      ),
    },
    {
      key: "returns",
      title: "7 Days Replacement",
      content: (
        <p className="text-[12.5px] leading-relaxed text-[#5c534b]">
          Simply return it within 7 days for an exchange. The product must be unused with all tags
          intact. Raise a request on WhatsApp {whatsapp} with your order number.
        </p>
      ),
    },
    {
      key: "care",
      title: "Fabric Care",
      content: (
        <p className="text-[12.5px] leading-relaxed text-[#5c534b]">
          Dry clean only. Store in a muslin garment bag, avoid direct contact with perfume and
          deodorant, and iron on low heat from the reverse side.
        </p>
      ),
    },
  ];

  return (
    <div className="group grid gap-8 md:grid-cols-2 md:gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
      <ProductGallery
        key={active.handle}
        images={active.images}
        title={product.title}
        badge={off > 0 ? `Save ${off}%` : null}
      />

      <div className="lg:sticky lg:top-[92px] lg:self-start">
        <p className="text-[10.5px] tracking-[.16em] text-[#9c8f82] uppercase">
          <Link href={categoryHref(product.category)} className="hover:text-[#862222]">
            {categoryLabel(product.category)}
          </Link>
          {product.productType ? <span className="text-[#c9bdb1]"> · {product.productType}</span> : null}
        </p>
        <h1 className="mt-1.5 font-display text-[22px] leading-snug font-medium text-[#2f2a25] sm:text-[26px] lg:text-[30px]">
          {product.title}
        </h1>

        <button
          type="button"
          onClick={() => {
            document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="mt-2 flex items-center gap-1.5 text-[11.5px] text-[#6b6259] transition hover:text-[#862222]"
        >
          <Stars value={rating} size={13} />
          <span className="underline">
            {reviewCount > 0 ? `${reviewCount} reviews` : "Write the first review"}
          </span>
        </button>

        <div className="mt-3 flex flex-wrap items-baseline gap-2.5">
          <span className="text-[22px] font-semibold text-[#862222]" data-testid="product-price">
            {formatPrice(price)}
          </span>
          {compareAt && compareAt > price ? (
            <>
              <span className="text-[14px] text-[#a49a90] line-through">{formatPrice(compareAt)}</span>
              <span className="bg-[#fbeaea] px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[.06em] text-[#862222] uppercase">
                {off}% off
              </span>
            </>
          ) : null}
        </div>
        {savings > 0 ? (
          <p className="mt-1 text-[12px] text-[#2f7a3f]">You save {formatPrice(savings)} today</p>
        ) : null}
        <p className="mt-1 text-[11.5px] text-[#8a8078]">Inclusive of all taxes</p>

        {/* ── colour selector: ek hi product, colour badalne par sab kuch badalta hai ── */}
        {variants.length > 1 ? (
          <div className="mt-4" data-testid="colour-options">
            <p className="text-[11px] font-semibold tracking-[.14em] uppercase">
              Colour / style: <span className="text-[#862222]">{active.name}</span>{" "}
              <span className="font-normal text-[#9c8f82]">({variants.length} available)</span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {variants.map((variant) => {
                const selected = variant.handle === active.handle;
                return (
                  <button
                    key={variant.handle}
                    type="button"
                    onClick={() => changeColour(variant.handle)}
                    aria-pressed={selected}
                    aria-label={`Colour ${variant.name}`}
                    title={variant.name}
                    className={`flex items-center gap-2 border px-2.5 py-1.5 text-[11.5px] transition ${
                      selected
                        ? "border-[#862222] bg-[#fdf6f4] text-[#862222]"
                        : "border-[#e2d8cd] text-[#4a423b] hover:border-[#862222]"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: colourSwatch(variant.name) }}
                    />
                    {variant.name}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-y border-[#eee6de] py-3 text-[11.5px] text-[#6b6259]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#3ba55d]" /> Colour: {active.name}
          </span>
          <span>Fabric: {product.fabric}</span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[.14em] uppercase">
              Select size: <span className="text-[#862222]">{size}</span>
            </p>
            {/*
              R47: page par jaane ke bajaye wahi slide-over khulta hai (chart,
              naapne ka tareeqa, tips) — shopping flow tootta nahi. Panel me
              "Full size guide" link page ke liye bhi hai.
            */}
            <button
              type="button"
              onClick={openSizeGuide}
              aria-haspopup="dialog"
              data-testid="pdp-size-guide"
              className="text-[11px] text-[#862222] underline decoration-[#c9a449] underline-offset-2 transition hover:text-[#6d1b1b]"
            >
              Size guide
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {active.sizes.map((option) => {
              const optionPricing = active.sizePricing?.[option];
              const soldOut = optionPricing ? !optionPricing.available : false;
              return (
                <button
                  key={option}
                  type="button"
                  data-testid="size-option"
                  aria-pressed={size === option}
                  onClick={() => setSize(option)}
                  className={`min-w-11 border px-3 py-2 text-[12px] transition ${
                    size === option
                      ? "border-[#862222] bg-[#862222] text-white"
                      : soldOut
                        ? "border-[#eee6de] text-[#bdb2a7] line-through hover:border-[#ddd2c6]"
                        : "border-[#ddd2c6] text-[#4a423b] hover:border-[#862222]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#8a8078]">
            {bigSizeSurcharge
              ? `Bade size (${size.split(" ")[0]}) me extra fabric lagta hai — price Rs. ${Math.round(
                  (sizePricing!.price - active.price) / 100,
                )} zyada.`
              : "XL aur usse bade sizes par price thoda zyada hota hai."}
          </p>
          {sizeSoldOut ? (
            <p className="mt-1 text-[11.5px] text-[#b3261e]">
              {size} is out of stock — WhatsApp {whatsapp} for the next drop.
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex items-center border border-[#ddd2c6]">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="h-11 w-9 text-base"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-8 text-center text-[13px]">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              className="h-11 w-9 text-base"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => add()}
            data-testid="add-to-cart"
            disabled={sizeSoldOut || productSoldOut}
            className="flex-1 bg-[#862222] px-4 py-3 text-[11.5px] font-semibold tracking-[.16em] text-white uppercase transition hover:bg-[#6d1a1a] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sizeSoldOut || productSoldOut ? "Out of stock" : "Add to cart"}
          </button>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              if (sizeSoldOut || productSoldOut) return;
              add(1);
              router.push("/checkout");
            }}
            disabled={sizeSoldOut || productSoldOut}
            data-testid="buy-now"
            className="w-full border border-[#862222] py-3 text-[11.5px] font-semibold tracking-[.16em] text-[#862222] uppercase transition hover:bg-[#faf1ef] disabled:cursor-not-allowed disabled:border-[#ddd2c6] disabled:text-[#a49a90] disabled:hover:bg-transparent"
          >
            {sizeSoldOut || productSoldOut ? "Sold out" : "Buy it now"}
          </button>
          <a
            href={`https://wa.me/${whatsappNumber(whatsapp.replace(/\D/g, "").slice(-10))}?text=${encodeURIComponent(
              [
                `Hi Noor Ethnic Wear, I want to order:`,
                `${product.title}`,
                `Colour: ${active.name}`,
                `Size: ${size}`,
                `Quantity: ${quantity}`,
                `Price: ${formatPrice(price * quantity)}`,
                productUrl(product.handle),
              ].join("\n"),
            )}`}
            target="_blank"
            rel="noreferrer"
            data-testid="pdp-whatsapp-order"
            className="flex w-full items-center justify-center gap-2 border border-[#25D366] py-3 text-[11.5px] font-semibold tracking-[.14em] text-[#128c4b] uppercase transition hover:bg-[#f1fbf4]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1a11.6 11.6 0 0 1-5.9-5.2c-.4-.7-.6-1.4-.6-2 0-.6.3-1.2.6-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3-.1.5a7.5 7.5 0 0 0 3.3 2.9c.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.4 0 .2 0 .9-.2 1.4Z" />
            </svg>
            Order on WhatsApp
          </a>
        </div>

        <p className="mt-3 text-[11px] tracking-[.06em] text-[#8a8078]">
          <ShippingNote className="contents" withDelivery={false} /> · 7 days replacement
        </p>

        <div className="mt-4 border border-[#eee6de] bg-[#faf8f5] p-3">
          <p className="text-[10.5px] font-semibold tracking-[.14em] uppercase">Check delivery</p>
          <div className="mt-2 flex">
            <input
              value={pincode}
              onChange={(event) => setPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter pincode"
              inputMode="numeric"
              className="h-9 w-full border border-[#ddd2c6] bg-white px-2.5 text-[12px] outline-none focus:border-[#862222]"
            />
            <button
              type="button"
              onClick={checkPin}
              disabled={pinBusy}
              className="shrink-0 bg-[#222] px-3.5 text-[10.5px] font-semibold tracking-[.12em] text-white uppercase disabled:opacity-60"
            >
              {pinBusy ? "…" : "Check"}
            </button>
          </div>
          {pinMessage ? (
            <p
              className={`mt-1.5 text-[11.5px] leading-relaxed ${pinOk === false ? "text-[#a11d1d]" : "text-[#2f7a3f]"}`}
              role="status"
            >
              {pinMessage}
            </p>
          ) : null}
        </div>

        <div className="mt-5 divide-y divide-[#eee6de] border-y border-[#eee6de]">
          {accordions.map((item) => (
            <div key={item.key}>
              <button
                type="button"
                onClick={() => setOpenAccordion(openAccordion === item.key ? null : item.key)}
                aria-expanded={openAccordion === item.key}
                className="flex w-full items-center justify-between py-3 text-left text-[11.5px] font-semibold tracking-[.12em] uppercase"
              >
                {item.title}
                <span className="text-base leading-none text-[#862222]">
                  {openAccordion === item.key ? "−" : "+"}
                </span>
              </button>
              {openAccordion === item.key ? <div className="pb-3">{item.content}</div> : null}
            </div>
          ))}
        </div>


      </div>
    </div>
  );
}
