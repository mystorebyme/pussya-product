/**
 * Category circles ki images — **har circle ki apni, alag image**.
 *
 * R48 (owner): "category images bhi unique karo, jaise icons unique hain —
 * same purani images nahi, koi bhi image use kar sakte ho".
 *
 * Pehle har circle collection ka image (ya us collection ke pehle product ka
 * photo) dikhata tha. Kai collections me products **overlap** karte hain
 * (new-arrivals / noors-choice / sale), isliye do-teen circles ek jaisi lagti
 * thin. Ab selection ek saath hota hai:
 *
 *   1. har category ke liye uske products ke photos (colour ke saath) candidates
 *      bante hain — pehla product sabse upar,
 *   2. greedy pick: jo image pehle use ho chuki hai wo skip, aur jis **colour**
 *      ka circle pehle aa chuka hai wo bhi skip (jab tak koi aur option ho),
 *   3. sab kuch deterministic hai (`Math.random` nahi) — build aur preview me
 *      same images, isliye screenshot/SEO stable rehta hai.
 *
 * Agar catalog itna chhota ho ki 7 alag images na milein, to sirf image-dedupe
 * chalti hai aur (aakhir me) same image bhi chal jaati hai — circle khaali nahi
 * hota.
 */

export type CircleCandidate = {
  image: string;
  /** product ka colour (known ho to) — visual variety ke liye */
  color?: string | null;
};

export type CircleSpec = {
  /** collection handle — sirf debugging/tests ke liye */
  handle: string;
  /** pehla candidate sabse preferred (usually collection ka apna image) */
  candidates: (CircleCandidate | null | undefined)[];
};

/** Ek hi colour family ke do circles na aayein isliye colour normalise karte hain */
function colourKey(color?: string | null): string {
  const value = (color ?? "").trim().toLowerCase();
  if (!value || value === "as shown" || value === "multi") return "";
  return value.split(/[ /-]/)[0];
}

/**
 * Saare circles ke liye ek saath unique images chuno.
 * Returned array ka index `specs` ke index ke barabar hota hai.
 */
export function pickCircleImages(specs: CircleSpec[]): (string | null)[] {
  const usedImages = new Set<string>();
  const usedColours = new Set<string>();
  const picks: (string | null)[] = specs.map(() => null);

  // pehla pass: image + colour dono unique
  specs.forEach((spec, index) => {
    const candidates = spec.candidates.filter((item): item is CircleCandidate => Boolean(item?.image));
    const pick =
      candidates.find((item) => {
        const colour = colourKey(item.color);
        return !usedImages.has(item.image) && (!colour || !usedColours.has(colour));
      }) ?? null;
    if (!pick) return;
    picks[index] = pick.image;
    usedImages.add(pick.image);
    const colour = colourKey(pick.color);
    if (colour) usedColours.add(colour);
  });

  // doosra pass: sirf image unique (colour repeat allowed)
  specs.forEach((spec, index) => {
    if (picks[index]) return;
    const candidates = spec.candidates.filter((item): item is CircleCandidate => Boolean(item?.image));
    const pick = candidates.find((item) => !usedImages.has(item.image)) ?? null;
    if (!pick) return;
    picks[index] = pick.image;
    usedImages.add(pick.image);
  });

  // teesra pass: kuch bhi na mile to pehla candidate hi (circle khaali na ho)
  specs.forEach((spec, index) => {
    if (picks[index]) return;
    const first = spec.candidates.find((item): item is CircleCandidate => Boolean(item?.image));
    if (first) picks[index] = first.image;
  });

  return picks;
}
