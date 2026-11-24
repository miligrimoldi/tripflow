import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Activity } from "@/server/activities/activity";
import { CATEGORY_META } from "../categories";
import { ActivityControls } from "./activity-controls";
import type { DayOption } from "./activity-form";

interface ActivityCardProps {
  activity: Activity;
  dayOptions: DayOption[];
  canManage: boolean;
  /** Optional drag handle rendered at the start of the card. */
  dragHandle?: ReactNode;
  className?: string;
}

export function ActivityCard({ activity, dayOptions, canManage, dragHandle, className }: ActivityCardProps) {
  const category = CATEGORY_META[activity.category];

  return (
    <article className={cn("rounded-xl border border-slate-200 bg-white p-4 shadow-xs", className)}>
      <div className="flex items-start gap-3">
        {dragHandle}
        <span className="text-xl leading-none" aria-hidden>
          {category.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {activity.startTime && (
              <span className="font-mono text-sm font-semibold text-brand-700">{activity.startTime}</span>
            )}
            <h3 className="font-semibold text-slate-900">{activity.title}</h3>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className={cn("rounded-full px-2 py-0.5 font-medium ring-1 ring-inset", category.badge)}>
              {category.label}
            </span>
            {activity.location && <span>📍 {activity.location}</span>}
            {activity.url && (
              <a
                href={activity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-700 underline-offset-2 hover:underline"
              >
                🔗 Ver link
              </a>
            )}
            <span>Agregado por {activity.createdBy.name}</span>
          </div>
          {activity.notes && <p className="mt-2 text-sm whitespace-pre-line text-slate-600">{activity.notes}</p>}
        </div>
      </div>
      {canManage && (
        <ActivityControls
          activityId={activity.id}
          tripId={activity.tripId}
          currentDate={activity.date}
          dayOptions={dayOptions}
        />
      )}
    </article>
  );
}
