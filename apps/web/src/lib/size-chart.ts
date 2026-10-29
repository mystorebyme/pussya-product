/**
 * Size guide — **ek hi source of truth**.
 *
 * Kahan dikhta hai:
 *   1. header ka "Size guide" → slide-over panel (`components/size-guide-dialog.tsx`)
 *   2. product page ka "Size guide" link → wahi panel
 *   3. `/pages/size-guide` par poora page (SEO ke liye, panel ka same data)
 *
 * R48 (owner): Saga jaisa poora size guide —
 *   • 3 tabs: Measurements Chart / Find My Size / How to Measure
 *   • unit toggle: Inches (in) / Centimeters (cm)
 *   • chart XS–XXL (Bust / Waist / Hips / Front Length)
 *   • bust daal kar recommended size ("Find My Size")
 *   • unstitched suit ka fabric note (metres + tailor customisable XS–5XL)
 *   • 4 numbered steps, har step ke saath pro-tip
 *
 * Numbers owner ne diye hain — inches aur cm **dono** wahi rakhe gaye hain
 * (cm column ko inch se dobara convert nahi kiya, kyunki owner ka chart hi
 *  final hai).
 */

export type SizeName = "XS" | "S" | "M" | "L" | "XL" | "XXL";

export type SizeRow = {
  size: SizeName;
  /** inches — chart ka base (owner ka diya hua chart) */
  bust: number;
  waist: number;
  hip: number;
  /** kurti/top ki front length, inches */
  frontLength: number;
  /** centimetres — owner ke chart ke exact numbers (round-off nahi) */
  cm: {
    bust: number;
    waist: number;
    hip: number;
    frontLength: number;
  };
};

export const SIZE_ROWS: SizeRow[] = [
  { size: "XS", bust: 34, waist: 32, hip: 36, frontLength: 46, cm: { bust: 85, waist: 80, hip: 90, frontLength: 115 } },
  { size: "S", bust: 36, waist: 34, hip: 38, frontLength: 46, cm: { bust: 91, waist: 86, hip: 96.5, frontLength: 117 } },
  { size: "M", bust: 38, waist: 36, hip: 40, frontLength: 46, cm: { bust: 95, waist: 90, hip: 100, frontLength: 115 } },
  { size: "L", bust: 40, waist: 38, hip: 42, frontLength: 46, cm: { bust: 100, waist: 95, hip: 105, frontLength: 115 } },
  { size: "XL", bust: 42, waist: 40, hip: 44, frontLength: 46, cm: { bust: 105, waist: 100, hip: 110, frontLength: 115 } },
  { size: "XXL", bust: 44, waist: 42, hip: 46, frontLength: 46, cm: { bust: 110, waist: 105, hip: 115, frontLength: 115 } },
];

export type SizeColumnKey = "bust" | "waist" | "hip" | "frontLength";

