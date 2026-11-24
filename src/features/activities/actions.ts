"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formValues, runAction } from "@/lib/server-action";
import { requireUser } from "@/server/auth/session";
import { activityService } from "@/server/container";

export async function createActivityAction(
  tripId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);

  return runAction(async () => {
    await activityService.create(user.id, tripId, values);
    refresh();
    return { status: "success", message: "Actividad agregada" };
  }, values);
}

export async function updateActivityAction(
  activityId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);

  let tripId: string | undefined;
  const state = await runAction(async () => {
    ({ tripId } = await activityService.update(user.id, activityId, values));
  }, values);

  if (tripId) redirect(`/trips/${tripId}`);
  return state;
}

/** Form action for the "move to day" select: appends the activity to that day. */
export async function moveToDayAction(
  activityId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await activityService.move(user.id, activityId, { date: formData.get("date") });
    refresh();
  });
}

/** Used by drag & drop: moves the activity to `date` (null = ideas) at `index`. */
export async function moveActivityAction(
  activityId: string,
  target: { date: string | null; index: number },
): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await activityService.move(user.id, activityId, target);
    refresh();
  });
}

export async function deleteActivityAction(activityId: string): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await activityService.delete(user.id, activityId);
    refresh();
  });
}
