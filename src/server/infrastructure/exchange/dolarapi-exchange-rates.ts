import "server-only";
import type { ExchangeRateSource, RateQuote } from "@/server/currency/exchange-rate";
import type { Currency } from "@/server/shared/money";
import { parseDolarApiQuotes } from "./dolarapi-response";
import { fetchJsonHourly } from "./fetch-json";

const BASE_URL = "https://dolarapi.com/v1";
/** Currencies DolarApi quotes against the Argentine peso. */
const QUOTED = new Set<Currency>(["USD", "EUR", "BRL", "CLP", "UYU"]);

/** Anything to or from Argentine pesos, with every dollar rate for USD. */
export class DolarApiExchangeRates implements ExchangeRateSource {
  supports(from: Currency, to: Currency): boolean {
    return (to === "ARS" && QUOTED.has(from)) || (from === "ARS" && QUOTED.has(to));
  }

  async quotes(from: Currency, to: Currency): Promise<RateQuote[]> {
    const foreign = to === "ARS" ? from : to;
    const url = foreign === "USD" ? `${BASE_URL}/dolares` : `${BASE_URL}/cotizaciones/${foreign.toLowerCase()}`;
    return parseDolarApiQuotes(await fetchJsonHourly(url), { inverse: from === "ARS" });
  }
}
