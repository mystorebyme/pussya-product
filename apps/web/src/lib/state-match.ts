/**
 * State name matching — pincode ke asli state se compare karne ke liye.
 *
 * India Post data aur customer dropdown me kabhi naam alag likhe hote hain
 * ("Jammu and Kashmir" vs "Jammu & Kashmir", "Odisha" vs "Orissa",
 * "Puducherry" vs "Pondicherry"). Isliye compare normalise karke hota hai,
 * warna sahi address bhi "state galat hai" bol deta.
 */

/** Dropdown ke saare states/UTs — pincode seed data ke naam ke saath exactly same. */
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/** purane/alternate naam → aaj ka naam */
const ALIASES: Record<string, string> = {
  orissa: "odisha",
  pondicherry: "puducherry",
  uttaranchal: "uttarakhand",
  jammukashmir: "jammuandkashmir",
  jk: "jammuandkashmir",
  nctofdelhi: "delhi",
  newdelhi: "delhi",
  dadraandnagarhaveli: "dadraandnagarhavelianddamananddiu",
  damananddiu: "dadraandnagarhavelianddamananddiu",
  andamanandnicobarislands: "andamanandnicobarislands",
  andamannicobarislands: "andamanandnicobarislands",
  telengana: "telangana",
  chattisgarh: "chhattisgarh",
};

export function normalizeStateName(value: string): string {
  const key = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  return ALIASES[key] ?? key;
}

/** Do state naam ek hi state ke hain? (spelling/alias tolerant) */
export function statesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true; // compare karne layak data nahi — kuch block na karo
  return normalizeStateName(a) === normalizeStateName(b);
}

/** Pincode se mila state dropdown me kaunsa option hai (exact naam dhoondh kar) */
export function canonicalStateName(value: string | null | undefined): string | null {
  if (!value) return null;
  const wanted = normalizeStateName(value);
  return (INDIAN_STATES as readonly string[]).find((state) => normalizeStateName(state) === wanted) ?? null;
}
