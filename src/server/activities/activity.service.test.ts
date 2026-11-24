import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";

describe("ActivityService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let bruno: { id: string };
  let tripId: string;

  beforeEach(async () => {
    app = createTestApp();
    ana = app.addUser("Ana");
    bruno = app.addUser("Bruno");
    const trip = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    });
    tripId = trip.id;
  });

  const titles = (activities: { title: string }[]) => activities.map((a) => a.title);

  describe("create", () => {
    it("saves an activity without date as an idea", async () => {
      await app.activityService.create(ana.id, tripId, { title: "Cerro Catedral", category: "EXCURSION" });

      const { ideas } = await app.activityService.getItinerary(ana.id, tripId);
      expect(ideas).toHaveLength(1);
      expect(ideas[0]).toMatchObject({ title: "Cerro Catedral", category: "EXCURSION", createdBy: { name: "Ana" } });
    });

    it("appends scheduled activities at the end of their day", async () => {
      await app.activityService.create(ana.id, tripId, { title: "Desayuno", date: "2026-07-11" });
      await app.activityService.create(ana.id, tripId, { title: "Circuito Chico", date: "2026-07-11" });

      const { days } = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(days[1].activities)).toEqual(["Desayuno", "Circuito Chico"]);
    });

    it("rejects dates outside the trip", async () => {
      await expect(
        app.activityService.create(ana.id, tripId, { title: "Tarde", date: "2026-07-20" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("validates url and time formats", async () => {
      await expect(
        app.activityService.create(ana.id, tripId, { title: "X", url: "javascript:alert(1)", startTime: "25:00" }),
      ).rejects.toMatchObject({ fieldErrors: { url: expect.any(Array), startTime: expect.any(Array) } });
    });

    it("stores coordinates when the location was picked from the place search", async () => {
      const activity = await app.activityService.create(ana.id, tripId, {
        title: "Cerro Catedral",
        location: "Cerro Catedral, Bariloche",
        latitude: "-41.166895",
        longitude: "-71.4642673",
      });
      expect(activity.coordinates).toEqual({ latitude: -41.166895, longitude: -71.4642673 });
    });

    it("keeps free-text locations without coordinates", async () => {
      const activity = await app.activityService.create(ana.id, tripId, {
        title: "X",
        location: "Centro",
        latitude: "",
      });
      expect(activity).toMatchObject({ location: "Centro", coordinates: null });
    });

    it.each([
      [{ latitude: "-41.1", longitude: "" }, "only one coordinate"],
      [{ latitude: "-141.1", longitude: "-71.4" }, "latitude out of range"],
      [{ latitude: "-41.1", longitude: "abc" }, "non-numeric longitude"],
    ])("rejects invalid coordinates (%j: %s)", async (coordinates) => {
      await expect(
        app.activityService.create(ana.id, tripId, { title: "X", location: "Algún lugar", ...coordinates }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("requires a location name when there are coordinates", async () => {
      await expect(
        app.activityService.create(ana.id, tripId, { title: "X", latitude: "-41.1", longitude: "-71.4" }),
      ).rejects.toMatchObject({ fieldErrors: { location: expect.any(Array) } });
    });

    it("does not let non-members add activities", async () => {
      await expect(app.activityService.create(bruno.id, tripId, { title: "Intruso" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });

    it("lets any member (not only the owner) add activities", async () => {
      await app.repositories.members.add(tripId, bruno.id, "EDITOR");
      const activity = await app.activityService.create(bruno.id, tripId, { title: "Chocolate" });
      expect(activity.createdBy.name).toBe("Bruno");
    });
  });

  describe("move", () => {
    const create = (title: string, date?: string) => app.activityService.create(ana.id, tripId, { title, date });

    it("moves an idea into a day and back to ideas", async () => {
      const idea = await create("Kayak");

      await app.activityService.move(ana.id, idea.id, { date: "2026-07-12" });
      let itinerary = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(itinerary.days[2].activities)).toEqual(["Kayak"]);
      expect(itinerary.ideas).toHaveLength(0);

      await app.activityService.move(ana.id, idea.id, { date: "" });
      itinerary = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(itinerary.ideas)).toEqual(["Kayak"]);
    });

    it("appends at the end of the day when no index is given", async () => {
      await create("Primero", "2026-07-10");
      const idea = await create("Segundo");

      await app.activityService.move(ana.id, idea.id, { date: "2026-07-10" });

      const { days } = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(days[0].activities)).toEqual(["Primero", "Segundo"]);
    });

    it("inserts at the given position of another day (drag & drop)", async () => {
      await create("A", "2026-07-10");
      await create("B", "2026-07-10");
      const c = await create("C", "2026-07-11");

      await app.activityService.move(ana.id, c.id, { date: "2026-07-10", index: "1" });

      const { days } = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(days[0].activities)).toEqual(["A", "C", "B"]);
      expect(days[1].activities).toHaveLength(0);
    });

    it("reorders inside the same day", async () => {
      await create("A", "2026-07-10");
      await create("B", "2026-07-10");
      const c = await create("C", "2026-07-10");

      await app.activityService.move(ana.id, c.id, { date: "2026-07-10", index: 0 });

      const { days } = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(days[0].activities)).toEqual(["C", "A", "B"]);
    });

    it("rejects days outside the trip and invalid indexes", async () => {
      const idea = await create("Kayak");
      await expect(app.activityService.move(ana.id, idea.id, { date: "2026-08-01" })).rejects.toBeInstanceOf(
        ValidationError,
      );
      await expect(app.activityService.move(ana.id, idea.id, { date: null, index: -1 })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("does not let non-members move activities", async () => {
      const idea = await create("Kayak");
      await expect(app.activityService.move(bruno.id, idea.id, { date: "2026-07-10" })).rejects.toBeInstanceOf(
        NotFoundError,
      );
    });
  });

  describe("update", () => {
    it("keeps the position when the day does not change", async () => {
      await app.activityService.create(ana.id, tripId, { title: "A", date: "2026-07-10" });
      const b = await app.activityService.create(ana.id, tripId, { title: "B", date: "2026-07-10" });

      const updated = await app.activityService.update(ana.id, b.id, { title: "B editada", date: "2026-07-10" });

      expect(updated.position).toBe(b.position);
    });
  });

  it("deletes an activity", async () => {
    const a = await app.activityService.create(ana.id, tripId, { title: "A" });
    await app.activityService.delete(ana.id, a.id);
    await expect(app.activityService.get(ana.id, a.id)).rejects.toBeInstanceOf(NotFoundError);
  });
});
