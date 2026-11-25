import { CalendarRange, List } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export type ItineraryView = "list" | "calendar";

/** "Lista / Calendario": two ways of looking at the same itinerary. */
export function ViewToggle({ tripId, active }: { tripId: string; active: ItineraryView }) {
  const views = [
    { id: "list", label: "Lista", href: `/trips/${tripId}`, icon: List },
    { id: "calendar", label: "Calendario", href: `/trips/${tripId}?view=calendar`, icon: CalendarRange },
  ] as const;

  return (
    <nav aria-label="Vista del itinerario" className="inline-flex rounded-xl bg-slate-100 p-1">
      {views.map(({ id, label, href, icon: Icon }) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? "page" : undefined}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition",
            active === id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
          )}
        >
          <Icon className="size-4" aria-hidden />
          {label}
        </Link>
      ))}
    </nav>
  );
}
