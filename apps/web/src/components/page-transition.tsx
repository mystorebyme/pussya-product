"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * R47 — page change par halka fade + slide (0.34s).
 *
 * Sirf CSS animation hai (JS se kuch measure nahi hota), isliye scroll aur
 * back/forward dono smooth rehte hain aur `prefers-reduced-motion` par band ho
 * jaati hai. `key={pathname}` se animation har naye page par dobara chalti hai.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
