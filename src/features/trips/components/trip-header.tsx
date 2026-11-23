import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { formatDateRange } from "@/lib/format";
import type { TripMember } from "@/server/members/member";
import { tripLength, type Trip } from "@/server/trips/trip";

interface TripHeaderProps {
  trip: Trip;
  members: TripMember[];
  active: "itinerary" | "settings";
}

export function TripHeader({ trip, members, active }: TripHeaderProps) {
  const days = tripLength(trip);
  const tabs = [
    { id: "itinerary", label: "Itinerario", href: `/trips/${trip.id}` },
    { id: "settings", label: "Grupo y ajustes", href: `/trips/${trip.id}/settings` },
  ] as const;

  return (
    <header className="space-y-5">
      <Link href="/trips" className="text-sm text-slate-500 hover:text-slate-700">
        ← Mis viajes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{trip.name}</h1>
          <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
            <span>📍 {trip.destination}</span>
            <span>
              🗓️ {formatDateRange(trip.startDate, trip.endDate)} · {days} {days === 1 ? "día" : "días"}
            </span>
          </p>
          {trip.description && <p className="mt-2 max-w-2xl text-sm text-slate-600">{trip.description}</p>}
        </div>
        <div className="flex -space-x-2" aria-label={`${members.length} integrantes`}>
          {members.slice(0, 6).map((member) => (
            <Avatar key={member.userId} name={member.user.name} />
          ))}
          {members.length > 6 && (
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-600 ring-2 ring-white">
              +{members.length - 6}
            </span>
          )}
        </div>
      </div>
      <nav className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active === tab.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
              active === tab.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-700",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
