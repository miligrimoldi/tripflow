"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { placeLabel, type Place } from "@/server/places/place";
import type { Coordinates } from "@/server/shared/coordinates";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 2;

type SearchStatus = "idle" | "loading" | "done" | "error";

interface PlaceInputProps {
  /** Wiring from <Field> (label, error message). */
  id: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  defaultLabel: string;
  defaultCoordinates: Coordinates | null;
  /** Bias results toward the trip's area. */
  near?: Coordinates | null;
  placeholder?: string;
}

/**
 * Location field with place autocomplete (combobox pattern).
 *
 * Submits `location` (text) plus `latitude`/`longitude` when a suggestion is
 * picked. Typing freely is still allowed: the activity then has a location
 * name but no point on the map.
 */
export function PlaceInput({ defaultLabel, defaultCoordinates, near, placeholder, ...fieldProps }: PlaceInputProps) {
  const [text, setText] = useState(defaultLabel);
  const [coordinates, setCoordinates] = useState(defaultCoordinates);
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const listId = useId();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const request = useRef<AbortController>(undefined);

  // Cancel pending work when the component unmounts.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      request.current?.abort();
    },
    [],
  );

  function search(query: string) {
    clearTimeout(timer.current);
    request.current?.abort();
    if (query.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setStatus("idle");
      return;
    }

    setStatus("loading");
    timer.current = setTimeout(async () => {
      const controller = new AbortController();
      request.current = controller;
      const params = new URLSearchParams({ q: query.trim() });
      if (near) {
        params.set("lat", String(near.latitude));
        params.set("lon", String(near.longitude));
      }
      try {
        const response = await fetch(`/api/places?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const { places } = (await response.json()) as { places: Place[] };
        setResults(places);
        setActiveIndex(places.length > 0 ? 0 : -1);
        setStatus("done");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("[place search]", error);
        setResults([]);
        setStatus("error");
      }
    }, DEBOUNCE_MS);
  }

  function select(place: Place) {
    setText(placeLabel(place));
    setCoordinates(place.coordinates);
    setOpen(false);
    setResults([]);
    setStatus("idle");
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (event.key === "ArrowDown" && results.length > 0) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && activeIndex >= 0) {
      // Pick the suggestion instead of submitting the form.
      event.preventDefault();
      select(results[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showList = open && (status === "loading" || status === "error" || status === "done");
  const optionId = (index: number) => `${listId}-option-${index}`;

  return (
    <div className="relative">
      <Input
        {...fieldProps}
        name="location"
        value={text}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        onChange={(event) => {
          setText(event.target.value);
          // The text no longer matches the picked place.
          setCoordinates(null);
          setOpen(true);
          search(event.target.value);
        }}
        onKeyDown={onKeyDown}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setOpen(false)}
      />
      <input type="hidden" name="latitude" value={coordinates?.latitude ?? ""} />
      <input type="hidden" name="longitude" value={coordinates?.longitude ?? ""} />

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Lugares sugeridos"
          className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {status === "loading" && <li className="px-3 py-2 text-sm text-slate-500">Buscando…</li>}
          {status === "error" && (
            <li className="px-3 py-2 text-sm text-red-600">No pudimos buscar lugares. Podés escribirlo a mano.</li>
          )}
          {status === "done" && results.length === 0 && (
            <li className="px-3 py-2 text-sm text-slate-500">Sin resultados. Podés dejarlo escrito así.</li>
          )}
          {status === "done" &&
            results.map((place, index) => (
              <li
                key={place.id}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                // mousedown (not click) so it runs before the input's blur closes the list.
                onMouseDown={(event) => {
                  event.preventDefault();
                  select(place);
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={cn("cursor-pointer px-3 py-2", index === activeIndex && "bg-brand-50")}
              >
                <p className="text-sm font-medium text-slate-900">📍 {place.name}</p>
                {place.description && <p className="text-xs text-slate-500">{place.description}</p>}
              </li>
            ))}
        </ul>
      )}

      <p className="mt-1 text-xs text-slate-500" aria-live="polite">
        {coordinates ? (
          <span className="text-emerald-700">✓ Se va a ver en el mapa</span>
        ) : text.trim() ? (
          "Elegí una opción de la lista para ubicarlo en el mapa."
        ) : null}
      </p>
    </div>
  );
}
