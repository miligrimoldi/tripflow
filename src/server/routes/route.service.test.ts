import { beforeEach, describe, expect, it } from "vitest";
import { BusinessRuleError, NotFoundError, ValidationError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";
import { FallbackTravelCost, StraightLineTravelCost, type TravelCostProvider } from "./travel-cost";

// Real places in Bariloche, roughly west → east along the lake.
const PLACES = {
  campanario: { latitude: -41.0757, longitude: -71.4764 },
  llaoLlao: { latitude: -41.0547, longitude: -71.5313 },
  centro: { latitude: -41.1335, longitude: -71.3103 },
  catedral: { latitude: -41.1668, longitude: -71.4642 },
};

describe("RouteService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let tripId: string;
  const date = "2026-07-10";

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

  const add = (title: string, place?: keyof typeof PLACES, startTime?: string) =>
    app.activityService.create(ana.id, tripId, {
      title,
      date,
      startTime,
      location: place ? title : undefined,
      latitude: place ? String(PLACES[place].latitude) : undefined,
      longitude: place ? String(PLACES[place].longitude) : undefined,
    });

  const titles = async () =>
    (await app.activityService.getItinerary(ana.id, tripId)).days[0].activities.map((a) => a.title);

  it("suggests a shorter order without saving it", async () => {
    // Zigzag: centro → llao llao → catedral → campanario.
    await add("Centro", "centro");
    await add("Llao Llao", "llaoLlao");
    await add("Catedral", "catedral");
    await add("Campanario", "campanario");

    const suggestion = await app.routeService.suggestDayRoute(ana.id, tripId, { date });

    expect(suggestion).toMatchObject({ kind: "plan", changed: true, unit: "km", source: "straight-line" });
    if (suggestion.kind !== "plan") return;
    expect(suggestion.suggestedCost).toBeLessThan(suggestion.currentCost);
    expect(await titles()).toEqual(["Centro", "Llao Llao", "Catedral", "Campanario"]);
  });

  it("applies the suggested order", async () => {
    await add("Centro", "centro");
    await add("Llao Llao", "llaoLlao");
    await add("Catedral", "catedral");
    await add("Campanario", "campanario");
    const suggestion = await app.routeService.suggestDayRoute(ana.id, tripId, { date });
    if (suggestion.kind !== "plan") throw new Error("expected a plan");

    await app.routeService.applyDayRoute(ana.id, tripId, { date, order: suggestion.stops.map((s) => s.id) });

    expect(await titles()).toEqual(suggestion.stops.map((s) => s.title));
  });

  it("respects activity times and keeps unlocated ones in place", async () => {
    await add("Cena en el centro", "centro", "21:00");
    await add("Sin ubicación");
    await add("Desayuno en Llao Llao", "llaoLlao", "09:00");
    await add("Catedral", "catedral");

    const suggestion = await app.routeService.suggestDayRoute(ana.id, tripId, { date });
    if (suggestion.kind !== "plan") throw new Error("expected a plan");
    const order = suggestion.stops.map((s) => s.title);

    expect(order.indexOf("Desayuno en Llao Llao")).toBeLessThan(order.indexOf("Cena en el centro"));
    expect(order[1]).toBe("Sin ubicación");
    expect(suggestion.unlocated).toBe(1);
  });

  it("needs at least three located activities", async () => {
    await add("Centro", "centro");
    await add("Catedral", "catedral");
    await add("Sin ubicación");
    expect(await app.routeService.suggestDayRoute(ana.id, tripId, { date })).toEqual({
      kind: "not-enough",
      located: 2,
    });
  });

  it("rejects applying a stale suggestion", async () => {
    const a = await add("Centro", "centro");
    const b = await add("Catedral", "catedral");
    await add("Campanario", "campanario");

    await expect(app.routeService.applyDayRoute(ana.id, tripId, { date, order: [b.id, a.id] })).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it("checks permissions and dates", async () => {
    const bruno = app.addUser("Bruno");
    await expect(app.routeService.suggestDayRoute(bruno.id, tripId, { date })).rejects.toBeInstanceOf(NotFoundError);

    const carla = app.addUser("Carla");
    await app.repositories.members.add(tripId, carla.id, "EDITOR");
    await expect(app.routeService.suggestDayRoute(carla.id, tripId, { date })).resolves.toBeDefined();

    await expect(app.routeService.suggestDayRoute(ana.id, tripId, { date: "2026-08-01" })).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});

describe("FallbackTravelCost", () => {
  it("uses the fallback when the primary provider fails", async () => {
    const failing: TravelCostProvider = {
      matrix: async () => {
        throw new Error("OSRM down");
      },
    };
    const provider = new FallbackTravelCost(failing, new StraightLineTravelCost());
    const matrix = await provider.matrix([PLACES.centro, PLACES.catedral]);
    expect(matrix.source).toBe("straight-line");
    expect(matrix.values[0][1]).toBeGreaterThan(10);
  });
});
