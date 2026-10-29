import type { Serviceability, ServiceabilityReason } from "@noor/types";
import raw from "../../../../database/seeds/delivery/pincodes.json";

/**
 * India Post ka asli pincode data — 19,486 pincodes, 36 states/UTs.
 * `database/seeds/delivery/pincodes.json` = { state: { district: [pincode…] } }.
 *
 * Isi wajah se "kuch bhi number daal do" wala bug band hota hai: jo pincode
 * is data me nahi hai, wo deliverable nahi mana jaata. Customer ko ye kabhi
 * nahi dikhta ki data kahan se aaya — message sirf "valid Indian pincode".
 */

type Grouped = Record<string, Record<string, string[]>>;

const grouped = raw as Grouped;

type PinInfo = { state: string; district: string };

const byPincode = new Map<string, PinInfo>();
for (const [state, districts] of Object.entries(grouped)) {
  for (const [district, pincodes] of Object.entries(districts)) {
    for (const pincode of pincodes) {
      if (!byPincode.has(pincode)) byPincode.set(pincode, { state, district });
    }
  }
}

export const PINCODE_FORMAT = /^[1-9]\d{5}$/;

export const deliveryStates = Object.keys(grouped).sort();

export function isPincodeFormat(value: string): boolean {
  return PINCODE_FORMAT.test(value);
}

export function normalizePincode(value: string): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

export function lookupPincode(pincode: string): PinInfo | null {
  return byPincode.get(normalizePincode(pincode)) ?? null;
}

/** Kitne pincodes load hue — health/debug ke liye */
export function pincodeCount(): number {
  return byPincode.size;
}

/** Ek state ke pincodes (admin UI me count dikhane ke liye) */
export function stateStats(): { state: string; pincodes: number; districts: number }[] {
  return deliveryStates.map((state) => {
    const districts = grouped[state] ?? {};
    const pincodes = Object.values(districts).reduce((sum, list) => sum + list.length, 0);
    return { state, pincodes, districts: Object.keys(districts).length };
  });
}

type Rules = {
  allowAllStates: boolean;
  states: Record<string, boolean>;
  blockedPincodes: { pincode: string }[];
  allowedPincodes: { pincode: string }[];
  deliveryDays: string;
};

/**
 * Customer ko dikhne wale messages.
 *
 * Zaroori: yahan kabhi "record me nahi mila", "database", "admin ne block kiya",
 * "automated" jaisa kuch nahi jaata — customer ko sirf saaf jawab milta hai:
 *  • galat/fake pincode -> "valid Indian pincode daaliye"
 *  • delivery possible nahi (admin rule ya area) -> "not available yet"
 * Internal reason (`unknown` / `blocked` / `state_blocked`) sirf admin ke liye hai.
 */
const UNAVAILABLE = "Sorry, delivery is not available at this pincode right now.";
const ASK_WHATSAPP = "Please WhatsApp us and we will check for you.";
const VALID_ONLY = "Please enter a valid Indian pincode.";

const MESSAGES: Record<ServiceabilityReason, (pin: string, state?: string | null) => string> = {
  ok: (pin, state) => `Delivering to ${pin}${state ? ` (${state})` : ""} — delivery in 4-7 business days.`,
  invalid: () => "Please enter a valid 6-digit Indian pincode.",
  unknown: () => VALID_ONLY,
  blocked: () => `${UNAVAILABLE} ${ASK_WHATSAPP}`,
  state_blocked: () => `${UNAVAILABLE} ${ASK_WHATSAPP}`,
  state_not_allowed: () => `${UNAVAILABLE} ${ASK_WHATSAPP}`,
};

/**
 * Ek pincode serviceable hai ya nahi — poora rule engine.
 * Order booking se pehle bhi yahi function chalta hai (server-side enforcement).
 */
export function evaluatePincode(pincodeInput: string, rules: Rules): Serviceability {
  const pincode = normalizePincode(pincodeInput);
  const base = { pincode, state: null as string | null, district: null as string | null };

  if (!isPincodeFormat(pincode)) {
    return { ...base, serviceable: false, reason: "invalid", message: MESSAGES.invalid(pincode), deliveryDays: null };
  }

  const info = lookupPincode(pincode);
  if (!info) {
    return {
      ...base,
      serviceable: false,
      reason: "unknown",
      message: MESSAGES.unknown(pincode),
      deliveryDays: null,
    };
  }

  const withPlace = { ...base, state: info.state, district: info.district };
  const blocked = new Set(rules.blockedPincodes.map((row) => normalizePincode(row.pincode)));
  const explicitlyAllowed = new Set(rules.allowedPincodes.map((row) => normalizePincode(row.pincode)));

  if (blocked.has(pincode)) {
    return {
      ...withPlace,
      serviceable: false,
      reason: "blocked",
      message: MESSAGES.blocked(pincode),
      deliveryDays: null,
    };
  }

  const stateAllowed = rules.allowAllStates || rules.states[info.state] === true;

  if (explicitlyAllowed.has(pincode)) {
    return {
      ...withPlace,
      serviceable: true,
      reason: "ok",
      message: `${MESSAGES.ok(pincode, `${info.district}, ${info.state}`)}`,
      deliveryDays: rules.deliveryDays,
    };
  }

  if (!stateAllowed) {
    return {
      ...withPlace,
      serviceable: false,
      reason: rules.allowAllStates ? "state_not_allowed" : "state_blocked",
      message: MESSAGES.state_blocked(pincode, info.state),
      deliveryDays: null,
    };
  }

  return {
    ...withPlace,
    serviceable: true,
    reason: "ok",
    message: `${MESSAGES.ok(pincode, `${info.district}, ${info.state}`)}`,
    deliveryDays: rules.deliveryDays,
  };
}
