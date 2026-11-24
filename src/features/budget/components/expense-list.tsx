import { Link2, Pencil, Receipt, Trash } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { EmptyState } from "@/components/ui/empty-state";
import { IconTile } from "@/components/ui/icon-tile";
import type { Expense } from "@/server/budget/expense";
import { formatMoney, type Currency } from "@/server/shared/money";
import { deleteExpenseAction } from "../actions";
import { EXPENSE_CATEGORY_META } from "../categories";

interface ExpenseListProps {
  tripId: string;
  expenses: Expense[];
  currency: Currency;
  canManage: boolean;
}

export function ExpenseList({ tripId, expenses, currency, canManage }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <EmptyState icon={Receipt} title="Todavía no hay gastos" tone="slate">
        Empiecen por los grandes: pasajes y alojamiento. Después, entradas y comidas.
      </EmptyState>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft">
      {expenses.map((expense) => {
        const meta = EXPENSE_CATEGORY_META[expense.category];
        return (
          <li key={expense.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5">
            <IconTile icon={meta.icon} tone={meta.tone} />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{expense.description}</p>
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                {meta.label}
                {expense.activity && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="size-3" aria-hidden />
                      {expense.activity.title}
                    </span>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {expense.paidBy ? (
                  <>
                    Pagó <span className="font-medium text-slate-700">{expense.paidBy.name}</span>
                    {" · "}
                    {splitLabel(expense.participants)}
                  </>
                ) : (
                  <>
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">Estimado</span>{" "}
                    {splitLabel(expense.participants)}
                  </>
                )}
              </p>
            </div>
            <p className="font-display text-lg font-semibold text-slate-900 tabular-nums">
              {formatMoney(expense.amountCents, currency)}
            </p>
            {canManage && (
              <div className="flex items-center gap-1">
                <Link
                  href={`/trips/${tripId}/budget/expenses/${expense.id}/edit`}
                  className={buttonClasses({ variant: "ghost", size: "sm" })}
                  aria-label={`Editar ${expense.description}`}
                >
                  <Pencil aria-hidden />
                </Link>
                <ConfirmAction
                  action={deleteExpenseAction.bind(null, expense.id)}
                  label="Eliminar"
                  icon={<Trash aria-hidden />}
                  confirmLabel="Sí, eliminar"
                  question="¿Eliminar?"
                  variant="ghost"
                  size="sm"
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** "entre todos (3)", "solo Bruno", "entre Ana y Carla". */
function splitLabel(participants: Expense["participants"]): string {
  if (participants.length === 1) return `solo ${participants[0].name}`;
  if (participants.length === 2) return `entre ${participants[0].name} y ${participants[1].name}`;
  return `entre ${participants.length}`;
}
