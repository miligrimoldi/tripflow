import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/card";
import { toActivityOptions } from "@/features/budget/activity-options";
import { updateExpenseAction } from "@/features/budget/actions";
import { ExpenseForm } from "@/features/budget/components/expense-form";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { activityService, budgetService, membershipService, tripService } from "@/server/container";
import { hasPermission } from "@/server/members/member";
import { centsToInput, formatRate } from "@/server/shared/money";

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
  const [{ trip, role }, expense, itinerary, members] = await orNotFound(
    Promise.all([
      tripService.get(user.id, tripId),
      budgetService.getExpense(user.id, expenseId),
      activityService.getItinerary(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
    ]),
  );
  if (expense.tripId !== trip.id || !hasPermission(role, "expense:manage")) notFound();

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <BackLink href={`/trips/${trip.id}/budget`}>Presupuesto de {trip.name}</BackLink>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Editar gasto</h1>
      </div>
      <Card className="p-6 sm:p-8">
        <ExpenseForm
          action={updateExpenseAction.bind(null, expense.id)}
          currency={trip.currency}
          activityOptions={toActivityOptions(itinerary)}
          members={members.map((member) => ({ id: member.userId, name: member.user.name }))}
          initial={{
            description: expense.description,
            category: expense.category,
            // What was actually paid: the original currency and rate, if any.
            amount: centsToInput(expense.original?.amountCents ?? expense.amountCents),
            currency: expense.original?.currency ?? trip.currency,
            rate: expense.original ? formatRate(expense.original.rate) : "",
            activityId: expense.activity?.id ?? "",
            paidById: expense.paidBy?.id ?? "",
            participantIds: expense.participants.map((participant) => participant.id),
          }}
          submitLabel="Guardar cambios"
        />
      </Card>
    </div>
  );
}
