import type { SVGProps } from "react";

/**
 * Category icons — har category ka **apna** gold line-art (koi stock icon nahi).
 *
 * R47 (owner: "category icon unique or animated"): sab icons 48×48 grid par
 * hand-drawn paths hain, ek hi gold/maroon palette me. Animation CSS se hoti hai
 * (`globals.css` → `.cat-icon`): line khud ko "draw" karti hai, dots pop hote hain
 * aur icon halka float karta hai. `prefers-reduced-motion` par sab band.
 *
 * Ek icon ka `pathLength={1}` isliye hai ki stroke-draw ka timing har shape me
 * same lage (chhote-bade path me farq na pade).
 */
export type CategoryIconName =
  | "anarkali"
  | "lehenga"
  | "printed"
  | "sparkle"
  | "crown"
  | "sale"
  | "wedding"
  | "star"
  | "hanger";

type IconProps = SVGProps<SVGSVGElement> & { name: CategoryIconName };

const line = (d: string, delay: number) => ({ d, delay });

const ICONS: Record<
  CategoryIconName,
  { lines: { d: string; delay: number }[]; dots: { cx: number; cy: number; r: number; delay: number }[]; closed?: string[] }
> = {
  /** Anarkali — chhota bodice + bada flare */
  anarkali: {
    lines: [
      line("M18.5 9.5h11l1.6 6.2-2.6 4.3h-9l-2.6-4.3z", 0),
      line("M20.5 20c-4 5.6-6.4 12-7.2 18.5", 0.18),
      line("M27.5 20c4 5.6 6.4 12 7.2 18.5", 0.24),
      line("M16 38.5h16", 0.42),
      line("M24 21.5v16.5", 0.34),
      line("M21.4 25.5l-2 12.5", 0.46),
      line("M26.6 25.5l2 12.5", 0.5),
    ],
    dots: [
      { cx: 24, cy: 12.4, r: 0.9, delay: 0.7 },
      { cx: 14.5, cy: 25, r: 0.75, delay: 0.8 },
      { cx: 33.5, cy: 25, r: 0.75, delay: 0.85 },
    ],
  },
  /** Lehenga choli — choli + pleated skirt */
  lehenga: {
    lines: [
      line("M18.5 8.5h11l-.9 6.4-4.6 2.6-4.6-2.6z", 0),
      line("M24 17.5c-5.4 3.6-8.6 11-9.4 20.5", 0.2),
      line("M24 17.5c5.4 3.6 8.6 11 9.4 20.5", 0.26),
      line("M14.6 38h18.8", 0.44),
      line("M19.5 22.5l-1.7 15", 0.34),
      line("M24 20.5v17", 0.38),
      line("M28.5 22.5l1.7 15", 0.4),
    ],
    dots: [
      { cx: 24, cy: 12.2, r: 0.85, delay: 0.72 },
      { cx: 12.2, cy: 30, r: 0.7, delay: 0.82 },
      { cx: 35.8, cy: 30, r: 0.7, delay: 0.88 },
    ],
  },
  /** Printed suit set — kurta + pant + dupatta drape */
  printed: {
    lines: [
      // kurta: kandha + bazu + seedha daaman
      line("M18 11.5h12l3 5-3 3.5V38H18V20l-3-3.5z", 0),
      line("M18 11.5l-3.4 2.6 2.4 4.4", 0.16),
      line("M30 11.5l3.4 2.6-2.4 4.4", 0.22),
      line("M24 11.5v8", 0.3),
      line("M20.5 26h7", 0.42),
      // dupatta drape (kandhe se neeche tak lehrati hui)
      line("M33.5 15.5c3.4 4.4 4 9.4 2.2 14.6", 0.34),
      line("M36.5 31.5c-1.2 3.2-3.4 5.4-6.4 6.6", 0.5),
    ],
    dots: [
      { cx: 21.4, cy: 17.4, r: 0.75, delay: 0.66 },
      { cx: 26.6, cy: 17.4, r: 0.75, delay: 0.72 },
      { cx: 24, cy: 30, r: 0.75, delay: 0.8 },
    ],
  },
  /** New arrivals — sparkle */
  sparkle: {
    lines: [
      line("M24 7.5c1.9 6.8 3.7 8.6 10.5 10.5-6.8 1.9-8.6 3.7-10.5 10.5-1.9-6.8-3.7-8.6-10.5-10.5C20.3 16.1 22.1 14.3 24 7.5Z", 0),
      line("M33.5 28c.9 3.2 1.8 4.1 5 5-3.2.9-4.1 1.8-5 5-.9-3.2-1.8-4.1-5-5 3.2-.9 4.1-1.8 5-5Z", 0.3),
      line("M14 31.5c.6 2.2 1.2 2.8 3.4 3.4-2.2.6-2.8 1.2-3.4 3.4-.6-2.2-1.2-2.8-3.4-3.4 2.2-.6 2.8-1.2 3.4-3.4Z", 0.45),
    ],
    dots: [{ cx: 24, cy: 18, r: 0.8, delay: 0.8 }],
  },
  /** Noor's Choice — brand ka crown emblem */
  crown: {
    lines: [
      // 3-point crown, neeche band + base
      line("M12 33.5 14.6 19l6 6.4L24 13l3.4 12.4 6-6.4L36 33.5z", 0),
      line("M13.2 36.6h21.6", 0.4),
      line("M15.4 30.2h17.2", 0.52),
    ],
    dots: [
      { cx: 14.6, cy: 17, r: 0.95, delay: 0.7 },
      { cx: 33.4, cy: 17, r: 0.95, delay: 0.76 },
      { cx: 24, cy: 10.2, r: 1.1, delay: 0.84 },
    ],
  },
  /** Sale — price tag + % */
  sale: {
    lines: [
      // tag: chhota square + point (hole ke saath)
      line("M25.6 9.5h9.9v9.9L21.3 33.6a2.6 2.6 0 0 1-3.7 0l-7.2-7.2a2.6 2.6 0 0 1 0-3.7z", 0),
      line("M31.6 13.6a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z", 0.42),
      // % : do slash + do chhote circle
      line("M17.6 23.2l6.8 6.8", 0.34),
      line("M18.4 22.2a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z", 0.5),
      line("M25.2 29a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z", 0.58),
    ],
    dots: [
      { cx: 12, cy: 34.5, r: 0.7, delay: 0.72 },
      { cx: 38.5, cy: 11, r: 0.8, delay: 0.8 },
    ],
  },
  /** Wedding — mandap arch + marigold dots */
  wedding: {
    lines: [
      line("M13 38V24a11 11 0 0 1 22 0v14", 0),
      line("M18.5 38V24.5a5.5 5.5 0 0 1 11 0V38", 0.2),
      line("M11 38h26", 0.42),
      line("M24 12.5v4", 0.3),
    ],
    dots: [
      { cx: 13, cy: 21, r: 0.9, delay: 0.66 },
      { cx: 35, cy: 21, r: 0.9, delay: 0.72 },
      { cx: 24, cy: 9.2, r: 1.1, delay: 0.8 },
      { cx: 9.5, cy: 30, r: 0.75, delay: 0.86 },
      { cx: 38.5, cy: 30, r: 0.75, delay: 0.9 },
    ],
  },
  /** Bestseller — star + ribbon */
  star: {
    lines: [
      line("M24 8.5l4.4 9.2 10.1 1.4-7.4 7.1 1.8 10.1-8.9-4.8-8.9 4.8 1.8-10.1-7.4-7.1 10.1-1.4z", 0),
      line("M19 36.5l5 4 5-4", 0.4),
    ],
    dots: [{ cx: 24, cy: 21.5, r: 1, delay: 0.8 }],
  },
  /** default — hanger */
  hanger: {
    lines: [
      line("M24 12.5a3 3 0 1 1 3 3v2.4", 0),
      line("M27 18.5 12 29.5a2.4 2.4 0 0 0 1.6 4.2h20.8a2.4 2.4 0 0 0 1.6-4.2L27 18.5Z", 0.22),
    ],
    dots: [{ cx: 24, cy: 33, r: 0.9, delay: 0.7 }],
  },
};

