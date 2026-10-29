"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Admin list ko apne aap refresh karta hai (owner ask: "message submit karne ke
 * baad update ho jana chahiye"). Customer contact form bhar de to owner ko
 * manual reload ki zaroorat nahi — 15 second me list khud update ho jaati hai.
 */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      // tab background me ho to bekaar network na jaye
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
