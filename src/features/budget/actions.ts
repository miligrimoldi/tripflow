"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formValues, runAction } from "@/lib/server-action";
import { requireUser } from "@/server/auth/session";
import { budgetService } from "@/server/container";

export async function addExpenseAction(tripId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);
  return runAction(async () => {
    await budgetService.addExpense(user.id, tripId, values);
    refresh();
    return { status: "success", message: "Gasto agregado" };
  }, values);
}

export async function updateExpenseAction(
  expenseId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);

  let tripId: string | undefined;
  const state = await runAction(async () => {
    ({ tripId } = await budgetService.updateExpense(user.id, expenseId, values));
  }, values);

  if (tripId) redirect(`/trips/${tripId}/budget`);
  return state;
}

export async function deleteExpenseAction(expenseId: string): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await budgetService.deleteExpense(user.id, expenseId);
    refresh();
  });
}

export async function updateBudgetSettingsAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);
  return runAction(async () => {
    await budgetService.updateSettings(user.id, tripId, values);
    refresh();
    return { status: "success", message: "Presupuesto actualizado" };
  }, values);
}
