/**
 * Size guide — **ek hi source of truth**.
 *
 * Kahan dikhta hai:
 *   1. header ka "Size guide" → slide-over panel (`components/size-guide-dialog.tsx`)
 *   2. product page ka "Size guide" link → wahi panel
 *   3. `/pages/size-guide` par poora page (SEO ke liye, panel ka same data)
 *
 * Numbers wahi hain jo site par pehle se publish hain (S–XXL, bust 34–42 in) —
 * is round me koi naya claim nahi joda, sirf cm conversion, naapne ka tareeqa
 * aur fit tips add kiye (jo pehle se page par text me the).
 */

export type SizeRow = {
  size: string;
  /** inches — chart ka base */
  bust: number;
  waist: number;
  hip: number;
  /** bottom / palazzo length, inches */
  bottom: number;
};

export const SIZE_ROWS: SizeRow[] = [
  { size: "S", bust: 34, waist: 30, hip: 36, bottom: 38 },
  { size: "M", bust: 36, waist: 32, hip: 38, bottom: 38 },
  { size: "L", bust: 38, waist: 34, hip: 40, bottom: 38 },
  { size: "XL", bust: 40, waist: 36, hip: 42, bottom: 38 },
  { size: "XXL", bust: 42, waist: 38, hip: 44, bottom: 38 },
];

export const SIZE_COLUMNS = [
  { key: "bust", label: "Bust" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "bottom", label: "Bottom length" },
] as const;

/** inch → cm (1 inch = 2.54 cm), 1 decimal tak */
export const toCm = (inches: number) => Math.round(inches * 2.54 * 10) / 10;

/** "How to measure" — panel aur page dono yahi steps dikhate hain */
export const MEASURE_STEPS = [
  {
    title: "Bust",
    body: "Fullest part of the bust ke around naapein, tape floor ke parallel rakhein.",
    tip: "Tape ko peeth par bilkul seedha rakhein, kandhon par nahi.",
  },
  {
    title: "Waist",
    body: "Natural waist (naaf se thoda upar, sabse patla hissa) par naapein.",
    tip: "Breath normal rakhein, pet andar nahi kheenchna.",
  },
  {
    title: "Hip",
    body: "Hip ke sabse chaude hisse par naapein, waist se ~8 inch neeche.",
    tip: "Anarkali me flare hota hai, isliye bust sabse pehle check karein.",
  },
  {
    title: "Bottom length",
    body: "Kamar se neeche tak, jahan bottom ka ghera chahiye.",
    tip: "Heels pehn kar naapein agar aap heels ke saath pehenti hain.",
  },
] as const;

export const FIT_TIPS = [
  "Do sizes ke beech me hain to bada size lein — chhota karwana aasan hota hai.",
  "Bust size decide karta hai; waist aur hip ka 1–2 inch ka farq aaram se adjust ho jaata hai.",
  "Har product page par size options usi piece ke liye hain — order se pehle wahi confirm karein.",
  "Confusion ho to WhatsApp par bust, waist aur height bhejein, hum size bata denge.",
] as const;
