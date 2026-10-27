"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

/**
 * GitHub Pages preview ka search — koi server nahi hota, isliye poora catalogue
 * ek static index se filter hota hai. Live site par yeh page use nahi hota.
 */
type Row = { handle: string; title: string; price: number; image: string; color: string; fabric: string; category: string };

const base = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";
const inr = (paise: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paise / 100);

export default function PreviewSearchPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [term, setTerm] = useState("");

  useEffect(() => {
    setTerm(new URLSearchParams(window.location.search).get("q") ?? "");
    fetch(`${base}/catalog-index.json`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Row[]) => setRows(data))
      .catch(() => setRows([]));
  }, []);

  const results = useMemo(() => {
    if (!rows) return [];
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return rows
      .filter((row) => {
        const haystack = `${row.title} ${row.color} ${row.fabric} ${row.category}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      })
      .slice(0, 60);
  }, [rows, term]);

  return (
    <div className="container-noor py-10">
      <h1 className="font-display text-[30px] font-medium">Search</h1>
      <form className="mt-4 flex max-w-[520px] gap-2" onSubmit={(event) => event.preventDefault()}>
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Anarkali, lehenga, black…"
          className="w-full border border-[#e0d6ca] px-3 py-2.5 text-[13px] outline-none focus:border-[#862222]"
        />
      </form>
      {rows === null ? <p className="mt-6 text-[12.5px] text-[#8a8078]">Catalogue load ho raha hai…</p> : null}
      {rows && !term ? (
        <p className="mt-6 text-[12.5px] text-[#8a8078]">Kuch type kariye — {rows.length} styles available.</p>
      ) : null}
      {term && rows ? (
        <p className="mt-4 text-[11.5px] tracking-[.12em] text-[#9c8f82] uppercase">{results.length} results</p>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-x-2.5 gap-y-7 sm:gap-x-5 lg:grid-cols-4">
        {results.map((row) => (
          <Link key={row.handle} href={`/products/${row.handle}`} className="group">
            <div className="aspect-[3/4] overflow-hidden bg-[#f6f1ec]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.image} alt={row.title} className="h-full w-full object-cover" loading="lazy" />
            </div>
            <p className="mt-2 line-clamp-2 text-center text-[12px] font-medium text-[#2f2a25]">{row.title}</p>
            <p className="mt-1 text-center text-[12px] font-semibold text-[#862222]">{inr(row.price)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
