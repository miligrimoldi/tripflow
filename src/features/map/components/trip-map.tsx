"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { routeForGroup, type MapGroup, type MapPoint, type MapRoutes } from "../map-data";
import { RoutePanel } from "./route-panel";

/** Free vector tiles from OpenStreetMap data, no API key needed. */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const ROUTES_SOURCE = "trip-routes";
const ROAD_LAYER = "trip-routes-roads";
const STRAIGHT_LAYER = "trip-routes-straight";
const ALL = "all";

interface TripMapProps {
  groups: MapGroup[];
  /**
   * Each day's route along the streets. It is slower than the rest of the
   * page (it may call a routing API), so it streams in: until it arrives the
   * map shows straight dashed lines.
   */
  routes: Promise<MapRoutes>;
  /** Activity to highlight on load (from "Ver en el mapa"). */
  focusId?: string;
  /** Just the map, smaller: no day filters, side panel or hints (e.g. for one day). */
  compact?: boolean;
}

export function TripMap({ groups, routes: routesPromise, focusId, compact = false }: TripMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(
    () => groups.find((g) => g.points.some((p) => p.id === focusId))?.key ?? ALL,
  );
  const [routes, setRoutes] = useState<MapRoutes | null>(null);

  useEffect(() => {
    let active = true;
    routesPromise.then(
      (loaded) => active && setRoutes(loaded),
      // Without routes the map still works with straight lines.
      () => active && setRoutes({}),
    );
    return () => {
      active = false;
    };
  }, [routesPromise]);

  // Create the map once. maplibre-gl is imported lazily so it is only
  // downloaded on this page (and never evaluated on the server).
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;

    import("maplibre-gl")
      .then(({ Map, NavigationControl, setWorkerUrl }) => {
        if (cancelled || !container.current) return;
        // MapLibre renders in a Web Worker loaded from its own file. Pointing
        // to it with `new URL(..., import.meta.url)` lets the bundler publish
        // that file (with a hashed URL) instead of guessing its path.
        setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
        map = new Map({ container: container.current, style: MAP_STYLE, center: [0, 20], zoom: 1 });
        map.addControl(new NavigationControl({ showCompass: false }), "top-right");
        map.on("load", () => {
          map!.addSource(ROUTES_SOURCE, { type: "geojson", data: emptyCollection() });
          // Two layers because a dash pattern can't vary per feature:
          // solid along the streets, dashed for straight-line approximations.
          map!.addLayer({
            id: ROAD_LAYER,
            type: "line",
            source: ROUTES_SOURCE,
            filter: ["!", ["get", "dashed"]],
            paint: { "line-color": ["get", "color"], "line-width": 4, "line-opacity": 0.8 },
            layout: { "line-cap": "round", "line-join": "round" },
          });
          map!.addLayer({
            id: STRAIGHT_LAYER,
            type: "line",
            source: ROUTES_SOURCE,
            filter: ["get", "dashed"],
            paint: { "line-color": ["get", "color"], "line-width": 3, "line-opacity": 0.7, "line-dasharray": [2, 1.5] },
            layout: { "line-cap": "round", "line-join": "round" },
          });
          mapRef.current = map!;
          setReady(true);
        });
      })
      .catch((error) => {
        console.error("[map] failed to load", error);
        setFailed(true);
      });

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Draw markers and routes for the selected day(s).
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;

    import("maplibre-gl").then(({ Marker, Popup, LngLatBounds }) => {
      if (cancelled) return;
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];

      const visible = selected === ALL ? groups : groups.filter((group) => group.key === selected);
      const bounds = new LngLatBounds();

      for (const group of visible) {
        for (const point of group.points) {
          const lngLat: [number, number] = [point.coordinates.longitude, point.coordinates.latitude];
          const popup = new Popup({ offset: 18, closeButton: false, maxWidth: "260px" }).setDOMContent(
            popupContent(point, group),
          );
          const marker = new Marker({ element: markerElement(point, group) })
            .setLngLat(lngLat)
            .setPopup(popup)
            .addTo(map);
          markers.current.push(marker);
          bounds.extend(lngLat);
          if (point.id === focusId) marker.togglePopup();
        }
      }

      if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 64, maxZoom: 15, duration: 600 });
    });

    return () => {
      cancelled = true;
    };
  }, [ready, groups, selected, focusId]);

  // Connect each day's stops in visiting order (not ideas, which have no
  // order): along the streets when the route is known, straight otherwise.
  // Separate from the markers so routes arriving later don't move the camera.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const visible = selected === ALL ? groups : groups.filter((group) => group.key === selected);

    (map.getSource(ROUTES_SOURCE) as GeoJSONSource | undefined)?.setData({
      type: "FeatureCollection",
      features: visible
        .filter((group) => !group.isIdeas && group.points.length > 1)
        .map((group) => {
          const route = routeForGroup(group, routes);
          const onRoads = route?.source === "roads";
          return {
            type: "Feature",
            properties: { color: group.color, dashed: !onRoads },
            geometry: {
              type: "LineString",
              coordinates: onRoads
                ? route.line
                : group.points.map((p) => [p.coordinates.longitude, p.coordinates.latitude]),
            },
          };
        }),
    });
  }, [ready, groups, selected, routes]);

  if (failed) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        No pudimos cargar el mapa. Revisá tu conexión e intentá de nuevo.
      </p>
    );
  }

  const map = (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
      <div ref={container} className={cn("w-full bg-slate-100", compact ? "h-72" : "h-[60vh] min-h-80")} />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Cargando mapa…</div>
      )}
    </div>
  );

  if (compact) return map;

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Filtrar por día" className="flex flex-wrap gap-2">
        <FilterChip active={selected === ALL} onClick={() => setSelected(ALL)}>
          Todo el viaje
        </FilterChip>
        {groups.map((group) => (
          <FilterChip key={group.key} active={selected === group.key} onClick={() => setSelected(group.key)}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: group.color }} aria-hidden />
            {group.shortLabel}
            <span className="text-slate-400">{group.points.length}</span>
          </FilterChip>
        ))}
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {map}
        <RoutePanel
          groups={groups}
          selected={selected === ALL ? null : selected}
          onSelect={setSelected}
          routes={routes}
        />
      </div>
      <p className="text-xs text-slate-500">
        Las paradas se unen en el orden del itinerario. Si el recorrido zigzaguea, usá «Optimizar recorrido» en el
        itinerario.
      </p>
    </div>
  );
}
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
      )}
    >
      {children}
    </button>
  );
}

