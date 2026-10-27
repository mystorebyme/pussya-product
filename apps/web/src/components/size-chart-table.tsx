"use client";

import { useState } from "react";
import { SIZE_COLUMNS, SIZE_ROWS, toCm } from "@/lib/size-chart";

/**
 * Size chart table + inches/cm toggle — **ek hi component** jo size-guide panel
 * aur `/pages/size-guide` page dono me chalta hai (numbers ek jagah se aate hain).
 */
export function SizeChartTable({ compact = false }: { compact?: boolean }) {
  const [unit, setUnit] = useState<"in" | "cm">("in");
  return (
    <div data-testid="size-chart-table">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold tracking-[.16em] text-[#2f2a25] uppercase">
          Ready-to-wear chart
        </h3>
        <div
          className="flex overflow-hidden rounded-full border border-[#e2d6c8] p-0.5"
          role="group"
          aria-label="Measurement units"
        >
          {(["in", "cm"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setUnit(value)}
              aria-pressed={unit === value}
              className={`rounded-full px-3 py-1 text-[10.5px] font-semibold tracking-[.1em] uppercase transition ${
                unit === value ? "bg-[#862222] text-white" : "text-[#7b6f64] hover:text-[#862222]"
              }`}
            >
              {value === "in" ? "Inches" : "Cm"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[#eee6de]">
        <table className="w-full min-w-[420px] border-collapse text-[12px]">
          <thead>
            <tr className="bg-[#862222] text-white">
              <th className="px-3 py-2 text-left text-[10px] font-medium tracking-[.1em] uppercase">Size</th>
              {SIZE_COLUMNS.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left text-[10px] font-medium tracking-[.1em] uppercase">
                  {column.label} ({unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZE_ROWS.map((row) => (
              <tr key={row.size} className="border-b border-[#f1e9df] last:border-0 even:bg-[#faf7f3]">
                <td className="px-3 py-2.5 text-[11.5px] font-semibold text-[#2f2a25]">{row.size}</td>
                {SIZE_COLUMNS.map((column) => (
                  <td key={column.key} className="px-3 py-2.5 tabular-nums text-[#4b443d]">
                    {unit === "in" ? row[column.key] : toCm(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`mt-2 leading-relaxed text-[#9c8f82] ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}>
        Bottom length suit ke bottom / palazzo ke liye hai. Anarkali aur lehenga ki length product page par di
        hoti hai. Hand-finished pieces me 0.5–1 inch ka farq normal hai.
      </p>
    </div>
  );
}
