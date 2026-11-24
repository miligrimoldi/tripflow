"use client";

import { ArrowRightLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import type { RateQuote } from "@/server/currency/exchange-rate";
import {
  convertCents,
  CURRENCIES,
  formatMoney,
  formatRate,
  parseAmountToCents,
  parseRate,
  type Currency,
} from "@/server/shared/money";

interface AmountFieldProps {
  /** Totals and debts are kept in this currency. */
  tripCurrency: Currency;
  initial: { amount: string; currency: string; rate: string };
  errors: { amount?: string; currency?: string; rate?: string };
}

type QuotesState = { status: "idle" | "loading" | "error" } | { status: "ready"; quotes: RateQuote[] };

/** Quotes loaded for a currency pair; `null` if they couldn't be loaded. */
interface LoadedQuotes {
  pair: string;
  quotes: RateQuote[] | null;
}

/**
 * Amount, the currency it was paid in and, for another currency, the rate:
 * suggested from today's quotes (card dollar first) and always editable.
 */
export function AmountField({ tripCurrency, initial, errors }: AmountFieldProps) {
  const [currency, setCurrency] = useState<Currency>(
    (CURRENCIES as readonly string[]).includes(initial.currency) ? (initial.currency as Currency) : tripCurrency,
  );
  const [amount, setAmount] = useState(initial.amount);
  const [rate, setRate] = useState(initial.rate);
  const [loaded, setLoaded] = useState<LoadedQuotes | null>(null);
  const foreign = currency !== tripCurrency;
  const pair = `${currency}-${tripCurrency}`;
  // Derived rather than stored: until the quotes for this pair arrive, it's loading.
  const quotes: QuotesState = !foreign
    ? { status: "idle" }
    : loaded?.pair !== pair
      ? { status: "loading" }
      : loaded.quotes
        ? { status: "ready", quotes: loaded.quotes }
        : { status: "error" };

  // Today's quotes whenever another currency is picked. The first one fills
  // the rate if the person hasn't typed one (unless they just got an error
  // for leaving it empty: then the field must stay as they left it).
  const autoFill = !errors.rate;
  useEffect(() => {
    if (!foreign) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ from: currency, to: tripCurrency });
    fetch(`/api/exchange-rates?${params}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .then(({ quotes: fresh }: { quotes: RateQuote[] }) => {
        setLoaded({ pair, quotes: fresh });
        if (autoFill) setRate((current) => current || (fresh[0] ? formatRate(fresh[0].rate) : ""));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        console.warn("[exchange] could not load quotes", error);
        setLoaded({ pair, quotes: null });
      });
    return () => controller.abort();
  }, [currency, tripCurrency, foreign, pair, autoFill]);

  const parsedRate = parseRate(rate);
  const amountCents = parseAmountToCents(amount);
  const converted = foreign && amountCents && parsedRate ? convertCents(amountCents, parsedRate) : null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(7rem,auto)_minmax(0,1fr)] items-start gap-3">
        <Field label="Moneda" error={errors.currency}>
          {(props) => (
            <Select
              {...props}
              name="currency"
              value={currency}
              onChange={(event) => {
                setCurrency(event.target.value as Currency);
                setRate("");
              }}
            >
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Monto" error={errors.amount} hint="Ej.: 15.000 o 1.234,50">
          {(props) => (
            <Input
              {...props}
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          )}
        </Field>
      </div>

      {foreign && (
        <div className="space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
          <Field label={`Cotización: 1 ${currency} en ${tripCurrency}`} error={errors.rate}>
            {(props) => (
              <Input
                {...props}
                name="rate"
                inputMode="decimal"
                autoComplete="off"
                placeholder={quotes.status === "loading" ? "Buscando cotización…" : "Ej.: 1.450"}
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                required
              />
            )}
          </Field>

          {quotes.status === "ready" && quotes.quotes.length > 0 && (
            <div role="group" aria-label="Cotizaciones de hoy" className="flex flex-wrap gap-1.5">
              {quotes.quotes.map((quote) => {
                const selected = parsedRate === quote.rate;
                return (
                  <button
                    key={quote.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setRate(formatRate(quote.rate))}
                    className={cn(
                      "inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-xs font-medium transition-colors",
                      selected
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    {quote.label}
                    <span className={cn("tabular-nums", selected ? "text-white/85" : "text-slate-500")}>
                      {formatRate(quote.rate)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          {quotes.status === "ready" && quotes.quotes.length === 0 && (
            <p className="text-xs text-slate-500">No hay una cotización sugerida para esta moneda: escribila vos.</p>
          )}
          {quotes.status === "error" && (
            <p className="text-xs text-slate-500">No pudimos traer la cotización de hoy: escribila vos.</p>
          )}

          <p className="flex items-center gap-1.5 text-sm text-slate-700" aria-live="polite">
            <ArrowRightLeft className="size-3.5 shrink-0 text-slate-400" aria-hidden />
            {converted !== null ? (
              <>
                Equivale a <span className="font-semibold tabular-nums">{formatMoney(converted, tripCurrency)}</span>
              </>
            ) : (
              <span className="text-slate-500">Completá el monto y la cotización para ver el equivalente.</span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            La cotización queda guardada con el gasto: si el {currency} cambia mañana, este gasto no cambia.
          </p>
        </div>
      )}
    </div>
  );
}
