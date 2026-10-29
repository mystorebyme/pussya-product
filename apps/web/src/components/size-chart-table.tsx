"use client";

import {
  FIT_LABEL,
  SIZE_COLUMNS,
  SIZE_ROWS,
  type SizeColumnKey,
} from "@/lib/size-chart";

/**
 * Size chart table — **ek hi component** jo size-guide panel ka "Measurements
 * Chart" tab aur `/pages/size-guide` page dono use karte hain (numbers ek jagah
 * se aate hain, `lib/size-chart.ts`).
 *
 * R48 (owner): chart XS–XXL hai aur dono units — inches (in) aur centimetres
 * (cm). Unit `SizeGuideContent` ke toggle se aata hai, isliye tab badalne par
 * bhi selection bana rehta hai.
 */
export function SizeChartTable({
  unit = "in",
  compact = false,
}: {
  unit?: "in" | "cm";
  compact?: boolean;
}) {
  return (
    <div data-testid="size-chart-table" data-unit={unit}>
      <p className="text-[10.5px] tracking-[.18em] text-[#a67c2e] uppercase">{FIT_LABEL}</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#eee6de]">
        <table className="w-full min-w-[460px] border-collapse text-[12px]">
          <caption className="sr-only">
            Noor Ethnic Wear size chart — XS to XXL, bust, waist, hips and front length in{" "}
            {unit === "in" ? "inches" : "centimetres"}
          </caption>
          <thead>
            <tr className="bg-[#862222] text-white">
              <th
                scope="col"
                className="px-3 py-2 text-left text-[10px] font-medium tracking-[.1em] uppercase"
              >
                Size
              </th>
              {SIZE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="px-3 py-2 text-left text-[10px] font-medium tracking-[.1em] uppercase"
                >
                  {column.label} ({unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SIZE_ROWS.map((row) => (
              <tr
                key={row.size}
                className="border-b border-[#f1e9df] last:border-0 even:bg-[#faf7f3]"
                data-testid="size-chart-row"
              >
                <th
                  scope="row"
                  className="px-3 py-2.5 text-left text-[11.5px] font-semibold text-[#2f2a25]"
                >
                  {row.size}
                </th>
                {SIZE_COLUMNS.map((column) => (
                  <td
                    key={column.key}
                    className="px-3 py-2.5 tabular-nums text-[#4b443d]"
                    data-column={column.key}
                  >
                    {unit === "in" ? row[column.key as SizeColumnKey] : row.cm[column.key as SizeColumnKey]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={`mt-2 leading-relaxed text-[#9c8f82] ${compact ? "text-[10.5px]" : "text-[11.5px]"}`}>
        Front length runs from the shoulder to the hem (kurti/top). Anarkali, lehenga and dupatta lengths are
        listed on the product page. A 0.5–1 inch difference is normal on hand-finished pieces.
      </p>
    </div>
  );
}
