import "server-only";
import type { ExchangeRateSource, RateQuote } from "@/server/currency/exchange-rate";
import type { Currency } from "@/server/shared/money";
import { fetchJsonHourly } from "./fetch-json";
import { parseFrankfurterQuote } from "./frankfurter-response";

/** Currencies with ECB reference rates (it doesn't publish ARS, CLP or UYU). */
const QUOTED = new Set<Currency>(["USD", "EUR", "BRL", "MXN", "GBP"]);

/** Between major currencies, e.g. a dollar trip with expenses in euros. */
export class FrankfurterExchangeRates implements ExchangeRateSource {
  supports(from: Currency, to: Currency): boolean {
    return QUOTED.has(from) && QUOTED.has(to);
  }

  async quotes(from: Currency, to: Currency): Promise<RateQuote[]> {
    const json = await fetchJsonHourly(`https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`);
    return parseFrankfurterQuote(json, to);
  }
}