/** Lucide "lightbulb" icon, as markup (a constant, so it is safe to inject). */
const LIGHTBULB_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>';

/** Round marker with the stop number (or a lightbulb for ideas), in the day's color. */
function markerElement(point: MapPoint, group: MapGroup): HTMLElement {
  const element = document.createElement("button");
  element.type = "button";
  if (group.isIdeas) element.innerHTML = LIGHTBULB_SVG;
  else element.textContent = String(point.order);
  element.setAttribute("aria-label", `${group.shortLabel}: ${point.title}`);
  element.className =
    "flex size-7 cursor-pointer items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow-md";
  element.style.backgroundColor = group.color;
  return element;
}

/** Built with DOM nodes and textContent (never innerHTML) so user text can't inject markup. */
function popupContent(point: MapPoint, group: MapGroup): HTMLElement {
  const root = document.createElement("div");
  root.className = "space-y-1 font-sans";

  const title = document.createElement("p");
  title.className = "text-sm font-semibold text-slate-900";
  title.textContent = point.title;

  const meta = document.createElement("p");
  meta.className = "text-xs text-slate-600";
  meta.textContent = [point.categoryLabel, group.label, point.startTime].filter(Boolean).join(" · ");

  const location = document.createElement("p");
  location.className = "text-xs text-slate-500";
  location.textContent = point.location;

  root.append(title, meta, location);
  return root;
}

function emptyCollection(): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: [] };
}
