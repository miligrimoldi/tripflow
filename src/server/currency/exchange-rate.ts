import { RATE_DECIMALS, type Currency } from "../shared/money";

/** A suggested exchange rate: "1 USD = 2099.5 ARS (Tarjeta)". */
export interface RateQuote {
  /** Stable id ("tarjeta", "blue"…), for the UI to remember a choice. */
  id: string;
  label: string;
  /** Canonical decimal string, as `parseRate` returns. */
  rate: string;
}

/**
 * Port for "how much is 1 `from` in `to` today?". Each source knows which
 * pairs it can answer; several sources can be combined.
 */
export interface ExchangeRateSource {
  supports(from: Currency, to: Currency): boolean;
  /** The most useful quote first: the UI preselects it. */
  quotes(from: Currency, to: Currency): Promise<RateQuote[]>;
}

/** A float rate from an API as a canonical decimal string with at most 8 decimals. */
export function toRateString(value: number): string | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const fixed = value.toFixed(RATE_DECIMALS).replace(/\.?0+$/, "");
  return fixed === "0" ? null : fixed;
}

/** The inverse of a rate: 1 / 1615 ARS per USD → 0.00061920 USD per ARS. */
export function invertRate(rate: string): string | null {
  return toRateString(1 / Number(rate));
}
