"use server";

import { refresh } from "next/cache";
import type { ActionState } from "@/lib/action-state";
import { runAction } from "@/lib/server-action";
import { requireUser } from "@/server/auth/session";
import { routeService } from "@/server/container";
import type { RouteSuggestion } from "@/server/routes/route.service";

export type SuggestRouteResult = { status: "ok"; suggestion: RouteSuggestion } | { status: "error"; message: string };

export async function suggestDayRouteAction(tripId: string, date: string): Promise<SuggestRouteResult> {
  const user = await requireUser();
  let suggestion: RouteSuggestion | undefined;
  const state = await runAction(async () => {
    suggestion = await routeService.suggestDayRoute(user.id, tripId, { date });
  });
  if (state.status === "error") return { status: "error", message: state.message };
  return { status: "ok", suggestion: suggestion! };
}

export async function applyDayRouteAction(tripId: string, date: string, order: string[]): Promise<ActionState> {
  const user = await requireUser();
  return runAction(async () => {
    await routeService.applyDayRoute(user.id, tripId, { date, order });
    refresh();
    return { status: "success", message: "Recorrido actualizado" };
  });
}
