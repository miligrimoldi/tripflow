"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formValues, runAction } from "@/lib/server-action";
import { requireUser } from "@/server/auth/session";
import { budgetService, settleUpService } from "@/server/container";

/**
 * The form's values plus the checked participants. A checkbox group sends
 * one value per box, which `formValues` would collapse to the last one; they
 * are also echoed back joined, so the form can re-check them after an error.
 */
function expenseValues(formData: FormData) {
  const participantIds = formData.getAll("participantIds").filter((id): id is string => typeof id === "string");
  const values = formValues(formData);
  return {
    input: { ...values, participantIds },
    submitted: { ...values, participantIds: participantIds.join(",") },
  };
}

export async function addExpenseAction(tripId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const { input, submitted } = expenseValues(formData);
  return runAction(async () => {
    await budgetService.addExpense(user.id, tripId, input);
    refresh();
    return { status: "success", message: "Gasto agregado" };
  }, submitted);
}

export async function updateExpenseAction(
  expenseId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const { input, submitted } = expenseValues(formData);

  let tripId: string | undefined;
  const state = await runAction(async () => {
    ({ tripId } = await budgetService.updateExpense(user.id, expenseId, input));
  }, submitted);

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

export async function recordSettlementAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);
  return runAction(async () => {
    await settleUpService.record(user.id, tripId, values);
    refresh();
    return { status: "success", message: "Pago registrado" };
  }, values);
}

/** One-click version for a suggested transfer ("Marcar como pagado"). */
export async function settleTransferAction(
  tripId: string,
  transfer: { fromId: string; toId: string; amount: string },
): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await settleUpService.record(user.id, tripId, transfer);
    refresh();
  });
}

export async function deleteSettlementAction(settlementId: string): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await settleUpService.delete(user.id, settlementId);
    refresh();
  });
}
