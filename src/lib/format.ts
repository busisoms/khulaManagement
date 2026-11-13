// Display helpers for the UI.

/** 123456 cents -> "R1 234.56"; whole rands drop the decimals ("R900"). */
export function formatRands(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(cents) / 100;
  const text = abs.toLocaleString("en-ZA", {
    minimumFractionDigits: Number.isInteger(abs) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return `${negative ? "-" : ""}R${text}`;
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
}

/** "R12.50" / "12,50" / "12" -> cents. Returns null when not a valid amount. */
export function parseRandsToCents(input: string): number | null {
  const clean = input.replace(/[Rr\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(parseFloat(clean) * 100);
}
