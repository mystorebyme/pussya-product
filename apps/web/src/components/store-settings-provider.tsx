"use client";

import { readJson } from "@/lib/http-json";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { API_AVAILABLE, apiUrl } from "@/lib/api-base";

/**
 * Owner-editable store details (phone, WhatsApp, email, UPI ID, announcement).
 *
 * Source: admin settings (Postgres/JSON) + owner ki Google Sheet — server
 * `/api/settings` par merge karke deta hai. Client har **15s** me, tab focus par
 * turant, aur payment page par `fresh=1` ke saath refresh karta hai — sheet me
 * badla number/UPI site par bina reload dikhta hai.
 *
 * API na ho (GitHub Pages static preview) to niche wale defaults dikhte hain —
 * layout tootta nahi, koi error toast nahi.
 */
export type PublicSettings = {
  announcement: string;
  dailySpecial: string;
  upiId: string;
  upiName: string;
  supportPhone: string;
  /** @deprecated site par kahin dikhta nahi (owner rule) — sirf internal record */
  supportEmail?: string;
  whatsapp: string;
  freeShipping: boolean;
  /**
   * R48 — YouPI PG public config (browser `youpi.js` embed karta hai).
   * Webhook secret jaan-boojhkar **public type me nahi** hai — wo sirf server
   * par rehta hai (`lib/youpi.ts`).
   */
  youpiEnabled?: boolean;
  youpiPayUrl?: string;
  youpiMerchantId?: string;
  updatedAt?: string;
};

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  /** R50: static preview (GitHub Pages) me header/ribbon pehle HTML me hi dikhe */
  announcement: process.env.NEXT_PUBLIC_ANNOUNCEMENT ?? "",
  dailySpecial: process.env.NEXT_PUBLIC_DAILY_SPECIAL ?? "",
  /* R38: UPI sirf sheet se — koi hardcoded payee default nahi (khaali = payment paused UI). */
  upiId: "",
  upiName: "Noor Ethnic Wear",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
  /** R50: number ka asli source Sheet hai; ye sirf static-build fallback hai */
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
  freeShipping: true,
  /**
   * Static preview (GitHub Pages) par `/api/settings` nahi hota, isliye gateway
   * ka public config build-time env se aata hai. Server available ho to sheet ki
   * live value jeetti hai (public API override karta hai).
   */
  youpiEnabled: (process.env.NEXT_PUBLIC_YOUPI_ENABLED ?? "true").toLowerCase() !== "false",
  youpiPayUrl: process.env.NEXT_PUBLIC_YOUPI_PAY_URL ?? "",
  youpiMerchantId: process.env.NEXT_PUBLIC_YOUPI_MERCHANT_ID ?? "",
};

/** Sheet ka change kitni der me browser tak pahunche (tab focus par turant hota hi hai). */
/* R37 (owner): "instant means instant" — 15s → 3s poll. */
const POLL_MS = 3_000;

type ContextValue = {
  settings: PublicSettings;
  /** `fresh: true` → server sheet se abhi padh kar jawab deta hai (payment page) */
  refresh: (options?: { fresh?: boolean }) => Promise<void>;
  /** pehli fetch poori ho chuki (defaults vs live farq batane ke liye) */
  ready: boolean;
  /** server se asli value mil chuki hai (false = abhi bhi defaults dikh rahe hain) */
  live: boolean;
};

const StoreSettingsContext = createContext<ContextValue>({
  settings: DEFAULT_PUBLIC_SETTINGS,
  refresh: async () => undefined,
  ready: false,
  live: false,
});

export function StoreSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PublicSettings>(DEFAULT_PUBLIC_SETTINGS);
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState(false);

  const refresh = useCallback(async (options?: { fresh?: boolean }) => {
    if (!API_AVAILABLE) {
      setReady(true);
      return;
    }
    try {
      const response = await fetch(apiUrl(options?.fresh ? "/api/settings?fresh=1" : "/api/settings"), {
        cache: "no-store",
      });
      if (!response.ok) return;
      const parsed = await readJson<{ data?: Partial<PublicSettings> }>(response);
      const data = parsed.data?.data;
      if (!data) return;
      setSettings((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined && value !== "")),
      }) as PublicSettings);
      setLive(true);
    } catch {
      // offline / API down — defaults hi rehne do
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!API_AVAILABLE) return;
    // sheet change → site: tab wapas focus par turant, warna har POLL_MS me
    const onFocus = () => void refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(onVisible, POLL_MS);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh]);

  return (
    <StoreSettingsContext.Provider value={{ settings, refresh, ready, live }}>{children}</StoreSettingsContext.Provider>
  );
}

export function useStoreSettings(): PublicSettings {
  return useContext(StoreSettingsContext).settings;
}

export function useStoreSettingsState(): ContextValue {
  return useContext(StoreSettingsContext);
}
