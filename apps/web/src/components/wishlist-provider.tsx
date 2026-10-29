"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Wishlist + compare — dono localStorage me (guest checkout ke saath consistent).
 * Sirf handles store hote hain; product ka poora data catalog se aata hai,
 * isliye price/stock hamesha fresh rehta hai.
 */

type LibraryValue = {
  wishlist: string[];
  compare: string[];
  ready: boolean;
  isWished: (handle: string) => boolean;
  toggleWishlist: (handle: string) => void;
  isCompared: (handle: string) => boolean;
  toggleCompare: (handle: string) => void;
  clearCompare: () => void;
  clearWishlist: () => void;
};

const WishlistContext = createContext<LibraryValue | null>(null);

const WISHLIST_KEY = "noor:wishlist:v1";
const COMPARE_KEY = "noor:compare:v1";
export const COMPARE_LIMIT = 4;

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setWishlist(read(WISHLIST_KEY));
    setCompare(read(COMPARE_KEY));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
    } catch {
      /* ignore */
    }
  }, [wishlist, ready]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
    } catch {
      /* ignore */
    }
  }, [compare, ready]);

  const toggleWishlist = useCallback((handle: string) => {
    setWishlist((current) =>
      current.includes(handle) ? current.filter((item) => item !== handle) : [handle, ...current],
    );
  }, []);

  const toggleCompare = useCallback((handle: string) => {
    setCompare((current) => {
      if (current.includes(handle)) return current.filter((item) => item !== handle);
      return [handle, ...current].slice(0, COMPARE_LIMIT);
    });
  }, []);

  const value = useMemo<LibraryValue>(
    () => ({
      wishlist,
      compare,
      ready,
      isWished: (handle) => wishlist.includes(handle),
      toggleWishlist,
      isCompared: (handle) => compare.includes(handle),
      toggleCompare,
      clearCompare: () => setCompare([]),
      clearWishlist: () => setWishlist([]),
    }),
    [wishlist, compare, ready, toggleWishlist, toggleCompare],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): LibraryValue {
  const context = useContext(WishlistContext);
  if (!context) throw new Error("useWishlist must be used within a WishlistProvider");
  return context;
}
