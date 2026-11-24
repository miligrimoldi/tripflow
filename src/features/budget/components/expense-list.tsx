import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
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
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
        Todavía no cargaron gastos. Empiecen por los grandes: pasajes y alojamiento.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {expenses.map((expense) => {
        const meta = EXPENSE_CATEGORY_META[expense.category];
        return (
          <li key={expense.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
            <span className="text-xl" aria-hidden>
              {meta.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{expense.description}</p>
              <p className="text-xs text-slate-500">
                {meta.label}
                {expense.activity && <> · 🔗 {expense.activity.title}</>} · por {expense.createdBy.name}
              </p>
            </div>
            <p className="font-semibold text-slate-900 tabular-nums">{formatMoney(expense.amountCents, currency)}</p>
            {canManage && (
              <div className="flex items-center gap-1">
                <Link
                  href={`/trips/${tripId}/budget/expenses/${expense.id}/edit`}
                  className={buttonClasses({ variant: "ghost", size: "sm" })}
                >
                  Editar
                </Link>
                <ConfirmAction
                  action={deleteExpenseAction.bind(null, expense.id)}
                  label="Eliminar"
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
