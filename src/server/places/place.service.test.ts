import { describe, expect, it } from "vitest";
import { ValidationError } from "../shared/errors";
import { placeLabel, type Place } from "./place";
import { PlaceSearchUnavailableError, type PlaceSearch, type PlaceSearchOptions } from "./place-search";
import { PLACE_SEARCH_LIMIT, PlaceService } from "./place.service";

class RecordingPlaceSearch implements PlaceSearch {
  calls: { query: string; options: PlaceSearchOptions }[] = [];

  async search(query: string, options: PlaceSearchOptions): Promise<Place[]> {
    this.calls.push({ query, options });
    return [];
  }
}

describe("PlaceService", () => {
  it("trims the query and forwards the bias point", async () => {
    const provider = new RecordingPlaceSearch();
    await new PlaceService(provider).search({
      query: "  cerro catedral ",
      nearLatitude: "-41.1",
      nearLongitude: "-71.4",
    });

    expect(provider.calls).toEqual([
      {
        query: "cerro catedral",
        options: { near: { latitude: -41.1, longitude: -71.4 }, limit: PLACE_SEARCH_LIMIT },
      },
    ]);
  });

  it("ignores an incomplete bias point", async () => {
    const provider = new RecordingPlaceSearch();
    await new PlaceService(provider).search({ query: "museo", nearLatitude: "-41.1" });
    expect(provider.calls[0].options.near).toBeUndefined();
  });

  it.each(["", "a", "x".repeat(101)])("rejects queries that are too short or too long (%j)", async (query) => {
    const provider = new RecordingPlaceSearch();
    await expect(new PlaceService(provider).search({ query })).rejects.toBeInstanceOf(ValidationError);
    expect(provider.calls).toHaveLength(0);
  });
});

describe("PlaceService.tripArea", () => {
  const bariloche: Place = {
    id: "osm:R:1",
    name: "Bariloche",
    description: "Argentina",
    coordinates: { latitude: -41.13, longitude: -71.3 },
  };

  it("uses the centroid of known points without calling the provider", async () => {
    const provider = new RecordingPlaceSearch();
    const area = await new PlaceService(provider).tripArea("Bariloche", [
      { latitude: -41, longitude: -71 },
      { latitude: -42, longitude: -72 },
    ]);
    expect(area).toEqual({ latitude: -41.5, longitude: -71.5 });
    expect(provider.calls).toHaveLength(0);
  });

  it("falls back to geocoding the destination", async () => {
    const provider: PlaceSearch = { search: async () => [bariloche] };
    expect(await new PlaceService(provider).tripArea("Bariloche", [])).toEqual(bariloche.coordinates);
  });

  it("returns null when the provider is down", async () => {
    const provider: PlaceSearch = {
      search: async () => {
        throw new PlaceSearchUnavailableError();
      },
    };
    expect(await new PlaceService(provider).tripArea("Bariloche", [])).toBeNull();
  });
});

describe("placeLabel", () => {
  it("joins name and description", () => {
    expect(placeLabel({ name: "Cerro Catedral", description: "Bariloche, Argentina" })).toBe(
      "Cerro Catedral, Bariloche, Argentina",
    );
    expect(placeLabel({ name: "Argentina", description: "" })).toBe("Argentina");
  });
});
