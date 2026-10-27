"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { apiUrl } from "@/lib/api-base";

/**
 * Page view beacon — `POST /api/track` (first-party, cookie-free).
 *
 * Owner ko "kaunse page par kitne log" dikhna chahiye. Vercel Analytics dashboard
 * toggle par depend nahi karte — counter apna hai (admin → Traffic).
 *
 * Ek session me ek page ek hi baar bhejte hain (back/forward par duplicate na ho),
 * aur tracking fail ho to page par koi asar nahi padta.
 */
export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (/^\/(api|_next|admin|_vercel)\b/.test(pathname)) return;

    try {
      const key = "noor:pageviews";
      const sent: string[] = JSON.parse(window.sessionStorage.getItem(key) ?? "[]");
      if (sent.includes(pathname)) return;
      window.sessionStorage.setItem(key, JSON.stringify([...sent, pathname].slice(-40)));
    } catch {
      // private mode / storage band — phir bhi bhej dete hain
    }

    const body = JSON.stringify({ path: pathname, ref: document.referrer || "" });
    try {
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const blob = new Blob([body], { type: "application/json" });
        if (navigator.sendBeacon(apiUrl("/api/track"), blob)) return;
      }
      void fetch(apiUrl("/api/track"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => undefined);
    } catch {
      // kabhi page break na ho
    }
  }, [pathname]);

  return null;
}
