"use client";

import { readJson } from "@/lib/http-json";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { navigationCollections } from "@/lib/collections";
import { formatPrice, imageUrl } from "@/lib/format";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import type { SearchHit } from "@/types/catalog";
import { useStoreSettings } from "@/components/store-settings-provider";
import { SafeImage } from "@/components/safe-image";
import { BrandLockup } from "@/components/brand-lockup";
import { whatsappNumber } from "@/lib/phone";

/**
 * Desktop nav — sirf wahi categories jo sach me products rakhti hain (khaali
 * collection par link nahi). Labels chhote hain taaki 1024px par bhi logo aur
 * icons ke beech me poora fit ho, koi overlap na ho.
 */
const quickLinks = [
  { label: "HOME", href: "/" },
  { label: "SHOP", href: "/collections" },
  { label: "ANARKALI", href: "/collections/party-wear-gown" },
  { label: "LEHENGA CHOLI", href: "/collections/lehnga-choli" },
  { label: "PRINTED SET", href: "/collections/printed-suit-set" },
  { label: "BEST SELLER", href: "/collections/best-seller" },
  { label: "NEW IN", href: "/collections/new-arrivals" },
  { label: "SALE", href: "/collections/sale" },
  { label: "CONTACT", href: "/pages/contact" },
];

// Fallback copy — admin → Settings se announcement set ho to wahi dikhta hai.
// R40: koi date/purana offer nahi (Diwali copy hata di) — sirf hamesha sach rehne wali baatein.
const defaultAnnouncements = [
  "Free shipping across India — every order",
  "Secure prepaid checkout — UPI se seedha payment",
  "Same-day dispatch on prepaid orders",
  "Designer anarkali, lehenga choli & printed suit sets",
];