export const SIZE_COLUMNS = [
  { key: "bust", label: "Bust" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hips" },
  { key: "frontLength", label: "Front Length" },
] as const satisfies readonly { key: SizeColumnKey; label: string }[];

/** Chart ka subtitle (owner ka wording) */
export const FIT_LABEL = "Regular Comfort Fit • Ready to Wear";

export type SizeTabId = "chart" | "find" | "how";

export const SIZE_TABS = [
  { id: "chart", label: "Measurements Chart" },
  { id: "find", label: "Find My Size" },
  { id: "how", label: "How to Measure" },
] as const satisfies readonly { id: SizeTabId; label: string }[];

/** "Find My Size" ke quick bust buttons (inches) */
export const BUST_QUICK_PICKS = [34, 36, 38, 40, 42, 44] as const;

/** inch → cm (1 inch = 2.54 cm), 1 decimal tak — sirf fallback/legacy ke liye */
export const toCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;

/** "How to measure" — panel aur page dono yahi steps dikhate hain */
export const MEASURE_STEPS = [
  {
    title: "Bust",
    body: "Measure across the fullest part of your bust — keep the tape straight across your back and shoulders.",
    proTip: "Do not pull the tape tight; leave space for one finger so the fit stays comfortable.",
  },
  {
    title: "Waist",
    body: "Measure at your natural waist (just above the navel, the narrowest part) and breathe normally.",
    proTip: "Do not hold your stomach in — ready-to-wear suits are cut for this natural comfort.",
  },
  {
    title: "Hips",
    body: "Measure around the fullest part of your hips standing naturally, with your feet close together.",
    proTip: "If your hips measure more than 44″, choose your size by bust — the flare adjusts at the side seam.",
  },
  {
    title: "Front Length",
    body: "Start at the shoulder and measure down to where you want the kurta or top to end.",
    proTip: "Measure in heels if you will wear this outfit with heels.",
  },
] as const;

/** Unstitched / semi-stitched sets — owner ka fabric note */
export const UNSTITCHED_NOTE = {
  title: "What is included in an unstitched suit",
  lines: [
    "Approx. 2.5 m fabric for the kurta top",
    "Approx. 2.5 m fabric for the bottom (salwar or palazzo)",
    "Approx. 2.25 m fabric for the dupatta",
  ],
  sizes: "Your tailor can stitch it to your measurements — unstitched sets are customisable from XS to 5XL.",
} as const;

export const FIT_TIPS = [
  "Between two sizes? Take the larger one — it is easier to take a garment in than to let it out.",
  "Bust decides the size; a 1–2 inch difference at the waist or hips adjusts comfortably.",
  "Size options on each product page belong to that piece — check them once before ordering.",
  "Still unsure? Send us your bust, waist and height on WhatsApp and we will suggest the size.",
] as const;

export type SizeRecommendation = {
  size: SizeName;
  /** chart ka bust (inches) — recommended size ka */
  bust: number;
  bustIn: number;
  bustCm: number;
  /** chhota readable message — customer ko seedha dikhta hai */
  message: string;
  /** chart ke bahar ka naap (chhota/bada) */
  outsideChart: "small" | "large" | null;
};

/** cm → inch (1 decimal) */
export const toInches = (cm: number) => Math.round((cm / 2.54) * 10) / 10;

/**
 * Bust se recommended size. "Find My Size" ka poora logic yahin hai (UI me
 * duplicate nahi) — isliye panel, page aur tests sab same jawab paate hain.
 *
 * Rule: customer ka bust jitna hai, usse **agla** ready-to-wear size best fit
 * hota hai (comfort fit — tight nahi). Chart se chhota/bada naap ho to sabse
 * nazdeeki size + seedhi baat batai jaati hai.
 */
export function findSizeForBust(value: number, unit: "in" | "cm" = "in"): SizeRecommendation | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const bustIn = unit === "cm" ? toInches(value) : Math.round(value * 10) / 10;

  const ordered = SIZE_ROWS;
  const smallest = ordered[0];
  const largest = ordered[ordered.length - 1];

  if (bustIn < smallest.bust) {
    return {
      size: smallest.size,
      bust: smallest.bust,
      bustIn,
      bustCm: smallest.cm.bust,
      message: `Your measurement is below the smallest size on the chart (XS · ${smallest.bust}″) — XS will fit best, or have an unstitched set stitched to your measurements.`,
      outsideChart: "small",
    };
  }

  if (bustIn > largest.bust) {
    return {
      size: largest.size,
      bust: largest.bust,
      bustIn,
      bustCm: largest.cm.bust,
      message: `Ready-to-wear goes up to XXL (${largest.bust}″ bust) — an unstitched set works best for your measurement; the tailor can stitch from XS to 5XL.`,
      outsideChart: "large",
    };
  }

  const row = ordered.find((candidate) => candidate.bust >= bustIn) ?? largest;
  return {
    size: row.size,
    bust: row.bust,
    bustIn,
    bustCm: row.cm.bust,
    message: `Graceful regular fit for ${row.bust}″ bust`,
    outsideChart: null,
  };
}
