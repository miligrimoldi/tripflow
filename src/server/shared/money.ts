/**
 * Money is always handled as an integer number of cents (hundredths of the
 * currency) so sums and comparisons are exact. Floats only appear when
 * formatting for display.
 */

export const CURRENCIES = ["ARS", "USD", "EUR", "BRL", "CLP", "UYU", "MXN", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** 100 billion units: far above any trip, far below Number.MAX_SAFE_INTEGER. */
export const MAX_AMOUNT_CENTS = 10_000_000_000_000;

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

/**
 * Parses an amount typed by a person into cents, or `null` if it is not a
 * valid positive amount. Accepts both "1.234,50" (es-AR) and "1,234.50" (en):
 *
 * - With both separators, the last one is the decimal separator.
 * - With a single kind of separator, it is decimal only if it appears once
 *   and is followed by 1–2 digits ("12,5", "12.50"); otherwise it groups
 *   thousands ("1.500", "1.500.000").
 */
export function parseAmountToCents(input: string): number | null {
  const text = input
    .trim()
    .replace(/^\$\s*/, "")
    .replace(/\s/g, "");
  if (!/^\d[\d.,]*$/.test(text) || /[.,]$/.test(text)) return null;

  const lastDot = text.lastIndexOf(".");
  const lastComma = text.lastIndexOf(",");
  let decimalSeparator: "." | "," | null = null;

  if (lastDot !== -1 && lastComma !== -1) {
    decimalSeparator = lastDot > lastComma ? "." : ",";
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? "." : ",";
    const occurrences = text.split(separator).length - 1;
    const digitsAfter = text.length - text.lastIndexOf(separator) - 1;
    if (occurrences === 1 && digitsAfter <= 2) decimalSeparator = separator;
  }

  const [integerPart, decimalPart = ""] = decimalSeparator ? splitLast(text, decimalSeparator) : [text];
  const groupSeparator = decimalSeparator === "," ? "." : decimalSeparator === "." ? "," : /[.,]/;
  if (decimalPart.length > 2 || /[.,]/.test(decimalPart)) return null;

  // Thousands groups must look like "1.234.567": 1–3 digits, then groups of exactly 3.
  const groups = integerPart.split(groupSeparator);
  if (groups.length > 1 && !groups.every((group, i) => (i === 0 ? /^\d{1,3}$/ : /^\d{3}$/).test(group))) {
    return null;
  }
  const integerDigits = groups.join("");
  if (!/^\d+$/.test(integerDigits)) return null;

  const cents = Number(integerDigits) * 100 + Number(decimalPart.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

function splitLast(text: string, separator: string): [string, string] {
  const index = text.lastIndexOf(separator);
  return [text.slice(0, index), text.slice(index + 1)];
}

/** "1234.5" style string for prefilling inputs (no grouping, comma decimals when needed). */
export function centsToInput(cents: number): string {
  const units = Math.trunc(cents / 100);
  const rest = cents % 100;
  return rest === 0 ? String(units) : `${units},${String(rest).padStart(2, "0")}`;
}

export function formatMoney(cents: number, currency: Currency): string {
  const format = new Intl.NumberFormat("es-AR", { style: "currency", currency });
  return format.format(cents / 100);
}

/**
 * Splits `cents` into `parts` integer shares that add up exactly to the
 * total (the first shares absorb the remainder): 1000 / 3 → [334, 333, 333].
 */
export function splitEvenly(cents: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  return Array.from({ length: parts }, (_, index) => base + (index < remainder ? 1 : 0));
}
