import { z } from "zod";
import { invertRate, toRateString, type RateQuote } from "@/server/currency/exchange-rate";

/**
 * DolarApi quotes (https://dolarapi.com): pesos per unit of foreign
 * currency. We use the selling price ("venta"), which is what someone pays.
 */
const quotesSchema = z.array(z.object({ casa: z.string(), venta: z.number().positive() }));

/** The dollar rates people in Argentina actually use, most common abroad first. */
const DOLLAR_KINDS: { casa: string; id: string; label: string }[] = [
  { casa: "tarjeta", id: "tarjeta", label: "Tarjeta" },
  { casa: "oficial", id: "oficial", label: "Oficial" },
  { casa: "blue", id: "blue", label: "Blue" },
  { casa: "bolsa", id: "mep", label: "MEP" },
];

/**
 * Quotes in "pesos per dollar" (or per unit of another currency) from a
 * `/v1/dolares` or `/v1/cotizaciones/{code}` response. With `inverse`, they
 * are turned into "dollars per peso", for trips kept in another currency
 * that have expenses paid in pesos.
 */
export function parseDolarApiQuotes(json: unknown, { inverse }: { inverse: boolean }): RateQuote[] {
  const parsed = quotesSchema.safeParse(Array.isArray(json) ? json : [json]);
  if (!parsed.success) throw new Error("Unexpected DolarApi response");

  const byCasa = new Map(parsed.data.map((quote) => [quote.casa, quote.venta]));
  const kinds = byCasa.has("tarjeta") ? DOLLAR_KINDS : [{ casa: "oficial", id: "oficial", label: "Oficial" }];

  return kinds.flatMap(({ casa, id, label }) => {
    const venta = byCasa.get(casa);
    const pesos = venta === undefined ? null : toRateString(venta);
    const rate = pesos && inverse ? invertRate(pesos) : pesos;
    return rate ? [{ id, label, rate }] : [];
  });
}
