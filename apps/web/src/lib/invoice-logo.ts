import path from "node:path";
import { readFile } from "node:fs/promises";
import { INVOICE_LOGO_PNG_BASE64 } from "@/content/invoice-logo.generated";

/**
 * Invoice masthead — wahi logo jo header/footer me hai (`public/images/brand/logo-mark-512.png`).
 * Pehle disk se padhte hain (Node/Vercel/Render — owner file badle to turant effect),
 * aur file na mile to build-time embedded copy (Cloudflare Workers par FS read-only
 * hai, isliye wahan embed hi chalta hai). Dono me **wahi ek** logo hai — purana ya
 * duplicate mark kabhi nahi chhapta; dono fail ho to text masthead.
 */
export const INVOICE_LOGO_WIDTH = 780;
export const INVOICE_LOGO_HEIGHT = 228;

let cachedLogo: Buffer | null | undefined;

function embeddedLogo(): Buffer | null {
  if (!INVOICE_LOGO_PNG_BASE64) return null;
  const buffer = Buffer.from(INVOICE_LOGO_PNG_BASE64, "base64");
  return buffer.length > 1000 ? buffer : null;
}

export async function invoiceLogoImage(): Promise<Buffer | null> {
  if (cachedLogo !== undefined) return cachedLogo;
  try {
    const file = path.join(process.cwd(), "public", "images", "brand", "logo-mark-512.png");
    const buffer = await readFile(file);
    cachedLogo = buffer.length > 1000 ? buffer : embeddedLogo();
  } catch {
    cachedLogo = embeddedLogo();
  }
  return cachedLogo;
}

/** Tests ke liye — disk/embed dobara check ho. */
export function resetInvoiceLogoCache(): void {
  cachedLogo = undefined;
}
