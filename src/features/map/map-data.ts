import type { Activity, Itinerary } from "@/server/activities/activity";
import type { RouteLeg } from "@/server/routes/directions";
import type { DayDirections } from "@/server/routes/directions.service";
import type { Coordinates } from "@/server/shared/coordinates";
import { CATEGORY_META } from "../activities/categories";

/** Distinct, colorblind-friendly-ish colors that cycle for long trips. */
export const DAY_COLORS = ["#0d9488", "#e11d48", "#2563eb", "#d97706", "#7c3aed", "#059669", "#db2777", "#0891b2"];
export const IDEAS_COLOR = "#64748b";

export interface MapPoint {
  id: string;
  title: string;
  /** Category name, shown in the popup ("Comida", "Excursión"…). */
  categoryLabel: string;
  location: string;
  coordinates: Coordinates;
  startTime: string | null;
  /** 1-based position within its day, shown on the marker ("2" = second stop). */
  order: number;
}

export interface MapGroup {
  /** Day ("YYYY-MM-DD") or "ideas". */
  key: string;
  label: string;
  /** Short label for markers and filters: "Día 2" or "Ideas". */
  shortLabel: string;
  color: string;
  isIdeas: boolean;
  points: MapPoint[];
}

export interface MapData {
  groups: MapGroup[];
  /** Activities that have no point on the map yet. */
  unlocated: Activity[];
}

function toPoint(activity: Activity & { coordinates: Coordinates }, order: number): MapPoint {
  return {
    id: activity.id,
    title: activity.title,
    categoryLabel: CATEGORY_META[activity.category].label,
    location: activity.location ?? "",
    coordinates: activity.coordinates,
    startTime: activity.startTime,
    order,
  };
}

function located(activities: Activity[]) {
  return activities.filter((activity): activity is Activity & { coordinates: Coordinates } => !!activity.coordinates);
}

/**
 * Groups the itinerary into map layers: one per day (in visiting order, so
 * the route can be drawn) plus the ideas. Days without located activities
 * are omitted.
 */
export function buildMapData(itinerary: Itinerary, formatDay: (date: string) => string): MapData {
  const groups: MapGroup[] = itinerary.days
    .map((day, index) => ({
      key: day.date,
      label: `Día ${day.dayNumber} · ${formatDay(day.date)}`,
      shortLabel: `Día ${day.dayNumber}`,
      color: DAY_COLORS[index % DAY_COLORS.length],
      isIdeas: false,
      points: located(day.activities).map((activity, order) => toPoint(activity, order + 1)),
    }))
    .filter((group) => group.points.length > 0);

  const ideas = located(itinerary.ideas);
  if (ideas.length > 0) {
    groups.push({
      key: "ideas",
      label: "Ideas sin día",
      shortLabel: "Ideas",
      color: IDEAS_COLOR,
      isIdeas: true,
      points: ideas.map((activity, order) => toPoint(activity, order + 1)),
    });
  }

  const all = [...itinerary.days.flatMap((day) => day.activities), ...itinerary.ideas];
  return { groups, unlocated: all.filter((activity) => !activity.coordinates) };
}

/** A day's route, ready for the map: a GeoJSON-style line plus each leg's distance and time. */
export interface MapRoute {
  stopIds: string[];
  /** `[longitude, latitude]` pairs (GeoJSON order). */
  line: [number, number][];
  legs: RouteLeg[];
  source: DayDirections["source"];
}

/** Routes by day ("YYYY-MM-DD"). */
export type MapRoutes = Record<string, MapRoute>;

export function toMapRoutes(days: DayDirections[]): MapRoutes {
  return Object.fromEntries(
    days.map((day) => [
      day.date,
      {
        stopIds: day.stopIds,
        line: day.path.map((p) => [p.longitude, p.latitude] as [number, number]),
        legs: day.legs,
        source: day.source,
      },
    ]),
  );
}

/**
 * The route of a day group, only if it goes through exactly the stops shown
 * (routes load separately, so the day may have changed in between).
 */
export function routeForGroup(group: MapGroup, routes: MapRoutes | null): MapRoute | null {
  const route = routes?.[group.key];
  if (!route || group.isIdeas) return null;
  const sameStops =
    route.stopIds.length === group.points.length && route.stopIds.every((id, i) => id === group.points[i].id);
  return sameStops ? route : null;
}
