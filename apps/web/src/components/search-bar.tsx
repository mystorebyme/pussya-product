"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [value, setValue] = useState(initialQuery);
  const router = useRouter();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      }}
      className="flex border border-[#ddd2c6]"
    >
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search products…"
        className="h-11 w-full bg-white px-3 text-[13px] outline-none"
      />
      <button
        type="submit"
        className="shrink-0 bg-[#862222] px-5 text-[10.5px] font-semibold tracking-[.14em] text-white uppercase"
      >
        Search
      </button>
    </form>
  );
}
