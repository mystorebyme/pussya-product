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
    body: "Sabse chaude hisse (bust) par naapein — tape ko peeth aur kandhon ke aar-paar seedha rakhein.",
    proTip: "Tape tight na kheenchein; ek ungli ki jagah chhodiye taaki aaram bana rahe.",
  },
  {
    title: "Waist",
    body: "Natural waist (naaf se thoda upar, sabse patla hissa) par naapein, saans normal rakhein.",
    proTip: "Pet andar kheenche bina naapein — ready-to-wear suit isi comfort par cut hota hai.",
  },
  {
    title: "Hips",
    body: "Hip ke sabse chaude hisse par naapein, waise hi jaise aap khadi hain — paer thode paas-paas.",
    proTip: "Hips 44″ se zyada ho to bust ke hisaab se size lein — flare side seam se adjust ho jaata hai.",
  },
  {
    title: "Front Length",
    body: "Kandhe se shuru karke neeche tak naapein — jahan aap kurti/top ka hem chahti hain.",
    proTip: "Heels pehen kar naapein agar aap function me heels ke saath pehnti hain.",
  },
] as const;

/** Unstitched / semi-stitched sets — owner ka fabric note */
export const UNSTITCHED_NOTE = {
  title: "Unstitched suit me kya milta hai",
  lines: [
    "Kurti top ke liye ~2.5 m fabric",
    "Bottom (salwar/palazzo) ke liye ~2.5 m fabric",
    "Dupatta ke liye ~2.25 m fabric",
  ],
  sizes: "Tailor apne naap par sil sakta hai — unstitched sets XS se 5XL tak customisable hain.",
} as const;

export const FIT_TIPS = [
  "Do sizes ke beech me hain to bada size lein — chhota karwana aasan hota hai.",
  "Bust size decide karta hai; waist aur hips ka 1–2 inch ka farq aaram se adjust ho jaata hai.",
  "Har product page par size options usi piece ke liye hain — order se pehle wahi confirm karein.",
  "Confusion ho to WhatsApp par bust, waist aur height bhejein, hum size bata denge.",
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
      message: `Aapka naap chart ke sabse chhote size (XS · ${smallest.bust}″) se bhi chhota hai — XS sabse theek baithega, ya unstitched set tailor se custom silwaiye.`,
      outsideChart: "small",
    };
  }

  if (bustIn > largest.bust) {
    return {
      size: largest.size,
      bust: largest.bust,
      bustIn,
      bustCm: largest.cm.bust,
      message: `XXL (${largest.bust}″ bust) tak ready-to-wear hai — aapke naap ke liye unstitched set best rahega, tailor XS se 5XL tak sil deta hai.`,
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