/** collection handle → icon (har category ka apna) */
export function iconForCollection(handle: string, title = ""): CategoryIconName {
  const key = `${handle} ${title}`.toLowerCase();
  if (key.includes("lehnga") || key.includes("lehenga")) return "lehenga";
  if (key.includes("printed")) return "printed";
  if (key.includes("new-arrival") || key.includes("new arrival")) return "sparkle";
  if (key.includes("choice")) return "crown";
  if (key.includes("sale")) return "sale";
  if (key.includes("wedding") || key.includes("weddin")) return "wedding";
  if (key.includes("best")) return "star";
  if (key.includes("anarkali") || key.includes("party-wear") || key.includes("gown")) return "anarkali";
  if (key.includes("trending")) return "sparkle";
  return "hanger";
}

export function CategoryIcon({ name, className = "", ...rest }: IconProps) {
  const icon = ICONS[name] ?? ICONS.hanger;
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
      className={`cat-icon ${className}`}
      {...rest}
    >
      <g className="cat-icon-float">
        {icon.lines.map(({ d, delay }, index) => (
          <path
            key={`${name}-line-${index}`}
            d={d}
            pathLength={1}
            className="cat-icon-line"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
        {icon.dots.map((dot, index) => (
          <circle
            key={`${name}-dot-${index}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill="currentColor"
            stroke="none"
            className="cat-icon-dot"
            style={{ animationDelay: `${dot.delay}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
