"use client";

import { useEffect } from "react";

/** ?print=1 par browser ka print dialog khud khul jaata hai (Save as PDF ke liye). */
export function AutoPrint() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("print")) return;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, []);
  return null;
}
