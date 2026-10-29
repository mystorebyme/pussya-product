import index from "@/data/colour-index.json";

type ColourEntry = { name: string; handle: string };
type ColourIndex = {
  groups: Record<string, { handle: string; colours: ColourEntry[] }>;
  byHandle: Record<string, string>;
};

const data = index as ColourIndex;

/** Ek handle ke saare colourways (khud ke saath). Group na ho to khaali array. */
export function coloursFor(handle: string): ColourEntry[] {
  const groupKey = data.byHandle[handle];
  if (!groupKey) return [];
  return data.groups[groupKey]?.colours ?? [];
}