export function SiteHeader() {
  const { count, openCart, lines, removeLine, setQuantity, subtotal } = useCart();
  const { wishlist } = useWishlist();
  const { whatsapp, supportPhone, announcement } = useStoreSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  // owner (admin ya Google Sheet) se announcement badalte hi header par wahi dikhta hai
  const announcements = announcement ? [announcement, ...defaultAnnouncements] : defaultAnnouncements;

  // announcement strip khud rotate kare (R40) — pehle sirf dots se badalta tha
  useEffect(() => {
    if (announcements.length < 2) return;
    const timer = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % announcements.length);
    }, 4_200);
    return () => window.clearInterval(timer);
  }, [announcements.length]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const [results, setResults] = useState<SearchHit[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [recommended, setRecommended] = useState<SearchHit[]>([]);
  // keyboard navigation (↑ ↓ Enter) + scroll-into-view — mobile par list ke end tak pahunchne ke liye
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);

  // search server par hoti hai -> client bundle me 400KB ka catalog nahi jaata
  useEffect(() => {
    if (!searchOpen) return;
    const term = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
          .then((response) => (response.ok ? readJson<{ results?: SearchHit[]; suggestions?: string[] }>(response) : null))
          .then((parsed) => parsed?.data ?? { results: [] })
          .then(
            (payload: {
              results?: SearchHit[];
              suggestions?: string[];
              recommended?: SearchHit[];
            }) => {
              setResults(payload.results ?? []);
              setSuggestions(payload.suggestions ?? []);
              setRecommended(payload.recommended ?? []);
            },
          )
          .catch(() => undefined);
      },
      term.length < 2 ? 0 : 220,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, searchOpen]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [query, searchOpen]);

  // active item ko panel ke andar scroll karo (page scroll nahi hota)
  useEffect(() => {
    const panel = searchPanelRef.current;
    if (!panel || activeIndex < 0) return;
    const items = panel.querySelectorAll<HTMLElement>("[data-search-item]");
    const item = items[activeIndex];
    if (!item) return;
    item.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeIndex]);

  const onSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const panel = searchPanelRef.current;
      if (!panel) return;
      const items = panel.querySelectorAll<HTMLElement>("[data-search-item]");
      if (!items.length) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1 >= items.length ? 0 : current + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current <= 0 ? items.length - 1 : current - 1));
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        items[activeIndex]?.click();
      } else if (event.key === "Escape") {
        setSearchOpen(false);
      }
    },
    [activeIndex],
  );

  const submitSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!query.trim()) return;
      setSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    },
    [query, router],
  );

  return (
    <>
      <div className="bg-[#7d1a1a] text-white">
        <div className="mx-auto flex min-h-9 max-w-[1400px] items-center justify-between gap-3 px-4 py-1.5">
          {/* WhatsApp hi contact option hai — call nahi (owner request).
              Number sirf sheet/owner settings se; khaali ho to button nahi dikhta. */}
          {supportPhone ? (
          <a
            href={`https://wa.me/${whatsappNumber(supportPhone.replace(/\D/g, "").slice(-10))}`}
            target="_blank"
            rel="noreferrer"
            className="hidden shrink-0 items-center gap-1.5 text-[11px] tracking-[.06em] md:flex"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1a11.6 11.6 0 0 1-5.9-5.2c-.4-.7-.6-1.4-.6-2 0-.6.3-1.2.6-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3-.1.5a7.5 7.5 0 0 0 3.3 2.9c.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.4 0 .2 0 .9-.2 1.4Z" />
            </svg>
            WhatsApp {supportPhone.replace(/\D/g, "").slice(-10)}
          </a>
          ) : null}

          {/* rotating announcement — sab screens par (mobile par akela) */}
          <p
            key={bannerIndex}
            className="animate-[fadeIn_.5s_ease] flex-1 text-center text-[10.5px] leading-tight tracking-[.1em] uppercase sm:text-[11.5px]"
          >
            {announcements[bannerIndex]}
          </p>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <span className="text-[11px] tracking-[.06em]">Premium Designer Collection ✦</span>
            {announcements.map((item, index) => (
              <button
                key={item}
                type="button"
                aria-label={`Announcement ${index + 1}`}
                onClick={() => setBannerIndex(index)}
                className={`h-1.5 w-1.5 rounded-full transition ${bannerIndex === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </div>

      <header
        className={`sticky top-0 z-40 border-b border-[#e9e2da] bg-white transition-shadow ${
          scrolled ? "shadow-[0_6px_24px_rgba(0,0,0,0.08)]" : ""
        }`}
      >
        {/* mobile: [menu] [logo center] [search · cart] — tablet/desktop: [logo] [nav] [icons] */}
        {/*
          Logo hamesha **center** (owner ask) —
          mobile: [menu] [LOGO] [icons] · desktop: [nav] [LOGO] [icons]
        */}
        <div className="mx-auto grid h-[66px] max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:h-[74px] sm:px-4 lg:h-[70px] lg:gap-4 lg:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            data-testid="mobile-menu"
            className="col-start-1 row-start-1 flex h-10 w-10 shrink-0 items-center justify-center justify-self-start lg:hidden"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>

          <Link
            href="/"
            aria-label="Noor Ethnic Wear home"
            className="col-start-2 row-start-1 flex min-w-0 shrink-0 items-center justify-center lg:col-start-2 lg:justify-center"
          >
            <BrandLockup />
          </Link>

          <div className="col-start-3 row-start-1 flex items-center justify-end gap-0.5 sm:gap-1.5 lg:col-start-3">
            <button
              type="button"
              onClick={() => setSearchOpen((open) => !open)}
              aria-label="Search"
              data-testid="header-search"
              className="flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#f6f1ec] hover:text-[#862222]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </button>
            <Link
              href="/account"
              aria-label="Account"
              className="hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#f6f1ec] hover:text-[#862222] md:flex"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
              </svg>
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              data-testid="header-wishlist"
              className="relative hidden h-9 w-9 items-center justify-center rounded-full transition hover:bg-[#f6f1ec] hover:text-[#862222] sm:flex"
            >
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1Z" />
              </svg>
              {wishlist.length > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#c2185b] px-1 text-[9px] font-semibold text-white">
                  {wishlist.length}
                </span>
              ) : null}
            </Link>
            <button
              type="button"
              onClick={openCart}
              aria-label="Open cart"
              data-testid="header-cart"
              className="relative flex h-9 items-center gap-1.5 px-1.5 transition hover:text-[#862222]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 7h12l1.2 13H4.8L6 7Z" />
                <path d="M9 7a3 3 0 0 1 6 0" />
              </svg>
              {/* count har size par (sm+), price sirf xl+ — 1024px par nav ke saath overlap na ho */}
              <span data-testid="cart-count" className="hidden text-[11px] font-medium tabular-nums sm:inline">
                {count}
                <span className="hidden xl:inline"> / {formatPrice(subtotal)}</span>
              </span>
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#862222] px-1 text-[9px] font-semibold text-white sm:hidden">
                {count}
              </span>
            </button>
          </div>
        </div>

        {/*
          R37 (owner: "header bar fix in desktop"): nav ab logo wali row ke **neeche**
          apni alag centered row me hai. Pehle nav `grid-cols-[1fr_auto_1fr]` ke 1fr
          column me thi — 1024–1440px par 8 links column se chaudi ho jaati thin aur
          centered logo ke upar chadh jaati thin (overlap). Alag row me har width par
          poora nav fit hota hai aur logo hamesha center rehta hai.
        */}
        <nav
          data-testid="desktop-nav"
          aria-label="Primary"
          className="hidden border-t border-[#f1ebe5] lg:block"
        >
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-center gap-x-5 gap-y-0.5 px-4 py-1.5 xl:gap-x-8">
            {quickLinks.map((link) => {
              // collection child pages bhi apne nav item ko highlight karein
              const active =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(`${link.href}/`));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative whitespace-nowrap py-1 text-[10.5px] font-medium tracking-[.08em] transition-colors hover:text-[#862222] xl:text-[11.5px] xl:tracking-[.1em] ${
                    active ? "text-[#862222]" : "text-[#222]"
                  }`}
                >
                  {link.label}
                  {link.label === "SALE" ? (
                    <span className="absolute -right-3 -top-0.5 rounded-sm bg-[#e02020] px-1 text-[8px] leading-[12px] font-bold text-white">
                      HOT
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </nav>

        {searchOpen ? (
          <div
            ref={searchPanelRef}
            data-testid="search-panel"
            onKeyDown={onSearchKeyDown}
            /* panel apne andar scroll hota hai — bahut results hone par bhi user niche tak pahunch sakta hai */
            className="max-h-[calc(100svh-72px)] overflow-y-auto overscroll-contain border-t border-[#eee6de] bg-white px-4 py-4 shadow-sm"
          >
            <form onSubmit={submitSearch} className="mx-auto max-w-[760px]">
              <div className="flex items-center gap-2 border border-[#d9cec3] px-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  autoFocus
                  data-testid="search-input"
                  aria-label="Search products"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search for anarkali suits, lehenga, printed suits…"
                  className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-[#9c9289]"
                />
                <button type="submit" className="text-[11px] font-semibold tracking-[.14em] uppercase text-[#862222]">
                  Search
                </button>
              </div>
              {suggestions.length > 0 ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] tracking-[.14em] text-[#9c9289] uppercase">Suggestions</span>
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="border border-[#ece3d9] px-2.5 py-1 text-[11.5px] text-[#5c534b] transition hover:border-[#862222] hover:text-[#862222]"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              ) : null}

              {results.length > 0 ? (
                <ul className="mt-2.5 divide-y divide-[#f0eae3] border border-[#f0eae3]" data-testid="search-suggestions">
                  {results.map((product, index) => (
                    <li key={product.handle}>
                      <Link
                        href={`/products/${product.handle}`}
                        data-search-item
                        aria-current={index === activeIndex ? "true" : undefined}
                        className="flex items-center gap-3 p-2 hover:bg-[#faf7f3] aria-[current=true]:bg-[#f6f1ec]"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <SafeImage src={imageUrl(product.images[0], 160)} alt={product.title} className="h-14 w-12 object-cover" />
                        <span className="flex-1 text-xs font-medium">{product.title}</span>
                        <span className="text-xs text-[#862222]">{formatPrice(product.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              {results.length > 0 ? (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={() => setSearchOpen(false)}
                  className="mt-2 block text-center text-[11px] font-semibold tracking-[.12em] text-[#862222] uppercase"
                >
                  View all results
                </Link>
              ) : null}

              {query.trim().length >= 2 && results.length === 0 ? (
                <p className="mt-3 text-[11.5px] text-[#8a8078]">
                  &ldquo;{query.trim()}&rdquo; ke liye kuch nahi mila — inhe try kariye:
                </p>
              ) : null}

              {recommended.length > 0 ? (
                <div className="mt-3">
                  <p className="text-[10px] tracking-[.14em] text-[#9c9289] uppercase">
                    {query.trim().length < 2 ? "Recommended for you" : "You may also like"}
                  </p>
                  <ul className="mt-1.5 divide-y divide-[#f0eae3] border border-[#f0eae3]">
                    {recommended.map((product, index) => (
                      <li key={product.handle}>
                        <Link
                          href={`/products/${product.handle}`}
                          onClick={() => setSearchOpen(false)}
                          data-search-item
                          aria-current={results.length + index === activeIndex ? "true" : undefined}
                          className="flex items-center gap-3 p-2 hover:bg-[#faf7f3] aria-[current=true]:bg-[#f6f1ec]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <SafeImage src={imageUrl(product.images[0], 160)} alt={product.title} className="h-14 w-12 object-cover" />
                          <span className="flex-1 text-xs font-medium">{product.title}</span>
                          <span className="text-xs text-[#862222]">{formatPrice(product.price)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </form>
          </div>
        ) : null}
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-[340px] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#eee6de] px-4 py-3">
              <Link href="/" onClick={() => setMobileOpen(false)} aria-label="Noor Ethnic Wear home">
                <BrandLockup size="compact" />
              </Link>
              <button type="button" onClick={() => setMobileOpen(false)} aria-label="Close" className="p-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M5 5l14 14M19 5 5 19" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center justify-between border-b border-[#f4efe9] px-5 py-3.5 text-[12.5px] font-medium tracking-[.09em]"
                >
                  {link.label}
                  {link.label === "SALE" ? (
                    <span className="rounded-sm bg-[#e02020] px-1.5 py-0.5 text-[9px] font-bold text-white">HOT</span>
                  ) : (
                    <span className="text-[#c4b8ac]">›</span>
                  )}
                </Link>
              ))}
              <div className="flex divide-x divide-[#f0eae3] border-b border-[#f4efe9]">
                <Link href="/wishlist" className="flex flex-1 items-center justify-center gap-2 py-3 text-[12px] font-medium">
                  Wishlist
                  {wishlist.length > 0 ? (
                    <span className="rounded-full bg-[#c2185b] px-1.5 text-[10px] font-semibold text-white">{wishlist.length}</span>
                  ) : null}
                </Link>
                <Link href="/account" className="flex flex-1 items-center justify-center gap-2 py-3 text-[12px] font-medium">
                  Account
                </Link>
                <Link href="/track-order" className="flex flex-1 items-center justify-center gap-2 py-3 text-[12px] font-medium">
                  Track order
                </Link>
              </div>
              <div className="px-5 py-4">
                <p className="mb-2 text-[11px] tracking-[.16em] text-[#9c9289] uppercase">Collections</p>
                <div className="flex flex-wrap gap-2">
                  {navigationCollections.slice(0, 6).map((collection) => (
                    <Link
                      key={collection.handle}
                      href={`/collections/${collection.handle}`}
                      className="border border-[#e5dbd0] px-2.5 py-1 text-[11px]"
                    >
                      {collection.title}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>
            <div className="border-t border-[#eee6de] px-5 py-4 text-[11.5px] text-[#5c534b]">
              <p className="font-medium text-[#862222]">WhatsApp {whatsapp}</p>
              <p className="mt-1">Support: Mon–Sat, 10 AM – 8 PM</p>
            </div>
          </div>
        </div>
      ) : null}

      <CartDrawer
        count={count}
        subtotal={subtotal}
        lines={lines}
        removeLine={removeLine}
        setQuantity={setQuantity}
      />
    </>
  );
}

function CartDrawer({
  count,
  subtotal,
  lines,
  removeLine,
  setQuantity,
}: {
  count: number;
  subtotal: number;
  lines: ReturnType<typeof useCart>["lines"];
  removeLine: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
}) {
  const { isOpen, closeCart, lastAdded } = useCart();
  const listRef = useRef<HTMLDivElement>(null);

  // naya item list ke sabse upar aata hai — drawer bhi top par scroll ho jaye
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [lastAdded?.key, lastAdded?.quantity]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" data-testid="cart-drawer" role="dialog" aria-modal="true" aria-label="Cart">
      <button type="button" aria-label="Close cart" onClick={closeCart} className="absolute inset-0 bg-black/45" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#eee6de] px-5 py-4">
          <h2 className="text-[13px] font-semibold tracking-[.16em] uppercase">Your cart ({count})</h2>
          <button type="button" onClick={closeCart} aria-label="Close cart" className="p-1.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 5l14 14M19 5 5 19" />
            </svg>
          </button>
        </div>
        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-[#6b6259]">Your cart is empty.</p>
            <Link
              href="/collections/party-wear-gown"
              onClick={closeCart}
              className="bg-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
            >
              Shop Anarkali Suits
            </Link>
          </div>
        ) : (
          <>
            <div ref={listRef} className="flex-1 overflow-y-auto px-5">
              {lines.map((line) => (
                <div
                  key={line.key}
                  data-testid={line.key === lastAdded?.key ? "cart-just-added" : undefined}
                  className={`flex gap-3 border-b border-[#f1ebe5] py-4 ${
                    line.key === lastAdded?.key ? "bg-[#fdf7f5]" : ""
                  }`}
                >
                  <Link href={`/products/${line.handle}`} onClick={closeCart} className="shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <SafeImage src={line.image} alt={line.title} className="h-24 w-20 object-cover" />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <Link
                      href={`/products/${line.handle}`}
                      onClick={closeCart}
                      className="text-[12.5px] font-medium leading-snug hover:text-[#862222]"
                    >
                      {line.title}
                    </Link>
                    {line.key === lastAdded?.key ? (
                      <span className="mt-1 w-max bg-[#eaf5ec] px-1.5 py-0.5 text-[9.5px] font-semibold tracking-[.08em] text-[#2f7a3f] uppercase">
                        Just added
                      </span>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-[#8a8078]">
                      Size: {line.size}
                      {line.colour ? ` · ${line.colour}` : ""}
                    </p>
                    <p className="mt-1 text-[12.5px] font-semibold text-[#862222]">{formatPrice(line.price)}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center border border-[#e2d8cd]">
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key, line.quantity - 1)}
                          className="h-7 w-7 text-sm"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-xs">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => setQuantity(line.key, line.quantity + 1)}
                          className="h-7 w-7 text-sm"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(line.key)}
                        className="text-[10.5px] tracking-[.08em] text-[#9a8f85] uppercase underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-[#eee6de] px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="tracking-[.1em] uppercase">Subtotal</span>
                <span className="font-semibold text-[#862222]">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-[11px] text-[#8a8078]">
                Free shipping across India · prepaid orders dispatch same day
              </p>
              <Link
                href="/cart"
                onClick={closeCart}
                className="mt-3 block border border-[#862222] py-3 text-center text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase"
              >
                View cart
              </Link>
              <Link
                href="/checkout"
                onClick={closeCart}
                className="mt-2 block bg-[#862222] py-3 text-center text-[11px] font-semibold tracking-[.16em] text-white uppercase"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
