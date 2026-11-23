import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError, ValidationError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";

const validTrip = {
  name: "Eurotrip",
  destination: "Italia",
  description: "",
  startDate: "2026-06-01",
  endDate: "2026-06-05",
};

describe("TripService", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let bruno: { id: string };

  beforeEach(() => {
    app = createTestApp();
    ana = app.addUser("Ana");
    bruno = app.addUser("Bruno");
  });

  describe("create", () => {
    it("creates the trip with the creator as OWNER", async () => {
      const trip = await app.tripService.create(ana.id, validTrip);

      expect(trip).toMatchObject({ name: "Eurotrip", description: null });
      const view = await app.tripService.get(ana.id, trip.id);
      expect(view.role).toBe("OWNER");
    });

    it("rejects an end date before the start date", async () => {
      await expect(app.tripService.create(ana.id, { ...validTrip, endDate: "2026-05-30" })).rejects.toMatchObject({
        fieldErrors: { endDate: [expect.stringContaining("anterior")] },
      });
    });

    it("rejects trips longer than the maximum", async () => {
      await expect(app.tripService.create(ana.id, { ...validTrip, endDate: "2026-12-31" })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });

    it("requires name and destination", async () => {
      await expect(app.tripService.create(ana.id, { ...validTrip, name: "  ", destination: "" })).rejects.toMatchObject(
        { fieldErrors: { name: expect.any(Array), destination: expect.any(Array) } },
      );
    });
  });

  describe("access control", () => {
    it("hides trips from non-members as not found", async () => {
      const trip = await app.tripService.create(ana.id, validTrip);
      await expect(app.tripService.get(bruno.id, trip.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("lets only the owner edit or delete the trip", async () => {
      const trip = await app.tripService.create(ana.id, validTrip);
      await app.repositories.members.add(trip.id, bruno.id, "EDITOR");

      await expect(app.tripService.update(bruno.id, trip.id, validTrip)).rejects.toBeInstanceOf(ForbiddenError);
      await expect(app.tripService.delete(bruno.id, trip.id)).rejects.toBeInstanceOf(ForbiddenError);
    });
  });

  it("lists only the trips the user belongs to", async () => {
    await app.tripService.create(ana.id, validTrip);
    await app.tripService.create(bruno.id, { ...validTrip, name: "Otro" });

    const trips = await app.tripService.listForUser(ana.id);
    expect(trips.map((t) => t.name)).toEqual(["Eurotrip"]);
  });

  it("moves activities on removed days back to ideas when the trip is shortened", async () => {
    const trip = await app.tripService.create(ana.id, validTrip);
    const kept = await app.activityService.create(ana.id, trip.id, { title: "Coliseo", date: "2026-06-02" });
    const moved = await app.activityService.create(ana.id, trip.id, { title: "Venecia", date: "2026-06-05" });

    await app.tripService.update(ana.id, trip.id, { ...validTrip, endDate: "2026-06-03" });

    const { days, ideas } = await app.activityService.getItinerary(ana.id, trip.id);
    expect(days).toHaveLength(3);
    expect(days[1].activities.map((a) => a.id)).toEqual([kept.id]);
    expect(ideas.map((a) => a.id)).toEqual([moved.id]);
  });
});
