/** Paisa integer hi rehta hai. Float kabhi nahi — rounding bugs se bachne ke liye. */
export function toPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatInr(paise: number): string {
  return `Rs. ${(paise / 100).toLocaleString("en-IN")}`;
}

export function percentOf(paise: number, percent: number): number {
  return Math.round((paise * percent) / 100);
}
