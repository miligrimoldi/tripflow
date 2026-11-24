import { Car, ChevronRight, Lightbulb, MoveRight } from "lucide-react";
import { formatDistance, formatDuration } from "@/features/routes/format";
import { routeTotals, type RouteLeg } from "@/server/routes/directions";
import { routeForGroup, type MapGroup, type MapRoute, type MapRoutes } from "../map-data";

interface RoutePanelProps {
  groups: MapGroup[];
  /** Key of the selected group, or `null` for the whole trip. */
  selected: string | null;
  onSelect: (key: string) => void;
  /** `null` while routes are still loading. */
  routes: MapRoutes | null;
}

/** Next to the map: each day's total, or the stops of one day with the time between them. */
export function RoutePanel({ groups, selected, onSelect, routes }: RoutePanelProps) {
  const group = groups.find((g) => g.key === selected);

  return (
    <aside
      aria-live="polite"
      className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-soft lg:max-h-[60vh] lg:overflow-y-auto"
    >
      {group ? (
        <DayStops group={group} routes={routes} />
      ) : (
        <TripOverview groups={groups} routes={routes} onSelect={onSelect} />
      )}
    </aside>
  );
}

function TripOverview({ groups, routes, onSelect }: Pick<RoutePanelProps, "groups" | "routes" | "onSelect">) {
  return (
    <>
      <h2 className="font-display text-lg font-semibold text-slate-900">Recorridos</h2>
      <p className="mb-3 text-sm text-slate-500">Elegí un día para ver el tiempo entre paradas.</p>
      <ul className="-mx-2 space-y-0.5">
        {groups.map((group) => (
          <li key={group.key}>
            <button
              type="button"
              onClick={() => onSelect(group.key)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-slate-50"
            >
              <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-800">{group.label}</span>
                <span className="block text-xs text-slate-500">
                  <GroupSummary group={group} routes={routes} />
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

function GroupSummary({ group, routes }: { group: MapGroup; routes: MapRoutes | null }) {
  const stops = `${group.points.length} ${group.points.length === 1 ? "lugar" : "lugares"}`;
  if (group.isIdeas || group.points.length < 2) return stops;
  const route = routeForGroup(group, routes);
  if (!route) return routes ? stops : `${stops} · calculando…`;
  return `${stops} · ${legSummary(routeTotals(route.legs), route.source)}`;
}

function DayStops({ group, routes }: { group: MapGroup; routes: MapRoutes | null }) {
  const route = routeForGroup(group, routes);
  const loading = !group.isIdeas && group.points.length > 1 && !routes;

  return (
    <>
      <h2 className="font-display text-lg font-semibold text-slate-900">{group.label}</h2>
      <p className="mb-4 text-sm text-slate-500">
        {group.isIdeas
          ? "Todavía sin día ni orden."
          : route
            ? `Total: ${legSummary(routeTotals(route.legs), route.source)}`
            : loading
              ? "Calculando el recorrido…"
              : "En el orden del itinerario."}
      </p>
      <ol>
        {group.points.map((point, index) => {
          const leg = route?.legs[index];
          const isLast = index === group.points.length - 1;
          return (
            <li key={point.id} className="relative pb-1 pl-10">
              {!isLast && <span aria-hidden className="absolute top-8 bottom-0 left-3.5 w-px bg-slate-200" />}
              <span
                aria-hidden
                className="absolute top-0 left-0 flex size-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: group.color }}
              >
                {group.isIdeas ? <Lightbulb className="size-3.5" /> : point.order}
              </span>
              <p className="pt-1 text-sm leading-snug font-medium text-slate-800">
                {point.startTime && <span className="mr-1.5 font-mono text-xs text-brand-700">{point.startTime}</span>}
                {point.title}
              </p>
              {point.location && <p className="truncate text-xs text-slate-500">{point.location}</p>}
              {!isLast && !group.isIdeas && (
                <p className="my-2.5 flex min-h-5 items-center gap-1.5 text-xs font-medium text-slate-600">
                  {leg ? (
                    <LegLabel leg={leg} source={route!.source} />
                  ) : loading ? (
                    <span className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                  ) : null}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {route?.source === "straight-line" && (
        <p className="mt-4 rounded-lg bg-sand-100 px-3 py-2 text-xs text-slate-600">
          Distancias en línea recta: los tiempos por calle no están disponibles en este momento.
        </p>
      )}
    </>
  );
}

function LegLabel({ leg, source }: { leg: RouteLeg; source: MapRoute["source"] }) {
  const Icon = source === "roads" ? Car : MoveRight;
  return (
    <>
      <Icon className="size-3.5 text-slate-400" aria-hidden />
      <span className="sr-only">Hasta la próxima parada: </span>
      {legSummary(leg, source)}
    </>
  );
}

/** "12 min · 4,2 km en auto" or "4,2 km en línea recta". */
function legSummary(leg: RouteLeg, source: MapRoute["source"]): string {
  const distance = formatDistance(leg.distanceKm);
  return leg.durationMin === null || source !== "roads"
    ? `${distance} en línea recta`
    : `${formatDuration(leg.durationMin)} · ${distance} en auto`;
}
