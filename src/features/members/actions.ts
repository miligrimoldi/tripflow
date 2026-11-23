"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/lib/server-action";
import { requireUser } from "@/server/auth/session";
import { membershipService } from "@/server/container";

export async function createInvitationAction(tripId: string): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await membershipService.createInvitation(user.id, tripId);
    refresh();
  });
}

export async function acceptInvitationAction(token: string): Promise<ActionState> {
  const user = await requireUser(`/invite/${token}`);

  let tripId: string | undefined;
  const state = await runAction(async () => {
    ({ tripId } = await membershipService.acceptInvitation(user.id, token));
  });

  if (tripId) redirect(`/trips/${tripId}`);
  return state;
}

export async function removeMemberAction(tripId: string, memberUserId: string): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await membershipService.removeMember(user.id, tripId, memberUserId);
    refresh();
  });
}

export async function leaveTripAction(tripId: string): Promise<ActionState> {
  const user = await requireUser();
  const state = await runAction(() => membershipService.leaveTrip(user.id, tripId));
  if (state.status === "success") redirect("/trips");
  return state;
}
