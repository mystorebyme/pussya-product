/**
 * Admin me har phone number **clickable** — owner ka R23 ask:
 *  - tap → call (`tel:`)
 *  - WhatsApp → chat direct khul jaaye, pehla message pehle se likha hua
 *
 * Number hamesha last 10 digit par normalise hota hai, isliye `+91 98765 43210`,
 * `09876543210` ya `919876543210` sab ek hi link banate hain.
 */

export function cleanPhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function telHref(phone: string): string {
  const digits = cleanPhone(phone);
  return digits.length === 10 ? `tel:+91${digits}` : "";
}

export function whatsappHref(phone: string, text?: string): string {
  const digits = cleanPhone(phone);
  if (digits.length !== 10) return "";
  const base = `https://wa.me/91${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

export function PhoneLinks({
  phone,
  whatsappText,
  showText = true,
}: {
  phone: string;
  /** WhatsApp chat pehle se likha message (order number wagairah) */
  whatsappText?: string;
  /** `false` par sirf icons/links, number nahi */
  showText?: boolean;
}) {
  const digits = cleanPhone(phone);
  if (digits.length !== 10) {
    return <span className="small muted">{phone || "—"}</span>;
  }
  return (
    <span className="phone-links" data-testid="phone-links">
      <a className="phone-call" href={telHref(phone)} title={`Call +91 ${digits}`}>
        <span aria-hidden="true">📞</span>
        {showText ? <span className="mono">+91 {digits}</span> : <span className="sr-only">Call</span>}
      </a>
      <a
        className="phone-wa"
        href={whatsappHref(phone, whatsappText)}
        target="_blank"
        rel="noreferrer"
        title="WhatsApp par message kariye"
        data-testid="phone-whatsapp"
      >
        <span aria-hidden="true">💬</span>
        {showText ? <span>WhatsApp</span> : <span className="sr-only">WhatsApp</span>}
      </a>
    </span>
  );
}
