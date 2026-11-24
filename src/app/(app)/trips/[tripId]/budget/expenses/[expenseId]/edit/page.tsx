import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/card";
import { toActivityOptions } from "@/features/budget/activity-options";
import { updateExpenseAction } from "@/features/budget/actions";
import { ExpenseForm } from "@/features/budget/components/expense-form";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { activityService, budgetService, tripService } from "@/server/container";
import { hasPermission } from "@/server/members/member";
import { centsToInput } from "@/server/shared/money";

export const metadata: Metadata = { title: "Editar gasto" };

type Props = PageProps<"/trips/[tripId]/budget/expenses/[expenseId]/edit">;

export default function EditExpensePage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<Skeleton className="h-96" />}>
        <EditExpense params={params} />
      </Suspense>
    </div>
  );
}

async function EditExpense({ params }: Pick<Props, "params">) {
  const { tripId, expenseId } = await params;
  const user = await requireUser();
  const [{ trip, role }, expense, itinerary] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      budgetService.getExpense(user.id, expenseId),
      activityService.getItinerary(user.id, tripId),
    ]),
  );
  if (expense.tripId !== trip.id || !hasPermission(role, "expense:manage")) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/trips/${trip.id}/budget`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Presupuesto de {trip.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar gasto</h1>
      </div>
      <Card className="p-6">
        <ExpenseForm
          action={updateExpenseAction.bind(null, expense.id)}
          currency={trip.currency}
          activityOptions={toActivityOptions(itinerary)}
          initial={{
            description: expense.description,
            category: expense.category,
            amount: centsToInput(expense.amountCents),
            activityId: expense.activity?.id ?? "",
          }}
          submitLabel="Guardar cambios"
        />
      </Card>
    </div>
  );
}
