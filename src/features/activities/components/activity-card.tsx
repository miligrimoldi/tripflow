import { Clock, Link2, MapPin, Map as MapIcon, Trophy, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconTile } from "@/components/ui/icon-tile";
import { ActivityDiscussion } from "@/features/discussions/components/activity-discussion";
import { NO_DISCUSSION, type DiscussionView } from "@/features/discussions/view";
import { cn } from "@/lib/cn";
import type { Activity } from "@/server/activities/activity";
import { CATEGORY_META } from "../categories";
import { ActivityControls } from "./activity-controls";
import type { DayOption } from "./activity-form";

interface ActivityCardProps {
  activity: Activity;
  dayOptions: DayOption[];
  canManage: boolean;
  /** Formatted sum of the costs linked to this activity in the budget. */
  estimatedCost?: string;
  /** The group's votes and comments. */
  discussion?: DiscussionView;
  canDiscuss: boolean;
  /** The idea the group likes the most. */
  mostVoted?: boolean;
  /** A reliable photo of the place, shown instead of the category icon. */
  photoUrl?: string;
  /** Optional drag handle rendered at the start of the card. */
  dragHandle?: ReactNode;
  className?: string;
}

const metaLink = "inline-flex items-center gap-1 font-medium text-brand-700 hover:text-brand-800 hover:underline";

export function ActivityCard({
  activity,
  dayOptions,
  canManage,
  estimatedCost,
  discussion = NO_DISCUSSION,
  canDiscuss,
  mostVoted = false,
  photoUrl,
  dragHandle,
  className,
}: ActivityCardProps) {
  const category = CATEGORY_META[activity.category];
  const isIdea = activity.date === null;

  return (
    <article
      className={cn(
        "rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft transition-shadow hover:shadow-lift",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        {dragHandle}
        {photoUrl ? (
          // The photo, with the category as a small badge so it stays recognizable.
          <div className="relative shrink-0">
            <div className="relative size-14 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200/70">
              <Image src={photoUrl} alt="" fill sizes="56px" className="object-cover" />
            </div>
            <IconTile
              icon={category.icon}
              tone={category.tone}
              size="sm"
              className="absolute -right-1.5 -bottom-1.5 size-6 rounded-md ring-2 ring-white [&_svg]:size-3.5"
            />
          </div>
        ) : (
          <IconTile icon={category.icon} tone={category.tone} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="leading-snug font-semibold text-slate-900">{activity.title}</h3>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                {category.label}
                {mostVoted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                    <Trophy className="size-3" aria-hidden />
                    La más votada
                  </span>
                )}
              </p>
            </div>
            {activity.startTime && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700 ring-1 ring-brand-100 ring-inset">
                <Clock className="size-3" aria-hidden />
                {activity.startTime}
              </span>
            )}
          </div>

          {(activity.location || activity.url || estimatedCost) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-600">
              {activity.location && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="size-3.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="truncate">{activity.location}</span>
                </span>
              )}
              {activity.coordinates && (
                <Link href={`/trips/${activity.tripId}/map?focus=${activity.id}`} className={metaLink}>
                  <MapIcon className="size-3.5" aria-hidden />
                  Ver en el mapa
                </Link>
              )}
              {activity.url && (
                <a href={activity.url} target="_blank" rel="noopener noreferrer" className={metaLink}>
                  <Link2 className="size-3.5" aria-hidden />
                  Link
                </a>
              )}
              {estimatedCost && (
                <Link
                  href={`/trips/${activity.tripId}/budget`}
                  className="inline-flex items-center gap-1 font-medium text-slate-700 hover:underline"
                >
                  <Wallet className="size-3.5 text-slate-400" aria-hidden />
                  {estimatedCost}
                </Link>
              )}
            </div>
          )}

          {activity.notes && (
            <p className="mt-2.5 rounded-lg bg-sand-100 px-3 py-2 text-sm whitespace-pre-line text-slate-600">
              {activity.notes}
            </p>
          )}

          <p className="mt-2 text-xs text-slate-400">Agregado por {activity.createdBy.name}</p>
        </div>
      </div>
      {/* Ideas are where the group decides; a scheduled activity keeps its conversation if it has one. */}
      {(isIdea || discussion.comments.length > 0) && (
        <ActivityDiscussion activityId={activity.id} discussion={discussion} votable={isIdea} canDiscuss={canDiscuss} />
      )}
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
