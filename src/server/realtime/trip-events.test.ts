import { beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../testing/in-memory";
import type { TripTopic } from "./trip-events";

/**
 * Every change to a trip is announced on its channel, with who did it and
 * roughly what changed, so the others' screens can refresh.
 */
describe("trip events", () => {
  let app: ReturnType<typeof createTestApp>;
  let ana: { id: string };
  let bruno: { id: string };
  let tripId: string;

  beforeEach(async () => {
    app = createTestApp();
    ana = app.addUser("Ana");
    bruno = app.addUser("Bruno");
    ({ id: tripId } = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    }));
    await app.repositories.members.add(tripId, bruno.id, "EDITOR");
    app.events.published = [];
  });

  const topics = () => app.events.published.map((event) => [event.topic, event.actorId, event.tripId]);
  const expectAnnounced = (topic: TripTopic, actorId: string) => expect(topics()).toEqual([[topic, actorId, tripId]]);

  it("announces itinerary changes", async () => {
    const activity = await app.activityService.create(bruno.id, tripId, { title: "Museo" });
    expectAnnounced("itinerary", bruno.id);

    app.events.published = [];
    await app.activityService.move(ana.id, activity.id, { date: "2026-07-10" });
    await app.activityService.update(ana.id, activity.id, { title: "Museo de la Patagonia" });
    await app.activityService.delete(ana.id, activity.id);
    expect(topics()).toEqual([
      ["itinerary", ana.id, tripId],
      ["itinerary", ana.id, tripId],
      ["itinerary", ana.id, tripId],
    ]);
  });

  it("announces budget changes, including payments between members", async () => {
    const expense = await app.budgetService.addExpense(bruno.id, tripId, {
      description: "Cena",
      category: "FOOD",
      amount: "100",
      paidById: bruno.id,
      participantIds: [ana.id, bruno.id],
    });
    await app.settleUpService.record(ana.id, tripId, { fromId: ana.id, toId: bruno.id, amount: "50" });
    await app.budgetService.deleteExpense(ana.id, expense.id);
    expect(topics()).toEqual([
      ["budget", bruno.id, tripId],
      ["budget", ana.id, tripId],
      ["budget", ana.id, tripId],
    ]);
  });

  it("announces votes and comments", async () => {
    const idea = await app.activityService.create(ana.id, tripId, { title: "Kayak" });
    app.events.published = [];
    await app.discussionService.setVote(bruno.id, idea.id, { voted: true });
    await app.discussionService.addComment(bruno.id, idea.id, { body: "¡Sí!" });
    expect(topics()).toEqual([
      ["discussion", bruno.id, tripId],
      ["discussion", bruno.id, tripId],
    ]);
  });

  it("announces changes to the trip and its members", async () => {
    await app.tripService.update(ana.id, tripId, {
      name: "Patagonia 2026",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    });
    await app.membershipService.leaveTrip(bruno.id, tripId);
    expect(topics()).toEqual([
      ["trip", ana.id, tripId],
      ["members", bruno.id, tripId],
    ]);
  });

  it("announces nothing when a change is rejected", async () => {
    const outsider = app.addUser("Carla");
    await expect(app.activityService.create(outsider.id, tripId, { title: "X" })).rejects.toThrow();
    await expect(app.activityService.create(ana.id, tripId, { title: "" })).rejects.toThrow();
    expect(app.events.published).toEqual([]);
  });
});
