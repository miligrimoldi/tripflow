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
 * Parses a positive number typed by a person, with up to `maxFractionDigits`
 * decimals, into its digits. Accepts both "1.234,50" (es-AR) and "1,234.50"
 * (en):
 *
 * - With both separators, the last one is the decimal separator.
 * - With a single kind of separator, it is decimal only if it appears once
 *   and is followed by up to `maxFractionDigits` digits, except exactly 3
 *   ("12,5", "12.50", "0,00062"); otherwise it groups thousands ("1.500",
 *   "1.500.000"). In Argentina "1.615" is one thousand six hundred fifteen.
 */
function parseDecimal(input: string, maxFractionDigits: number): { integer: string; fraction: string } | null {
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
    if (occurrences === 1 && digitsAfter !== 3 && digitsAfter <= maxFractionDigits) decimalSeparator = separator;
  }

  const [integerPart, fraction = ""] = decimalSeparator ? splitLast(text, decimalSeparator) : [text];
  const groupSeparator = decimalSeparator === "," ? "." : decimalSeparator === "." ? "," : /[.,]/;
  if (fraction.length > maxFractionDigits || /[.,]/.test(fraction)) return null;

  // Thousands groups must look like "1.234.567": 1–3 digits, then groups of exactly 3.
  const groups = integerPart.split(groupSeparator);
  if (groups.length > 1 && !groups.every((group, i) => (i === 0 ? /^\d{1,3}$/ : /^\d{3}$/).test(group))) {
    return null;
  }
  const integer = groups.join("");
  return /^\d+$/.test(integer) ? { integer, fraction } : null;
}

/**
 * Parses an amount typed by a person into cents, or `null` if it is not a
 * valid positive amount ("1.234,50", "1,234.50", "15000"…).
 */
export function parseAmountToCents(input: string): number | null {
  const parsed = parseDecimal(input, 2);
  if (!parsed) return null;
  const cents = Number(parsed.integer) * 100 + Number(parsed.fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= MAX_AMOUNT_CENTS ? cents : null;
}

/** Exchange rates keep up to 8 decimals: enough for "1 ARS = 0,00048 USD". */
export const RATE_DECIMALS = 8;
const RATE_SCALE = BigInt(10) ** BigInt(RATE_DECIMALS);
const MAX_RATE = 1_000_000_000;

/**
 * Parses an exchange rate ("2.099,5", "1615", "0,00062") into a canonical
 * decimal string ("2099.5"), or `null` if it is not a valid positive rate.
 * Strings, not floats: a rate is stored and multiplied exactly.
 */
export function parseRate(input: string): string | null {
  const parsed = parseDecimal(input, RATE_DECIMALS);
  if (!parsed) return null;
  const integer = parsed.integer.replace(/^0+(?=\d)/, "");
  const fraction = parsed.fraction.replace(/0+$/, "");
  const rate = fraction ? `${integer}.${fraction}` : integer;
  return Number(rate) > 0 && Number(rate) <= MAX_RATE ? rate : null;
}

/** A rate as an exact integer scaled by 10^8 ("2099.5" → 209950000000n). */
function scaledRate(rate: string): bigint {
  const [integer, fraction = ""] = rate.split(".");
  return BigInt(integer) * RATE_SCALE + BigInt(fraction.padEnd(RATE_DECIMALS, "0"));
}

/**
 * Converts an amount with an exchange rate, rounding half up to the cent,
 * with integer arithmetic only (no float error even for large amounts).
 * `null` if the result is zero or too large.
 */
export function convertCents(cents: number, rate: string): number | null {
  const converted = Number((BigInt(cents) * scaledRate(rate) + RATE_SCALE / BigInt(2)) / RATE_SCALE);
  return converted > 0 && converted <= MAX_AMOUNT_CENTS ? converted : null;
}

/** "2.099,5": a rate for display or for prefilling an input, in Argentine style. */
export function formatRate(rate: string): string {
  const [integer, fraction] = rate.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction ? `${grouped},${fraction}` : grouped;
}

/** Currency symbol as shown next to amounts ("US$", "R$", "$"). */
export function currencySymbol(currency: Currency): string {
  return (
    new Intl.NumberFormat("es-AR", { style: "currency", currency })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
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
