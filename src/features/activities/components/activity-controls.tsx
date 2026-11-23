"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { idleState } from "@/lib/action-state";
import type { MoveDirection } from "@/server/activities/activity";
import { deleteActivityAction, moveActivityAction, scheduleActivityAction } from "../actions";
import type { DayOption } from "./activity-form";

interface ActivityControlsProps {
  activityId: string;
  tripId: string;
  currentDate: string | null;
  dayOptions: DayOption[];
  canMoveUp: boolean;
  canMoveDown: boolean;
}

export function ActivityControls({
  activityId,
  tripId,
  currentDate,
  dayOptions,
  canMoveUp,
  canMoveDown,
}: ActivityControlsProps) {
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    scheduleActivityAction.bind(null, activityId),
    idleState,
  );
  const [moveState, moveAction, movePending] = useActionState(
    (_prev: unknown, direction: MoveDirection) => moveActivityAction(activityId, direction),
    idleState,
  );
  const error =
    (scheduleState.status === "error" && scheduleState.message) || (moveState.status === "error" && moveState.message);

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <form action={scheduleAction}>
          <label className="sr-only" htmlFor={`schedule-${activityId}`}>
            Mover a
          </label>
          <select
            id={`schedule-${activityId}`}
            name="date"
            defaultValue={currentDate ?? ""}
            disabled={schedulePending}
            // Submit as soon as a new day is picked.
            onChange={(event) => event.currentTarget.form?.requestSubmit()}
            className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-700"
          >
            <option value="">💡 Ideas</option>
            {dayOptions.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
          <noscript>
            <Button size="sm" variant="secondary">
              Mover
            </Button>
          </noscript>
        </form>

        <div className="flex items-center">
          <form action={() => moveAction("up")}>
            <Button size="sm" variant="ghost" disabled={!canMoveUp || movePending} aria-label="Subir">
              ↑
            </Button>
          </form>
          <form action={() => moveAction("down")}>
            <Button size="sm" variant="ghost" disabled={!canMoveDown || movePending} aria-label="Bajar">
              ↓
            </Button>
          </form>
        </div>

        <Link
          href={`/trips/${tripId}/activities/${activityId}/edit`}
          className={buttonClasses({ variant: "ghost", size: "sm" })}
        >
          Editar
        </Link>

        <ConfirmAction
          action={deleteActivityAction.bind(null, activityId)}
          label="Eliminar"
          confirmLabel="Sí, eliminar"
          question="¿Eliminar?"
          variant="ghost"
          size="sm"
        />
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
