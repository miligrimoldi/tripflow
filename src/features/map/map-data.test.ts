import { describe, expect, it } from "vitest";
import type { Activity } from "@/server/activities/activity";
import { buildMapData, DAY_COLORS, IDEAS_COLOR } from "./map-data";

const activity = (id: string, coordinates: Activity["coordinates"] = null) =>
  ({
    id,
    title: id,
    category: "FOOD",
    location: coordinates ? `${id} place` : null,
    coordinates,
    startTime: null,
  }) as Activity;

const point = (latitude: number) => ({ latitude, longitude: -71 });

const itinerary = {
  days: [
    {
      date: "2026-03-01",
      dayNumber: 1,
      activities: [activity("a", point(1)), activity("free-text"), activity("b", point(2))],
    },
    { date: "2026-03-02", dayNumber: 2, activities: [] },
    { date: "2026-03-03", dayNumber: 3, activities: [activity("c", point(3))] },
  ],
  ideas: [activity("idea", point(4)), activity("idea-free-text")],
};

describe("buildMapData", () => {
  const data = buildMapData(itinerary, (date) => date);

  it("creates one group per day with located activities, plus ideas", () => {
    expect(data.groups.map((group) => group.shortLabel)).toEqual(["Día 1", "Día 3", "Ideas"]);
  });

  it("numbers stops in visiting order, skipping activities without a point", () => {
    expect(data.groups[0].points.map((p) => [p.id, p.order])).toEqual([
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("keeps each day's color tied to the day, not to its position among groups", () => {
    expect(data.groups[0].color).toBe(DAY_COLORS[0]);
    expect(data.groups[1].color).toBe(DAY_COLORS[2]);
    expect(data.groups[2].color).toBe(IDEAS_COLOR);
  });

  it("lists activities that are not on the map yet", () => {
    expect(data.unlocated.map((a) => a.id)).toEqual(["free-text", "idea-free-text"]);
  });
});
