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

  describe("schedule", () => {
    it("moves an idea into a day and back to ideas", async () => {
      const idea = await app.activityService.create(ana.id, tripId, { title: "Kayak" });

      await app.activityService.schedule(ana.id, idea.id, { date: "2026-07-12" });
      let itinerary = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(itinerary.days[2].activities)).toEqual(["Kayak"]);
      expect(itinerary.ideas).toHaveLength(0);

      await app.activityService.schedule(ana.id, idea.id, { date: "" });
      itinerary = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(itinerary.ideas)).toEqual(["Kayak"]);
    });

    it("places the activity last in the target day", async () => {
      await app.activityService.create(ana.id, tripId, { title: "Primero", date: "2026-07-10" });
      const idea = await app.activityService.create(ana.id, tripId, { title: "Segundo" });

      await app.activityService.schedule(ana.id, idea.id, { date: "2026-07-10" });

      const { days } = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(days[0].activities)).toEqual(["Primero", "Segundo"]);
    });
  });

  describe("move", () => {
    it("reorders activities within the same day", async () => {
      await app.activityService.create(ana.id, tripId, { title: "A", date: "2026-07-10" });
      const b = await app.activityService.create(ana.id, tripId, { title: "B", date: "2026-07-10" });
      await app.activityService.create(ana.id, tripId, { title: "C", date: "2026-07-10" });

      await app.activityService.move(ana.id, b.id, "up");

      const { days } = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(days[0].activities)).toEqual(["B", "A", "C"]);
    });

    it("ignores moves past the edges", async () => {
      const a = await app.activityService.create(ana.id, tripId, { title: "A" });
      await app.activityService.move(ana.id, a.id, "up");

      const { ideas } = await app.activityService.getItinerary(ana.id, tripId);
      expect(titles(ideas)).toEqual(["A"]);
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
