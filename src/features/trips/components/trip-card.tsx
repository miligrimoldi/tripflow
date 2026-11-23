import Link from "next/link";
import { formatDateRange } from "@/lib/format";
import { tripLength, type TripSummary } from "@/server/trips/trip";

export function TripCard({ trip }: { trip: TripSummary }) {
  const days = tripLength(trip);
  return (
    <Link
      href={`/trips/${trip.id}`}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900 group-hover:text-brand-700">{trip.name}</h2>
          <p className="truncate text-sm text-slate-600">📍 {trip.destination}</p>
        </div>
        {trip.role === "OWNER" && (
          <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
            Organizás
          </span>
        )}
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
        <span>🗓️ {formatDateRange(trip.startDate, trip.endDate)}</span>
        <span>
          {days} {days === 1 ? "día" : "días"}
        </span>
        <span>👥 {trip.memberCount}</span>
      </div>
    </Link>
  );
}
