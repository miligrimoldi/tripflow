import { describe, expect, it } from "vitest";
import { buildItinerary, reorder, type Activity } from "./activity";

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

describe("reorder", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("moves an item up", () => {
    expect(reorder(items, "b", "up")).toEqual(["b", "a", "c"]);
  });

  it("moves an item down", () => {
    expect(reorder(items, "b", "down")).toEqual(["a", "c", "b"]);
  });

  it("returns null when the move is not possible", () => {
    expect(reorder(items, "a", "up")).toBeNull();
    expect(reorder(items, "c", "down")).toBeNull();
    expect(reorder(items, "missing", "up")).toBeNull();
  });
});
