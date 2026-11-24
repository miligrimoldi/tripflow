"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { formValues, runAction } from "@/lib/server-action";
import { requireUser } from "@/server/auth/session";
import { coverService, tripService } from "@/server/container";
import { ValidationError } from "@/server/shared/errors";

export async function createTripAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);

  let tripId: string | undefined;
  const state = await runAction(async () => {
    ({ id: tripId } = await tripService.create(user.id, values));
  }, values);

  if (tripId) redirect(`/trips/${tripId}`);
  return state;
}

export async function updateTripAction(tripId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const values = formValues(formData);

  return runAction(async () => {
    await tripService.update(user.id, tripId, values);
    refresh();
    return { status: "success", message: "Cambios guardados" };
  }, values);
}

export async function deleteTripAction(tripId: string): Promise<ActionState> {
  const user = await requireUser();
  const state = await runAction(() => tripService.delete(user.id, tripId));
  if (state.status === "success") redirect("/trips");
  return state;
}

export async function uploadCoverAction(tripId: string, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const file = formData.get("cover");
  return runAction(async () => {
    if (!(file instanceof File)) throw new ValidationError("Elegí una foto", { cover: ["Elegí una foto"] });
    await coverService.upload(user.id, tripId, { bytes: new Uint8Array(await file.arrayBuffer()) });
    refresh();
    return { status: "success", message: "Foto actualizada" };
  });
}

export async function removeCoverAction(tripId: string): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await coverService.remove(user.id, tripId);
    refresh();
    return { status: "success", message: "Volvimos a la foto del destino" };
  });
}
