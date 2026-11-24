import { beforeEach, describe, expect, it } from "vitest";
import { TripAccessPolicy } from "../members/trip-access";
import { NotFoundError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";
import { FallbackDirections, routeTotals, StraightLineDirections, type DirectionsProvider } from "./directions";
import { DirectionsService } from "./directions.service";

const PLACES = {
  centro: { latitude: -41.1335, longitude: -71.3103 },
  catedral: { latitude: -41.1668, longitude: -71.4642 },
  llaoLlao: { latitude: -41.0547, longitude: -71.5313 },
};

describe("DirectionsService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let tripId: string;

  beforeEach(async () => {
    app = createTestApp();
    ana = app.addUser("Ana");
    ({ id: tripId } = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    }));
  });

  const add = (title: string, date: string | undefined, place?: keyof typeof PLACES) =>
    app.activityService.create(ana.id, tripId, {
      title,
      date,
      location: place ? title : undefined,
      latitude: place ? String(PLACES[place].latitude) : undefined,
      longitude: place ? String(PLACES[place].longitude) : undefined,
    });

  it("returns one route per day with two or more located stops, skipping unlocated ones", async () => {
    const centro = await add("Centro", "2026-07-10", "centro");
    await add("Sin ubicación", "2026-07-10");
    const catedral = await add("Catedral", "2026-07-10", "catedral");
    await add("Solo una parada", "2026-07-11", "llaoLlao");
    await add("Idea", undefined, "llaoLlao");

    const directions = await app.directionsService.getTripDirections(ana.id, tripId);

    expect(directions).toHaveLength(1);
    expect(directions[0]).toMatchObject({
      date: "2026-07-10",
      stopIds: [centro.id, catedral.id],
      source: "straight-line",
      path: [PLACES.centro, PLACES.catedral],
    });
    expect(directions[0].legs).toHaveLength(1);
    expect(directions[0].legs[0].distanceKm).toBeGreaterThan(10);
    expect(directions[0].legs[0].durationMin).toBeNull();
  });

  it("asks the provider for the stops in itinerary order", async () => {
    const calls: unknown[] = [];
    const recording: DirectionsProvider = {
      directions: async (stops) => {
        calls.push(stops);
        return { path: stops, legs: [{ distanceKm: 1, durationMin: 5 }], source: "roads" };
      },
    };
    const service = new DirectionsService(
      app.repositories.activities,
      app.repositories.trips,
      recording,
      new TripAccessPolicy(app.repositories.members),
    );
    const first = await add("Catedral", "2026-07-10", "catedral");
    const second = await add("Centro", "2026-07-10", "centro");
    await app.activityService.move(ana.id, second.id, { date: "2026-07-10", index: 0 });

    const [day] = await service.getTripDirections(ana.id, tripId);

    expect(calls).toEqual([[PLACES.centro, PLACES.catedral]]);
    expect(day.stopIds).toEqual([second.id, first.id]);
  });

  it("is only available to members", async () => {
    const bruno = app.addUser("Bruno");
    await expect(app.directionsService.getTripDirections(bruno.id, tripId)).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("FallbackDirections", () => {
  it("uses straight lines when the routing API fails", async () => {
    const failing: DirectionsProvider = {
      directions: async () => {
        throw new Error("OSRM down");
      },
    };
    const provider = new FallbackDirections(failing, new StraightLineDirections());
    const directions = await provider.directions([PLACES.centro, PLACES.catedral, PLACES.llaoLlao]);
    expect(directions.source).toBe("straight-line");
    expect(directions.legs).toHaveLength(2);
  });
});

describe("routeTotals", () => {
  it("adds distances and times", () => {
    expect(
      routeTotals([
        { distanceKm: 1.5, durationMin: 4 },
        { distanceKm: 2, durationMin: 6 },
      ]),
    ).toEqual({ distanceKm: 3.5, durationMin: 10 });
  });

  it("leaves the time unknown if any leg's is", () => {
    expect(
      routeTotals([
        { distanceKm: 1, durationMin: 4 },
        { distanceKm: 1, durationMin: null },
      ]).durationMin,
    ).toBeNull();
  });
});
