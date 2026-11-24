import { z } from "zod";
import { CURRENCIES } from "../shared/money";
import { parseInput, type RawInput } from "../shared/validation";
import type { ExchangeRateSource, RateQuote } from "./exchange-rate";

const pairSchema = z.object({
  from: z.enum(CURRENCIES, { error: "Moneda inválida" }),
  to: z.enum(CURRENCIES, { error: "Moneda inválida" }),
});

export type CurrencyPairInput = RawInput<typeof pairSchema>;

/**
 * Suggested exchange rates for an expense paid in another currency. They
 * are only suggestions: the person can always type the rate they actually
 * got, so a failing source means "no suggestions", never an error.
 */
export class ExchangeRateService {
  constructor(private readonly sources: ExchangeRateSource[]) {}

  async quotes(input: CurrencyPairInput): Promise<RateQuote[]> {
    const { from, to } = parseInput(pairSchema, input);
    if (from === to) return [];

    const source = this.sources.find((candidate) => candidate.supports(from, to));
    if (!source) return [];
    try {
      return await source.quotes(from, to);
    } catch (error) {
      console.warn(`[exchange] could not get ${from}→${to} rates`, error);
      return [];
    }
  }
}
