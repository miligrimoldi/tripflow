import {
  ArrowLeft,
  CalendarDays,
  Map as MapIcon,
  MapPin,
  Settings,
  Sunrise,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDateRange } from "@/lib/format";
import type { TripMember } from "@/server/members/member";
import { dateOnlyFromDate } from "@/server/shared/date-only";
import { tripLength, tripTiming, type Trip } from "@/server/trips/trip";
import { TripTimingChip } from "../trip-visuals";
import { TripCoverImage } from "./trip-cover-image";
import { TripLive } from "@/features/realtime/components/trip-live";
import { getCurrentUser } from "@/server/auth/session";
import { realtimeService } from "@/server/container";

type Tab = "itinerary" | "today" | "map" | "budget" | "settings";

interface TripHeaderProps {
  trip: Trip;
  members: TripMember[];
  active: Tab;
}

export function TripHeader({ trip, members, active }: TripHeaderProps) {
  const days = tripLength(trip);
  const ongoing = tripTiming(trip, dateOnlyFromDate(new Date())).kind === "ongoing";
  const tabs: { id: Tab; label: string; href: string; icon: LucideIcon }[] = [
    { id: "itinerary", label: "Itinerario", href: `/trips/${trip.id}`, icon: CalendarDays },
    // While traveling it's "today"; before or after, a day-by-day agenda.
    { id: "today", label: ongoing ? "Hoy" : "Día a día", href: `/trips/${trip.id}/today`, icon: Sunrise },
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

      <div className="relative flex min-h-60 overflow-hidden rounded-3xl bg-slate-800 shadow-lift sm:min-h-72">
        <TripCoverImage trip={trip} overlay="bottom" sizes="(min-width: 1280px) 1216px, 100vw" priority showCredit />
        <div className="relative flex w-full flex-wrap items-end justify-between gap-6 self-end p-6 sm:p-8">
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
          <LiveMembers tripId={trip.id} members={members} />
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

/**
 * The members' avatars, live: who's online, and the page refreshing when
 * someone else changes the trip. Every trip page shows the header, so they
 * all get real time without wiring it page by page.
 */
async function LiveMembers({ tripId, members }: { tripId: string; members: TripMember[] }) {
  const user = await getCurrentUser();
  return (
    <TripLive
      tripId={tripId}
      currentUserId={user?.id ?? ""}
      members={members.map((member) => ({ id: member.userId, name: member.user.name }))}
      enabled={realtimeService.enabled}
    />
  );
}
