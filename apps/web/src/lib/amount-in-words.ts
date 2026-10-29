/**
 * Indian numbering system me amount words (invoice par "Amount in words" ke liye).
 * Pure function — PDF aur HTML invoice dono isi ko use karte hain.
 */
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(value: number): string {
  if (value < 20) return ONES[value] ?? "";
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${TENS[tens]}${ones ? ` ${ONES[ones]}` : ""}`;
}

function threeDigits(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  return `${hundreds ? `${ONES[hundreds]} Hundred${rest ? " " : ""}` : ""}${rest ? twoDigits(rest) : ""}`;
}

export function amountInWords(paise: number): string {
  const total = Math.max(0, Math.round(paise));
  const rupees = Math.floor(total / 100);
  const paisePart = total % 100;
  if (rupees === 0 && paisePart === 0) return "Indian Rupees Zero Only";

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${threeDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));

  const rupeesWords = parts.join(" ").replace(/\s+/g, " ").trim();
  const paiseWords = paisePart ? ` and ${twoDigits(paisePart)} Paise` : "";
  return `Indian Rupees ${rupeesWords}${paiseWords} Only`;
}
