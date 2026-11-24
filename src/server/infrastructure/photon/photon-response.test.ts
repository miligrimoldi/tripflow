import { describe, expect, it } from "vitest";
import { parsePhotonResponse } from "./photon-response";

// Trimmed real response for "cerro catedral bariloche".
const response = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        osm_type: "W",
        osm_id: 28707473,
        name: "Cerro Catedral",
        city: "San Carlos de Bariloche",
        county: "Departamento Bariloche",
        state: "Río Negro",
        country: "Argentina",
      },
      geometry: { type: "Point", coordinates: [-71.4642673, -41.166895] },
    },
  ],
};

describe("parsePhotonResponse", () => {
  it("maps features to places, swapping GeoJSON [lon, lat] order", () => {
    expect(parsePhotonResponse(response)).toEqual([
      {
        id: "osm:W:28707473",
        name: "Cerro Catedral",
        description: "San Carlos de Bariloche, Río Negro, Argentina",
        coordinates: { latitude: -41.166895, longitude: -71.4642673 },
      },
    ]);
  });

  it("uses the street and number when the place has no name", () => {
    const [place] = parsePhotonResponse({
      features: [
        {
          properties: { street: "Mitre", housenumber: "125", city: "Bariloche" },
          geometry: { coordinates: [-71.3, -41.13] },
        },
      ],
    });
    expect(place.name).toBe("Mitre 125");
  });

  it("does not repeat the name in the description (e.g. cities)", () => {
    const [place] = parsePhotonResponse({
      features: [
        {
          properties: { name: "París", city: "París", state: "Île-de-France", country: "Francia" },
          geometry: { coordinates: [2.35, 48.85] },
        },
      ],
    });
    expect(place.description).toBe("Île-de-France, Francia");
  });

  it("skips unnamed places, invalid coordinates and duplicates", () => {
    const duplicate = response.features[0];
    const places = parsePhotonResponse({
      features: [
        duplicate,
        duplicate,
        { properties: { country: "Argentina" }, geometry: { coordinates: [-64, -34] } },
        { properties: { name: "Bad" }, geometry: { coordinates: [500, 500] } },
      ],
    });
    expect(places.map((p) => p.name)).toEqual(["Cerro Catedral"]);
  });

  it("shows places that look identical only once (e.g. a peak and its area)", () => {
    const feature = (osmId: number, longitude: number) => ({
      properties: { osm_type: "N", osm_id: osmId, name: "Cerro Campanario", city: "Bariloche" },
      geometry: { coordinates: [longitude, -41.07] },
    });
    const places = parsePhotonResponse({ features: [feature(1, -71.47), feature(2, -71.48)] });
    expect(places.map((p) => p.id)).toEqual(["osm:N:1"]);
  });

  it("returns no places for unexpected payloads", () => {
    expect(parsePhotonResponse({ error: "oops" })).toEqual([]);
    expect(parsePhotonResponse(null)).toEqual([]);
  });
});
