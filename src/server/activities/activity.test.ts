import { describe, expect, it } from "vitest";
import { buildItinerary, planMove, type Activity } from "./activity";

const activity = (id: string, date: string | null, position: number): Activity => ({
  id,
  tripId: "trip-1",
  title: id,
  category: "OTHER",
  notes: null,
  location: null,
  url: null,
  date,
  startTime: null,
  position,
  createdBy: { id: "user-1", name: "Ana" },
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("buildItinerary", () => {
  const trip = { startDate: "2026-03-01", endDate: "2026-03-03" };

  it("creates one bucket per trip day, even if empty", () => {
    const { days } = buildItinerary(trip, []);
    expect(days.map((d) => [d.dayNumber, d.date])).toEqual([
      [1, "2026-03-01"],
      [2, "2026-03-02"],
      [3, "2026-03-03"],
    ]);
  });

  it("groups activities by day and sorts them by position", () => {
    const { days, ideas } = buildItinerary(trip, [
      activity("b", "2026-03-02", 1),
      activity("a", "2026-03-02", 0),
      activity("idea", null, 0),
    ]);
    expect(days[1].activities.map((a) => a.id)).toEqual(["a", "b"]);
    expect(ideas.map((a) => a.id)).toEqual(["idea"]);
  });

  it("surfaces activities dated outside the trip as ideas instead of hiding them", () => {
    const { ideas } = buildItinerary(trip, [activity("orphan", "2026-04-01", 0)]);
    expect(ideas.map((a) => a.id)).toEqual(["orphan"]);
  });
});

describe("planMove", () => {
  const day1 = { date: "2026-03-01", activityIds: ["a", "b", "c"] };
  const day2 = { date: "2026-03-02", activityIds: ["x", "y"] };

  it("reorders inside the same day", () => {
    expect(planMove({ activityId: "c", from: day1, to: day1, index: 0 })).toEqual([
      { date: "2026-03-01", activityIds: ["c", "a", "b"] },
    ]);
  });

  it("moves to another day at the given index, removing it from the source", () => {
    expect(planMove({ activityId: "b", from: day1, to: day2, index: 1 })).toEqual([
      { date: "2026-03-01", activityIds: ["a", "c"] },
      { date: "2026-03-02", activityIds: ["x", "b", "y"] },
    ]);
  });

  it("appends at the end when no index is given", () => {
    const [, target] = planMove({ activityId: "a", from: day1, to: day2 });
    expect(target.activityIds).toEqual(["x", "y", "a"]);
  });

  it("clamps out-of-range indexes", () => {
    expect(planMove({ activityId: "a", from: day1, to: day1, index: 99 })[0].activityIds).toEqual(["b", "c", "a"]);
  });

  it("can move an idea into an empty day", () => {
    const ideas = { date: null, activityIds: ["idea"] };
    const empty = { date: "2026-03-03", activityIds: [] };
    expect(planMove({ activityId: "idea", from: ideas, to: empty, index: 0 })).toEqual([
      { date: null, activityIds: [] },
      { date: "2026-03-03", activityIds: ["idea"] },
    ]);
  });
});
