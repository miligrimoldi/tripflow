import {
  CircleCheck,
  OctagonExclamationPoint,
  PiggyBank,
  TriangleExclamationPoint,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/cn";
import type { BudgetStatus, BudgetSummary } from "@/server/budget/expense";
import { formatMoney, type Currency } from "@/server/shared/money";
import { EXPENSE_CATEGORY_META } from "../categories";

const percent = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 0 });

/** Status always shows icon + words, never color alone. */
const STATUS: Record<Exclude<BudgetStatus, "no-budget">, { icon: LucideIcon; bar: string; text: string }> = {
  ok: { icon: CircleCheck, bar: "bg-brand-500", text: "text-brand-800" },
  warning: { icon: TriangleExclamationPoint, bar: "bg-amber-500", text: "text-amber-800" },
  over: { icon: OctagonExclamationPoint, bar: "bg-red-500", text: "text-red-700" },
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
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-6 bg-linear-to-br from-brand-50 via-white to-white p-6">
        <div className="flex items-center gap-4">
          <IconTile icon={PiggyBank} tone="brand" size="lg" />
          <div>
            <p className="text-sm font-medium text-slate-500">Total estimado</p>
            <p className="font-display text-4xl font-bold tracking-tight text-slate-900 tabular-nums">
              {money(summary.totalCents)}
            </p>
          </div>
        </div>
        {summary.perPersonCents !== null && memberCount > 1 && (
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-slate-200/70">
            <Users className="size-5 text-slate-400" aria-hidden />
            <div>
              <p className="text-xs font-medium text-slate-500">Por persona ({memberCount})</p>
              <p className="font-display text-lg font-semibold text-slate-900 tabular-nums">
                ≈ {money(summary.perPersonCents)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-6 py-5">
        {summary.status === "no-budget" ? (
          <p className="text-sm text-slate-500">
            Sin presupuesto definido. Quien organiza el viaje puede fijar uno para ver cuánto queda.
          </p>
        ) : (
          <BudgetMeter summary={summary as BudgetSummary & { budgetCents: number; usedRatio: number }} money={money} />
        )}
      </div>
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
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className={cn("inline-flex items-center gap-1.5 font-semibold", status.text)}>
          <status.icon className="size-4 self-center" aria-hidden />
          {message}
        </span>
        <span className="text-slate-500 tabular-nums">
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
        className="h-3 overflow-hidden rounded-full bg-slate-100"
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
      <h2 className="mb-5 text-lg font-semibold text-slate-900">Por categoría</h2>
      <ul className="space-y-4">
        {summary.byCategory.map(({ category, totalCents, share }) => {
          const meta = EXPENSE_CATEGORY_META[category];
          const label = `${meta.label}: ${formatMoney(totalCents, currency)} (${percent.format(share)} del total)`;
          return (
            <li key={category} title={label} className="flex items-center gap-3">
              <IconTile icon={meta.icon} tone={meta.tone} size="sm" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-slate-700">{meta.label}</span>
                  <span className="shrink-0 text-slate-900 tabular-nums">
                    {formatMoney(totalCents, currency)}
                    <span className="ml-1.5 text-xs text-slate-500">{percent.format(share)}</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-100" aria-hidden>
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(totalCents / largest) * 100}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
