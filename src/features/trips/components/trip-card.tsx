import { CalendarDays, MapPin, Mountain, Users } from "lucide-react";
import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import { tripLength, type TripSummary } from "@/server/trips/trip";
import { TripTimingChip } from "../trip-visuals";
import { TripCoverImage } from "./trip-cover-image";

export function TripCard({ trip }: { trip: TripSummary }) {
  const days = tripLength(trip);
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative h-36 overflow-hidden bg-slate-200">
        <TripCoverImage
          trip={trip}
          overlay="top"
          sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
          fallback={
            <Mountain
              strokeWidth={1.25}
              className="absolute -right-4 -bottom-6 size-36 text-white/20 transition duration-300 group-hover:scale-105"
            />
          }
        />
        <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
          <TripTimingChip trip={trip} />
          {trip.role === "OWNER" && (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm">
              Organizás
            </span>
          )}
        </div>
      </div>
      <div className="space-y-3 p-5">
        <div className="min-w-0">
          <h2 className="truncate text-xl font-semibold text-slate-900 group-hover:text-brand-700">{trip.name}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-600">
            <MapPin className="size-4 shrink-0 text-slate-400" aria-hidden />
            {trip.destination}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-slate-400" aria-hidden />
            {formatDateRange(trip.startDate, trip.endDate)}
          </span>
          <span>
            {days} {days === 1 ? "día" : "días"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4 text-slate-400" aria-hidden />
            {trip.memberCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
