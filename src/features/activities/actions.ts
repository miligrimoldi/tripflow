"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formValues, runAction } from "@/lib/server-action";
import type { MoveDirection } from "@/server/activities/activity";
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

export async function scheduleActivityAction(
  activityId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await activityService.schedule(user.id, activityId, { date: formData.get("date") });
    refresh();
  });
}

export async function moveActivityAction(activityId: string, direction: MoveDirection): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await activityService.move(user.id, activityId, direction);
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
