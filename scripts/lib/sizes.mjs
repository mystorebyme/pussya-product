/**
 * Size normalisation — build-catalog aur sync-live dono yahi use karte hain.
 * Store ke variants ka option1 kabhi size, kabhi "Color / Size", kabhi "L(40)" hota hai.
 */
/**
 * Store ke variants ka option1 kabhi size, kabhi "Color / Size", kabhi "L(40)", kabhi
 * "XXL [44]" hota hai. Isliye ek canonical size token nikalte hain — warna PDP par
 * "Red / L [40]" jaisa junk dikhta hai aur order me galat size jaata hai.
 */
export const SIZE_ORDER = ["XS [34]", "S [36]", "M [38]", "L [40]", "XL [42]", "2XL [44]", "3XL [46]", "4XL [48]", "5XL [50]"];

const SIZE_LABELS = [
  ["xxs", "XS", 32],
  ["xs", "XS", 34],
  ["s", "S", 36],
  ["m", "M", 38],
  ["l", "L", 40],
  ["xl", "XL", 42],
  ["xxl", "2XL", 44],
  ["2xl", "2XL", 44],
  ["xxxl", "3XL", 46],
  ["3xl", "3XL", 46],
  ["4xl", "4XL", 48],
  ["5xl", "5XL", 50],
  ["6xl", "5XL", 50],
];

export function canonicalSize(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (/free\s*size/i.test(value)) return "Free Size";

  // "Red / L [40]" -> size wala hissa lo
  let part = value;
  if (value.includes("/")) {
    const parts = value.split("/").map((piece) => piece.trim()).filter(Boolean);
    const sizeish = parts.find((piece) => /\b(xxs|xs|s|m|l|xl|xxl|2xl|3xl|xxxl|4xl|5xl)\b/i.test(piece) && !/^[a-z]+$/i.test(piece.replace(/[\[\]()0-9]/g, "")));
    part = sizeish ?? parts[parts.length - 1];
  }

  const waist = part.match(/([0-9]{2})\s*(?:''|"|inch|in)?\s*$/);
  const letters = part.replace(/[^A-Za-z0-9]/g, " ");
  const labelMatch = letters.match(/\b(xxs|xs|s|m|l|xl|xxl|2xl|3xl|xxxl|4xl|5xl|6xl)\b/i);
  if (!labelMatch) {
    // sirf color diya gaya hai (single-size product)
    return "Free Size";
  }
  const key = labelMatch[1].toLowerCase();
  const [, label, defaultWaist] = SIZE_LABELS.find(([alias]) => alias === key) ?? [];
  const size = waist ? `${label} [${waist[1]}]` : `${label} [${defaultWaist}]`;
  return size;
}

/** sizes ko normalize karo: canonical token, duplicate hatao, order fix karo */
export function normalizeSizes(sizes = []) {
  const out = new Set();
  for (const raw of sizes) {
    const size = canonicalSize(raw);
    if (size) out.add(size);
  }
  const list = [...out];
  if (!list.length) return ["Free Size"];
  const rank = (size) => {
    const index = SIZE_ORDER.indexOf(size);
    if (index !== -1) return index;
    if (size === "Free Size") return 99;
    const label = size.split(" ")[0];
    const base = SIZE_ORDER.findIndex((known) => known.startsWith(`${label} `));
    return base === -1 ? 50 : base;
  };
  return list.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

