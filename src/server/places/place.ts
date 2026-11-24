import type { Coordinates } from "../shared/coordinates";

/** A real-world place returned by the place search. */
export interface Place {
  /** Stable id from the provider (e.g. "osm:N:339893813"). */
  id: string;
  /** Main name: "Cerro Catedral". */
  name: string;
  /** Where it is, for disambiguation: "San Carlos de Bariloche, Río Negro, Argentina". */
  description: string;
  coordinates: Coordinates;
}

/** Text stored as the activity's location when a place is picked. */
export function placeLabel(place: Pick<Place, "name" | "description">): string {
  return place.description ? `${place.name}, ${place.description}` : place.name;
}
