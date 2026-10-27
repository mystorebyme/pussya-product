/** Colour naam → swatch hex. Named colours hi kaafi hain; unknown par neutral. */
const SWATCHES: Record<string, string> = {
  black: "#1c1c1c",
  white: "#f7f4ef",
  ivory: "#f4ecdd",
  "off white": "#f2ece2",
  cream: "#f3e8d7",
  beige: "#e6d8c3",
  nude: "#e8cdbb",
  red: "#c0261f",
  maroon: "#7b1e1e",
  wine: "#6a1b2a",
  rani: "#c2185b",
  "rani pink": "#c2185b",
  pink: "#e3739b",
  "blush pink": "#f0b6bf",
  "baby pink": "#f7c2cd",
  peach: "#f3b28c",
  orange: "#e8722b",
  rust: "#b4552d",
  yellow: "#e9c02c",
  mustard: "#c9a227",
  gold: "#c9a227",
  green: "#2f6b3f",
  olive: "#6b6a2f",
  pista: "#b6c98a",
  mint: "#b8e0c8",
  "sea green": "#2e8b74",
  mehandi: "#7a8b33",
  blue: "#2f4f8f",
  "sky blue": "#8fc4e8",
  navy: "#1f2d4d",
  teal: "#1f6f78",
  aqua: "#7fd6d0",
  purple: "#6a3d8f",
  lavender: "#c3b0dd",
  violet: "#7a4fb0",
  brown: "#6b4a2f",
  grey: "#8b8b8b",
  gray: "#8b8b8b",
  multi: "#b98f5f",
};

export function colourSwatch(name: string | null | undefined): string {
  if (!name) return "#cfc4b8";
  const key = name.toLowerCase().trim();
  if (SWATCHES[key]) return SWATCHES[key];
  for (const [swatch, hex] of Object.entries(SWATCHES)) {
    if (key.includes(swatch)) return hex;
  }
  return "#cfc4b8";
}
