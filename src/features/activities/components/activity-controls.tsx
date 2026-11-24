"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { idleState } from "@/lib/action-state";
import { deleteActivityAction, moveToDayAction } from "../actions";
import type { DayOption } from "./activity-form";

interface ActivityControlsProps {
  activityId: string;
  tripId: string;
  currentDate: string | null;
  dayOptions: DayOption[];
}

export function ActivityControls({ activityId, tripId, currentDate, dayOptions }: ActivityControlsProps) {
  const [state, moveAction, pending] = useActionState(moveToDayAction.bind(null, activityId), idleState);

  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Alternative to drag & drop, handy on small screens. Keyed by the
            current day so it shows the right value after the activity moves. */}
        <form action={moveAction} key={currentDate ?? "ideas"}>
          <label className="sr-only" htmlFor={`move-${activityId}`}>
            Mover a
          </label>
          <select
            id={`move-${activityId}`}
            name="date"
            defaultValue={currentDate ?? ""}
            disabled={pending}
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
      {state.status === "error" && (
        <p role="alert" className="text-xs text-red-600">
          {state.message}
        </p>
      )}
    </div>
  );
}
