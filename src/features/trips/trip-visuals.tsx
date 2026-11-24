import { CalendarClock, CircleCheck, Plane } from "lucide-react";
import { cn } from "@/lib/cn";
import { dateOnlyFromDate } from "@/server/shared/date-only";
import { tripTiming, type Trip } from "@/server/trips/trip";

/** Cover gradients (literal classes so Tailwind generates them). */
const COVERS = [
  "from-brand-500 via-brand-600 to-sky-700",
  "from-coral-400 via-coral-500 to-pink-600",
  "from-amber-400 via-orange-500 to-coral-600",
  "from-indigo-500 via-violet-500 to-fuchsia-600",
  "from-emerald-500 via-brand-600 to-brand-800",
  "from-sky-500 via-indigo-500 to-indigo-700",
] as const;

/** Same trip, same cover: derived from its id. */
export function tripCover(tripId: string): string {
  let hash = 0;
  for (const char of tripId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COVERS[hash % COVERS.length];
}

/** Soft dotted texture laid over covers. */
export const coverTexture =
  "bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.18)_1px,transparent_0)] bg-size-[18px_18px]";

function today(): string {
  return dateOnlyFromDate(new Date());
}

/** "Faltan 23 días" / "Día 2 de 5" / "Terminado", as a chip for covers. */
export function TripTimingChip({ trip, className }: { trip: Pick<Trip, "startDate" | "endDate">; className?: string }) {
  const timing = tripTiming(trip, today());
  const { icon: Icon, text } =
    timing.kind === "upcoming"
      ? {
          icon: CalendarClock,
          text: timing.daysUntil === 1 ? "¡Es mañana!" : `Faltan ${timing.daysUntil} días`,
        }
      : timing.kind === "ongoing"
        ? { icon: Plane, text: `En viaje · día ${timing.dayNumber} de ${timing.totalDays}` }
        : { icon: CircleCheck, text: "Terminado" };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/30 backdrop-blur-sm ring-inset",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {text}
    </span>
  );
}
