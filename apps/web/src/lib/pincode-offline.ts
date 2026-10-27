/**
 * Pincode check jab API na ho (GitHub Pages static build) ya network fail ho.
 *
 * Asli India Post data (`database/seeds/delivery/pincodes.json`) build ke waqt
 * `public/pincode-map.json` me copy hota hai — isliye bina server bhi pincode
 * verify hota hai: 6 digit, asli pincode, state/district ke saath.
 * (Admin ke custom blocks server API se aate hain; yahan default “serviceable”.)
 */
import { assetUrl } from "@/lib/format";

export type OfflinePincodeResult = {
  serviceable: boolean;
  message: string;
  state: string | null;
  district: string | null;
  deliveryDays: string | null;
  reason?: "invalid" | "unknown" | "ok";
};

type PincodeMap = Record<string, Record<string, string[]>>;

let cache: Promise<PincodeMap> | null = null;

function loadMap(): Promise<PincodeMap> {
  if (!cache) {
    cache = fetch(assetUrl("/pincode-map.json"), { cache: "force-cache" })
      .then((response) => (response.ok ? (response.json() as Promise<PincodeMap>) : {}))
      .catch(() => ({}));
  }
  return cache;
}

export function isPincodeShape(value: string): boolean {
  return /^[1-9][0-9]{5}$/.test(value.trim());
}

export async function checkPincodeOffline(pincode: string): Promise<OfflinePincodeResult> {
  const pin = pincode.trim();
  if (!isPincodeShape(pin)) {
    return {
      serviceable: false,
      message: "Enter a valid 6-digit Indian pincode.",
      state: null,
      district: null,
      deliveryDays: null,
      reason: "invalid",
    };
  }

  const map = await loadMap();
  for (const [state, districts] of Object.entries(map)) {
    for (const [district, pincodes] of Object.entries(districts)) {
      if (pincodes.includes(pin)) {
        return {
          serviceable: true,
          message: `Deliverable — ${district}, ${state}. Free shipping, 4-7 business days.`,
          state,
          district,
          deliveryDays: "4-7 business days",
          reason: "ok",
        };
      }
    }
  }

  return {
    serviceable: false,
    message: "This pincode is not in the India Post list — please re-check the number.",
    state: null,
    district: null,
    deliveryDays: null,
    reason: "unknown",
  };
}
