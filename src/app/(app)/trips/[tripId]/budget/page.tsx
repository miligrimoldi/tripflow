import { Plus, SlidersHorizontal } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, CardHeading, Skeleton } from "@/components/ui/card";
import { toActivityOptions } from "@/features/budget/activity-options";
import { addExpenseAction, updateBudgetSettingsAction } from "@/features/budget/actions";
import { BudgetSettingsForm } from "@/features/budget/components/budget-settings-form";
import { BudgetSummaryCard, CategoryBreakdown } from "@/features/budget/components/budget-summary";
import { ExpenseForm } from "@/features/budget/components/expense-form";
import { ExpenseList } from "@/features/budget/components/expense-list";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { activityService, budgetService, membershipService } from "@/server/container";
import { hasPermission } from "@/server/members/member";
import { centsToInput } from "@/server/shared/money";

type Props = PageProps<"/trips/[tripId]/budget">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return tripMetadata((await params).tripId, "Presupuesto");
}

export default function BudgetPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[70vh]" />}>
      <Budget params={params} />
    </Suspense>
  );
}

async function Budget({ params }: Pick<Props, "params">) {
  const { tripId } = await params;
  const user = await requireUser(`/trips/${tripId}/budget`);
  const [{ trip, expenses, summary }, members, itinerary] = await orNotFound(
    Promise.all([
      budgetService.getOverview(user.id, tripId),
      membershipService.listMembers(user.id, tripId),
      activityService.getItinerary(user.id, tripId),
    ]),
  );
  const role = members.find((member) => member.userId === user.id)!.role;
  const canManage = hasPermission(role, "expense:manage");

  return (
    <div className="space-y-8">
      <TripHeader trip={trip} members={members} active="budget" />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <BudgetSummaryCard summary={summary} currency={trip.currency} memberCount={members.length} />
          <CategoryBreakdown summary={summary} currency={trip.currency} />
          <section aria-labelledby="expenses-title" className="space-y-3">
            <h2 id="expenses-title" className="text-lg font-semibold text-slate-900">
              Gastos estimados ({expenses.length})
            </h2>
            <ExpenseList tripId={trip.id} expenses={expenses} currency={trip.currency} canManage={canManage} />
          </section>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {canManage && (
            <Card className="p-5">
              <CardHeading
                icon={Plus}
                title="Agregar gasto"
                description="Montos estimados, para tener una idea del total."
              />
              <ExpenseForm
                action={addExpenseAction.bind(null, trip.id)}
                currency={trip.currency}
                activityOptions={toActivityOptions(itinerary)}
                submitLabel="Agregar"
              />
            </Card>
          )}
          {hasPermission(role, "trip:edit") && (
            <Card className="p-5">
              <CardHeading icon={SlidersHorizontal} tone="slate" title="Presupuesto y moneda" />
              <BudgetSettingsForm
                action={updateBudgetSettingsAction.bind(null, trip.id)}
                currency={trip.currency}
                budget={trip.budgetCents === null ? "" : centsToInput(trip.budgetCents)}
              />
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
