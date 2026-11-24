import { ArrowLeft, CalendarDays, Map as MapIcon, MapPin, Settings, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { formatDateRange } from "@/lib/format";
import type { TripMember } from "@/server/members/member";
import { tripLength, type Trip } from "@/server/trips/trip";
import { coverTexture, tripCover, TripTimingChip } from "../trip-visuals";

type Tab = "itinerary" | "map" | "budget" | "settings";

interface TripHeaderProps {
  trip: Trip;
  members: TripMember[];
  active: Tab;
}

export function TripHeader({ trip, members, active }: TripHeaderProps) {
  const days = tripLength(trip);
  const tabs: { id: Tab; label: string; href: string; icon: LucideIcon }[] = [
    { id: "itinerary", label: "Itinerario", href: `/trips/${trip.id}`, icon: CalendarDays },
    { id: "map", label: "Mapa", href: `/trips/${trip.id}/map`, icon: MapIcon },
    { id: "budget", label: "Presupuesto", href: `/trips/${trip.id}/budget`, icon: Wallet },
    { id: "settings", label: "Grupo y ajustes", href: `/trips/${trip.id}/settings`, icon: Settings },
  ];

  return (
    <header className="space-y-5">
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Mis viajes
      </Link>

      <div className={cn("relative overflow-hidden rounded-3xl bg-linear-to-br shadow-lift", tripCover(trip.id))}>
        <div aria-hidden className={cn("absolute inset-0", coverTexture)} />
        <div className="relative flex flex-wrap items-end justify-between gap-6 p-6 sm:p-8">
          <div className="min-w-0 space-y-3 text-white">
            <TripTimingChip trip={trip} />
            <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{trip.name}</h1>
            <p className="flex flex-wrap gap-x-5 gap-y-1 text-sm font-medium text-white/90">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" aria-hidden />
                {trip.destination}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {formatDateRange(trip.startDate, trip.endDate)} · {days} {days === 1 ? "día" : "días"}
              </span>
            </p>
            {trip.description && <p className="max-w-2xl text-sm text-white/80">{trip.description}</p>}
          </div>
          <div className="flex -space-x-2" aria-label={`${members.length} integrantes`}>
            {members.slice(0, 6).map((member) => (
              <Avatar key={member.userId} name={member.user.name} className="size-9 ring-white/80" />
            ))}
            {members.length > 6 && (
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/25 text-xs font-semibold text-white ring-2 ring-white/80 backdrop-blur-sm">
                +{members.length - 6}
              </span>
            )}
          </div>
        </div>
      </div>

      <nav
        aria-label="Secciones del viaje"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:inline-flex sm:rounded-2xl sm:border sm:border-slate-200/70 sm:bg-white sm:p-1 sm:shadow-soft"
      >
        {tabs.map(({ id, label, href, icon: Icon }) => (
          <Link
            key={id}
            href={href}
            aria-current={active === id ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium whitespace-nowrap transition",
              active === id
                ? "bg-brand-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
