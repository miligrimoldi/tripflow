"use client";

import { CollisionPriority } from "@dnd-kit/abstract";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider, useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Activity } from "@/server/activities/activity";
import { moveActivityAction } from "../actions";
import { IDEAS_SLOT, locate, slotDate, type BoardSlots } from "../board";
import { ActivityCard } from "./activity-card";
import type { DayOption } from "./activity-form";

export interface BoardDay {
  date: string;
  dayNumber: number;
  /** Pre-formatted on the server ("Sábado, 10 de julio") to avoid hydration mismatches. */
  label: string;
}

interface ItineraryBoardProps {
  days: BoardDay[];
  slots: BoardSlots;
  dayOptions: DayOption[];
  canManage: boolean;
  /** Formatted estimated cost per activity id (from the budget). */
  costs: Record<string, string>;
  /** Rendered at the top of the sidebar, above the ideas board. */
  sidebar?: ReactNode;
}

/**
 * Itinerary days + ideas board with drag & drop between them.
 *
 * The board renders the server state, applies moves optimistically while
 * dragging and persists the final position with a server action. If saving
 * fails, it rolls back to the last known server state.
 */
export function ItineraryBoard({
  days,
  slots: serverSlots,
  dayOptions,
  canManage,
  costs,
  sidebar,
}: ItineraryBoardProps) {
  const [slots, setSlots] = useState(serverSlots);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // Snapshots used while dragging. Refs (not state) so the drop handler sees
  // the final position even if React has not re-rendered yet.
  const beforeDrag = useRef<BoardSlots>(serverSlots);
  const during = useRef<BoardSlots>(serverSlots);

  // Fresh data from the server (after any mutation) replaces local state.
  const [syncedSlots, setSyncedSlots] = useState(serverSlots);
  if (serverSlots !== syncedSlots) {
    setSyncedSlots(serverSlots);
    setSlots(serverSlots);
  }

  function persist(activityId: string, slotId: string, index: number) {
    startTransition(async () => {
      const result = await moveActivityAction(activityId, { date: slotDate(slotId), index });
      if (result.status === "error") {
        setSlots(beforeDrag.current);
        setError(result.message);
      }
    });
  }

  const ideas = slots[IDEAS_SLOT] ?? [];
  const slotProps = { dayOptions, canManage, costs };

  return (
    <DragDropProvider
      onDragStart={() => {
        beforeDrag.current = slots;
        during.current = slots;
        setError(null);
      }}
      onDragOver={(event) => {
        during.current = move(during.current, event);
        setSlots(during.current);
      }}
      onDragEnd={(event) => {
        if (event.canceled) {
          setSlots(beforeDrag.current);
          return;
        }
        const activityId = event.operation.source?.id;
        if (activityId == null) return;

        const before = locate(beforeDrag.current, String(activityId));
        const after = locate(during.current, String(activityId));
        if (!after || (before?.slotId === after.slotId && before.index === after.index)) return;
        persist(String(activityId), after.slotId, after.index);
      }}
    >
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          No se pudo mover la actividad: {error}
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-labelledby="itinerary-title" className="space-y-6">
          <h2 id="itinerary-title" className="sr-only">
            Itinerario
          </h2>
          {days.map((day) => (
            <div key={day.date} className="space-y-3">
              <h3 className="flex items-baseline gap-3">
                <span className="rounded-md bg-brand-600 px-2 py-0.5 text-sm font-semibold text-white">
                  Día {day.dayNumber}
                </span>
                <span className="font-medium text-slate-700">{day.label}</span>
              </h3>
              <Slot
                slotId={day.date}
                activities={slots[day.date] ?? []}
                emptyText="Nada planeado todavía. Agregá una actividad o arrastrá una idea a este día."
                {...slotProps}
              />
            </div>
          ))}
        </section>

        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {sidebar}
          <section aria-labelledby="ideas-title" className="space-y-3">
            <div>
              <h2 id="ideas-title" className="font-semibold text-slate-900">
                💡 Ideas <span className="text-slate-500">({ideas.length})</span>
              </h2>
              <p className="text-xs text-slate-500">
                Lugares y planes que todavía no tienen día.
                {canManage && " Arrastralos al itinerario cuando sepan cuándo ir."}
              </p>
            </div>
            <Slot
              slotId={IDEAS_SLOT}
              activities={ideas}
              emptyText="Sin ideas guardadas. ¿Algún restaurante o excursión que les interese?"
              {...slotProps}
            />
          </section>
        </aside>
      </div>
    </DragDropProvider>
  );
}

interface SlotProps {
  slotId: string;
  activities: Activity[];
  emptyText: string;
  dayOptions: DayOption[];
  canManage: boolean;
  costs: Record<string, string>;
}

/** A droppable list (a day or the ideas board). Empty slots still accept drops. */
function Slot({ slotId, activities, emptyText, dayOptions, canManage, costs }: SlotProps) {
  const { ref, isDropTarget } = useDroppable({
    id: slotId,
    type: "slot",
    accept: "activity",
    // With cards inside, dropping next to a card should win over the list
    // itself. An empty list must win instead: otherwise the dragged card (which
    // follows the pointer) is always the closest target and it can't be dropped.
    collisionPriority: activities.length === 0 ? CollisionPriority.High : CollisionPriority.Low,
    disabled: !canManage,
  });

  return (
    <ol
      ref={ref}
      className={cn(
        "min-h-16 space-y-3 rounded-xl transition-colors",
        isDropTarget && "bg-brand-50 outline-2 outline-offset-4 outline-brand-200 outline-dashed",
      )}
    >
      {activities.map((activity, index) => (
        <SortableActivity
          key={activity.id}
          activity={activity}
          index={index}
          slotId={slotId}
          dayOptions={dayOptions}
          canManage={canManage}
          estimatedCost={costs[activity.id]}
        />
      ))}
      {activities.length === 0 && (
        <li className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
          {emptyText}
        </li>
      )}
    </ol>
  );
}

interface SortableActivityProps {
  activity: Activity;
  index: number;
  slotId: string;
  dayOptions: DayOption[];
  canManage: boolean;
  estimatedCost?: string;
}

function SortableActivity({ activity, index, slotId, dayOptions, canManage, estimatedCost }: SortableActivityProps) {
  const { ref, handleRef, isDragging } = useSortable({
    id: activity.id,
    index,
    group: slotId,
    type: "activity",
    accept: "activity",
    disabled: !canManage,
  });

  return (
    <li ref={ref} data-dragging={isDragging || undefined}>
      <ActivityCard
        activity={activity}
        dayOptions={dayOptions}
        canManage={canManage}
        estimatedCost={estimatedCost}
        className={cn(isDragging && "shadow-lg ring-2 ring-brand-500")}
        dragHandle={
          canManage && (
            <button
              ref={handleRef}
              type="button"
              aria-label={`Mover «${activity.title}». Arrastrá, o usá Espacio y las flechas.`}
              title="Arrastrar para mover"
              className="-ml-1 flex h-6 w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
            >
              <svg viewBox="0 0 10 16" className="h-4 w-2.5 fill-current" aria-hidden>
                {[2, 8, 14].flatMap((y) => [
                  <circle key={`l${y}`} cx="2" cy={y} r="1.5" />,
                  <circle key={`r${y}`} cx="8" cy={y} r="1.5" />,
                ])}
              </svg>
            </button>
          )
        }
      />
    </li>
  );
}
