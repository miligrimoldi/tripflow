import { z } from "zod";
import type { Place } from "@/server/places/place";
import { isValidCoordinates } from "@/server/shared/coordinates";

/**
 * The subset of Photon's GeoJSON response we use.
 * Docs: https://github.com/komoot/photon#search-api
 */
const photonResponseSchema = z.object({
  features: z.array(
    z.object({
      geometry: z.object({ coordinates: z.tuple([z.number(), z.number()]) }),
      properties: z
        .object({
          osm_type: z.string(),
          osm_id: z.number(),
          name: z.string(),
          street: z.string(),
          housenumber: z.string(),
          city: z.string(),
          state: z.string(),
          country: z.string(),
        })
        .partial(),
    }),
  ),
});

type PhotonProperties = z.infer<typeof photonResponseSchema>["features"][number]["properties"];

function placeName(properties: PhotonProperties): string | null {
  if (properties.name) return properties.name;
  if (properties.street) return [properties.street, properties.housenumber].filter(Boolean).join(" ");
  return null;
}

/** Converts a Photon response into places, skipping unnamed or malformed entries. */
export function parsePhotonResponse(json: unknown): Place[] {
  const parsed = photonResponseSchema.safeParse(json);
  if (!parsed.success) return [];

  const places: Place[] = [];
  const seen = new Set<string>();

  for (const { geometry, properties } of parsed.data.features) {
    const name = placeName(properties);
    // GeoJSON order is [longitude, latitude].
    const [longitude, latitude] = geometry.coordinates;
    const coordinates = { latitude, longitude };
    if (!name || !isValidCoordinates(coordinates)) continue;

    const description = [properties.city, properties.state, properties.country]
      .filter((part, index, parts): part is string => !!part && part !== name && parts.indexOf(part) === index)
      .join(", ");

    // OSM often has several objects for the same place (a peak, its area,
    // a viewpoint…). Users can't tell them apart, so keep the first one.
    const label = `${name}|${description}`;
    if (seen.has(label)) continue;
    seen.add(label);

    const id = properties.osm_type && properties.osm_id ? `osm:${properties.osm_type}:${properties.osm_id}` : label;
    places.push({ id, name, description, coordinates });
  }
  return places;
}
