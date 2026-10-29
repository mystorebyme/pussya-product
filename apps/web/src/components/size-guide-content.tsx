"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  BUST_QUICK_PICKS,
  FIT_LABEL,
  FIT_TIPS,
  MEASURE_STEPS,
  SIZE_ROWS,
  SIZE_TABS,
  UNSTITCHED_NOTE,
  findSizeForBust,
  type SizeTabId,
} from "@/lib/size-chart";
import { SizeChartTable } from "@/components/size-chart-table";
import { useStoreSettings } from "@/components/store-settings-provider";
import { whatsappNumber } from "@/lib/phone";

/**
 * Size guide ki poori body — **ek hi component** panel aur
 * `/pages/size-guide` page dono me.
 *
 * R48 (owner ne poora spec diya):
 *   1. Measurements Chart — unit toggle (Inches/Centimeters) + XS–XXL chart
 *   2. Find My Size — bust daal kar recommended size + quick picks
 *   3. How to Measure — 4 numbered steps, har ek ke saath pro-tip
 *   + unstitched suit ka fabric note (2.5 m / 2.5 m / 2.25 m, tailor XS–5XL)
 *
 * Numbers `lib/size-chart.ts` se aate hain — page aur panel kabhi alag na ho.
 */
export function SizeGuideContent({
  variant = "panel",
  defaultTab = "chart",
  onNavigate,
}: {
  variant?: "panel" | "page";
  defaultTab?: SizeTabId;
  /** panel me "Full size guide" link dabane par panel band ho */
  onNavigate?: () => void;
}) {
  const [tab, setTab] = useState<SizeTabId>(defaultTab);
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [bustInput, setBustInput] = useState("");
  const [submitted, setSubmitted] = useState<number | null>(null);
  const { whatsapp, supportPhone } = useStoreSettings();
  const contactNumber = (whatsapp || supportPhone).replace(/\D/g, "").slice(-10);
  const tabId = useId();
  const compact = variant === "panel";

  const recommendation = useMemo(
    () => (submitted === null ? null : findSizeForBust(submitted, unit)),
    [submitted, unit],
  );

  const quickPicks = useMemo(
    () => BUST_QUICK_PICKS.map((inch) => ({ inch, cm: SIZE_ROWS.find((row) => row.bust === inch)?.cm.bust ?? Math.round(inch * 2.54) })),
    [],
  );

  function pickBust(inch: number) {
    setBustInput(unit === "in" ? String(inch) : String(quickPicks.find((pick) => pick.inch === inch)?.cm ?? inch));
    setSubmitted(unit === "in" ? inch : quickPicks.find((pick) => pick.inch === inch)?.cm ?? inch);
  }

  return (
    <div data-testid="size-guide-content" data-variant={variant}>
      <p className={`text-[#5c534b] leading-relaxed ${compact ? "text-[12px]" : "text-[13px]"}`}>
        Most of our suits are ready-to-wear. Compare your body measurements with the chart — if you are unsure,
        size up or send us your bust, waist and height on WhatsApp.
      </p>
      <p className="mt-2 text-[10.5px] font-semibold tracking-[.16em] text-[#a67c2e] uppercase" data-testid="size-fit-label">
        {FIT_LABEL}
      </p>

      {/* ── tabs ── */}
      <div
        role="tablist"
        aria-label="Size guide"
        data-testid="size-guide-tabs"
        className="mt-4 flex flex-wrap gap-1 border-b border-[#eee6de] pb-0"
      >
        {SIZE_TABS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${tabId}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${tabId}-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              data-testid={`size-tab-${item.id}`}
              className={`-mb-px border-b-2 px-3 py-2 text-[10.5px] font-semibold tracking-[.1em] uppercase transition ${
                active
                  ? "border-[#862222] text-[#862222]"
                  : "border-transparent text-[#7b6f64] hover:border-[#d9c6b4] hover:text-[#862222]"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {/* ── unit toggle (chart + find dono par) ── */}
      {tab !== "how" ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10.5px] tracking-[.14em] text-[#9c8f82] uppercase">Measurement unit</p>
          <div
            className="flex overflow-hidden rounded-full border border-[#e2d6c8] p-0.5"
            role="group"
            aria-label="Measurement units"
            data-testid="size-unit-toggle"
          >
            {(
              [
                { value: "in", label: "Inches (in)" },
                { value: "cm", label: "Centimeters (cm)" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setUnit(option.value);
                  setSubmitted(null);
                  setBustInput("");
                }}
                aria-pressed={unit === option.value}
                data-testid={`size-unit-${option.value}`}
                className={`rounded-full px-3 py-1 text-[10px] font-semibold tracking-[.08em] uppercase transition ${
                  unit === option.value ? "bg-[#862222] text-white" : "text-[#7b6f64] hover:text-[#862222]"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── tab 1: measurements chart ── */}
      {tab === "chart" ? (
        <div
          role="tabpanel"
          id={`${tabId}-panel-chart`}
          aria-labelledby={`${tabId}-tab-chart`}
          data-testid="size-guide-panel-chart"
          className="mt-3"
        >
          <SizeChartTable unit={unit} compact={compact} />
          <UnstitchedNote compact={compact} />
        </div>
      ) : null}

      {/* ── tab 2: find my size ── */}
      {tab === "find" ? (
        <div
          role="tabpanel"
          id={`${tabId}-panel-find`}
          aria-labelledby={`${tabId}-tab-find`}
          data-testid="size-guide-panel-find"
          className="mt-3"
        >
          <form
            className="rounded-lg border border-[#eadfce] bg-[#faf6f1] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const value = Number(bustInput.replace(/[^\d.]/g, ""));
              if (Number.isFinite(value) && value > 0) setSubmitted(value);
            }}
          >
            <label
              htmlFor={`${tabId}-bust`}
              className="text-[11px] font-semibold tracking-[.12em] text-[#2f2a25] uppercase"
            >
              Enter your bust ({unit === "in" ? "inches" : "cm"})
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                id={`${tabId}-bust`}
                value={bustInput}
                onChange={(event) => setBustInput(event.target.value.replace(/[^\d.]/g, "").slice(0, 5))}
                inputMode="decimal"
                placeholder={unit === "in" ? "e.g. 38" : "e.g. 95"}
                data-testid="find-size-input"
                className="h-10 w-[140px] border border-[#ddd2c6] bg-white px-3 text-[13px] text-[#2f2a25] outline-none focus:border-[#862222]"
              />
              <button
                type="submit"
                data-testid="find-size-submit"
                className="h-10 bg-[#862222] px-4 text-[10.5px] font-semibold tracking-[.12em] text-white uppercase transition hover:bg-[#6d1b1b]"
              >
                Find my size
              </button>
            </div>

            <p className="mt-3 text-[10.5px] tracking-[.12em] text-[#9c8f82] uppercase">Or quick select</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {quickPicks.map((pick) => {
                const label = unit === "in" ? `${pick.inch}″` : `${pick.cm} cm`;
                return (
                  <button
                    key={pick.inch}
                    type="button"
                    onClick={() => pickBust(pick.inch)}
                    aria-pressed={recommendation?.bust === pick.inch}
                    data-testid="find-size-quick"
                    className={`h-8 rounded-full border px-3 text-[10.5px] font-semibold tracking-[.06em] transition ${
                      recommendation?.bust === pick.inch
                        ? "border-[#862222] bg-[#862222] text-white"
                        : "border-[#e2d6c8] bg-white text-[#6b6259] hover:border-[#862222] hover:text-[#862222]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </form>

          {recommendation ? (
            <div
              className="mt-3 border border-[#e6d3a8] bg-[#fdf9ee] px-4 py-3.5"
              data-testid="find-size-result"
              aria-live="polite"
            >
              <p className="text-[10.5px] tracking-[.16em] text-[#a67c2e] uppercase">Recommended</p>
              <p className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="font-display text-[24px] leading-none text-[#862222]">
                  Size {recommendation.size}
                </span>
                <span className="rounded-full bg-[#862222] px-2 py-0.5 text-[9.5px] font-semibold tracking-[.1em] text-white uppercase">
                  Best fit
                </span>
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-[#5c534b]">{recommendation.message}</p>
              <p className="mt-1 text-[11px] text-[#8a7a5f]">
                On the chart: bust {sizeCell(recommendation.size, "bust", unit)} · waist{" "}
                {sizeCell(recommendation.size, "waist", unit)} · hips {sizeCell(recommendation.size, "hip", unit)} · front
                length {sizeCell(recommendation.size, "frontLength", unit)}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[12px] leading-relaxed text-[#8a7f75]" data-testid="find-size-hint">
              Enter your bust and tap &ldquo;Find my size&rdquo; — we read the ready-to-wear chart and show your most
              comfortable size. If you are between two sizes, choose the larger one.
            </p>
          )}

          <UnstitchedNote compact={compact} />
        </div>
      ) : null}

      {/* ── tab 3: how to measure ── */}
      {tab === "how" ? (
        <div
          role="tabpanel"
          id={`${tabId}-panel-how`}
          aria-labelledby={`${tabId}-tab-how`}
          data-testid="size-guide-panel-how"
          className="mt-3"
        >
          <ol className="space-y-3">
            {MEASURE_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3" data-testid="measure-step">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4ece2] text-[11px] font-semibold text-[#862222]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-[#2f2a25]">{step.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[#5c534b]">{step.body}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#8a6a1f]">
                    <span className="font-semibold tracking-[.06em] uppercase">Pro tip:</span> {step.proTip}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-5 text-[11px] font-semibold tracking-[.16em] text-[#2f2a25] uppercase">Fit tips</h3>
          <ul className="mt-2 space-y-1.5">
            {FIT_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2 text-[12px] leading-relaxed text-[#5c534b]">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#a67c2e]" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* ── help ── */}
      <div className="mt-5 rounded-lg border border-[#eadfce] bg-[#faf6f1] p-4" data-testid="size-guide-help">
        <p className="text-[12px] leading-relaxed text-[#5c534b]">
          Still unsure? Send us your bust, waist and height — we will tell you the right size.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {contactNumber ? (
            <a
              href={`https://wa.me/${whatsappNumber(contactNumber)}?text=${encodeURIComponent(
                "Hi Noor Ethnic Wear, please help me pick the right size.",
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center bg-[#862222] px-5 text-[10.5px] font-semibold tracking-[.14em] text-white uppercase transition hover:bg-[#6d1b1b]"
            >
              Ask on WhatsApp
            </a>
          ) : null}
          {variant === "panel" ? (
            <Link
              href="/pages/size-guide"
              onClick={onNavigate}
              className="inline-flex h-10 items-center border border-[#862222] px-5 text-[10.5px] font-semibold tracking-[.14em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white"
            >
              Full size guide
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** recommended size ka ek cell — unit ke hisaab se */
function sizeCell(size: string, column: "bust" | "waist" | "hip" | "frontLength", unit: "in" | "cm") {
  const row = SIZE_ROWS.find((candidate) => candidate.size === size);
  if (!row) return "—";
  return unit === "in" ? `${row[column]}″` : `${row.cm[column]} cm`;
}

/** Unstitched fabric note — owner ne explicitly maanga (metres + tailor XS–5XL) */
function UnstitchedNote({ compact }: { compact: boolean }) {
  return (
    <div
      className="mt-4 rounded-lg border border-[#e2d6c8] bg-white px-4 py-3"
      data-testid="unstitched-note"
    >
      <p className="text-[10.5px] font-semibold tracking-[.14em] text-[#862222] uppercase">
        {UNSTITCHED_NOTE.title}
      </p>
      <ul className={`mt-1.5 space-y-0.5 ${compact ? "text-[11.5px]" : "text-[12.5px]"} text-[#5c534b]`}>
        {UNSTITCHED_NOTE.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#a67c2e]" />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#8a7f75]">{UNSTITCHED_NOTE.sizes}</p>
    </div>
  );
}
