import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { BudgetStatus, BudgetSummary } from "@/server/budget/expense";
import { formatMoney, type Currency } from "@/server/shared/money";
import { EXPENSE_CATEGORY_META } from "../categories";

const percent = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 0 });

/** Status always shows icon + words, never color alone. */
const STATUS: Record<Exclude<BudgetStatus, "no-budget">, { icon: string; bar: string; text: string }> = {
  ok: { icon: "✅", bar: "bg-brand-600", text: "text-slate-700" },
  warning: { icon: "⚠️", bar: "bg-amber-500", text: "text-amber-800" },
  over: { icon: "⛔", bar: "bg-red-600", text: "text-red-700" },
};

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
  currency: Currency;
  memberCount: number;
}

/** Headline total, a meter against the budget and the per-person split. */
export function BudgetSummaryCard({ summary, currency, memberCount }: BudgetSummaryCardProps) {
  const money = (cents: number) => formatMoney(cents, currency);

  return (
    <Card className="space-y-5 p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Total estimado</p>
          <p className="text-4xl font-bold tracking-tight text-slate-900">{money(summary.totalCents)}</p>
        </div>
        {summary.perPersonCents !== null && memberCount > 1 && (
          <div className="text-right">
            <p className="text-sm text-slate-500">Por persona ({memberCount})</p>
            <p className="text-xl font-semibold text-slate-900">≈ {money(summary.perPersonCents)}</p>
          </div>
        )}
      </div>

      {summary.status === "no-budget" ? (
        <p className="text-sm text-slate-500">
          Sin presupuesto definido. Quien organiza el viaje puede fijar uno para ver cuánto queda.
        </p>
      ) : (
        <BudgetMeter summary={summary as BudgetSummary & { budgetCents: number; usedRatio: number }} money={money} />
      )}
    </Card>
  );
}

function BudgetMeter({
  summary,
  money,
}: {
  summary: BudgetSummary & { budgetCents: number; usedRatio: number };
  money: (cents: number) => string;
}) {
  const status = STATUS[summary.status as keyof typeof STATUS];
  const remaining = summary.remainingCents ?? 0;
  const message =
    summary.status === "over"
      ? `Se pasan por ${money(-remaining)}`
      : summary.status === "warning"
        ? `Cerca del límite: quedan ${money(remaining)}`
        : `Quedan ${money(remaining)}`;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className={cn("font-medium", status.text)}>
          <span aria-hidden>{status.icon}</span> {message}
        </span>
        <span className="text-slate-500">
          {percent.format(summary.usedRatio)} de {money(summary.budgetCents)}
        </span>
      </div>
      <div
        role="meter"
        aria-label="Presupuesto usado"
        aria-valuemin={0}
        aria-valuemax={summary.budgetCents}
        aria-valuenow={summary.totalCents}
        aria-valuetext={`${money(summary.totalCents)} de ${money(summary.budgetCents)}`}
        className="h-2.5 overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", status.bar)}
          style={{ width: `${Math.min(summary.usedRatio, 1) * 100}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Ranked horizontal bars (largest first, one hue): the clearest way to
 * compare parts of a whole. Every bar has its amount and share as text.
 */
export function CategoryBreakdown({ summary, currency }: { summary: BudgetSummary; currency: Currency }) {
  if (summary.byCategory.length === 0) return null;
  const largest = summary.byCategory[0].totalCents;

  return (
    <Card className="p-6">
      <h2 className="mb-4 font-semibold text-slate-900">Por categoría</h2>
      <ul className="space-y-3">
        {summary.byCategory.map(({ category, totalCents, share }) => {
          const meta = EXPENSE_CATEGORY_META[category];
          const label = `${meta.label}: ${formatMoney(totalCents, currency)} (${percent.format(share)} del total)`;
          return (
            <li key={category} title={label} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-slate-700">
                  <span aria-hidden>{meta.icon}</span> {meta.label}
                </span>
                <span className="text-slate-900 tabular-nums">
                  {formatMoney(totalCents, currency)} <span className="text-slate-500">· {percent.format(share)}</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100" aria-hidden>
                <div
                  className="h-full rounded-full bg-brand-500"
                  style={{ width: `${(totalCents / largest) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
