import { z } from "zod";
import { toRateString, type RateQuote } from "@/server/currency/exchange-rate";

/** Frankfurter (https://frankfurter.dev): European Central Bank reference rates. */
const latestSchema = z.object({ rates: z.record(z.string(), z.number().positive()) });

export function parseFrankfurterQuote(json: unknown, to: string): RateQuote[] {
  const parsed = latestSchema.safeParse(json);
  if (!parsed.success) throw new Error("Unexpected Frankfurter response");
  const value = parsed.data.rates[to];
  const rate = value === undefined ? null : toRateString(value);
  return rate ? [{ id: "bce", label: "Oficial (BCE)", rate }] : [];
}
