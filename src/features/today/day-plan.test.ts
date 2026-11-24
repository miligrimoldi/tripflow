import { describe, expect, it } from "vitest";
import type { Activity } from "@/server/activities/activity";
import { buildDayPlan, pickDay, timelineState } from "./day-plan";

const trip = { startDate: "2026-07-10", endDate: "2026-07-13" };

describe("pickDay", () => {
  it("uses the requested day when it belongs to the trip", () => {
    expect(pickDay(trip, "2026-07-12", "2026-01-01")).toBe("2026-07-12");
  });

  it("defaults to today while traveling, and to the first day otherwise", () => {
    expect(pickDay(trip, undefined, "2026-07-11")).toBe("2026-07-11");
    expect(pickDay(trip, undefined, "2026-05-01")).toBe("2026-07-10");
    expect(pickDay(trip, undefined, "2026-09-01")).toBe("2026-07-10");
    expect(pickDay(trip, "2026-08-01", "2026-07-11")).toBe("2026-07-11");
    expect(pickDay(trip, ["2026-07-12"], "2026-07-11")).toBe("2026-07-11");
  });
});

const activity = (id: string, located = true) =>
  ({
    id,
    title: id,
    category: "SIGHTSEEING",
    startTime: null,
    location: located ? id : null,
    coordinates: located ? { latitude: 0, longitude: 0 } : null,
  }) as Activity;

describe("buildDayPlan", () => {
  const directions = {
    stopIds: ["a", "b", "d"],
    legs: [
      { distanceKm: 1, durationMin: 3 },
      { distanceKm: 5, durationMin: 12 },
    ],
    source: "roads" as const,
  };

  it("attaches each leg to the stop it leaves from, only when the next activity is the next stop", () => {
    // c has no location: the b → d leg must not be shown between b and c.
    const plan = buildDayPlan([activity("a"), activity("b"), activity("c", false), activity("d")], directions);
    expect(plan.map((entry) => [entry.id, entry.legToNext?.durationMin ?? null])).toEqual([
      ["a", 3],
      ["b", null],
      ["c", null],
      ["d", null],
    ]);
    expect(plan[0].legByRoad).toBe(true);
  });

  it("works without directions and adds known photos", () => {
    const plan = buildDayPlan([activity("a")], null, new Map([["a", "https://photo.test/a.jpg"]]));
    expect(plan[0]).toMatchObject({ legToNext: null, photoUrl: "https://photo.test/a.jpg" });
  });
});

describe("timelineState", () => {
  const entries = [
    { id: "desayuno", startTime: "09:00" },
    { id: "paseo", startTime: null },
    { id: "museo", startTime: "11:00" },
    { id: "cena", startTime: "21:00" },
  ];

  it("marks what's done, where now is and what comes next", () => {
    const state = timelineState(entries, 10 * 60 + 15); // 10:15
    expect([...state.done]).toEqual(["desayuno", "paseo"]);
    expect(state.nowBefore).toBe(2);
    expect(state.next).toEqual({ index: 2, minutesUntil: 45 });

    const afternoon = timelineState(entries, 15 * 60); // 15:00, at the museum or after it
    expect([...afternoon.done]).toEqual(["desayuno", "paseo", "museo"]);
    expect(afternoon.next).toEqual({ index: 3, minutesUntil: 360 });
  });

  it("puts now first before the day starts and last when it's over", () => {
    expect(timelineState(entries, 7 * 60)).toMatchObject({ nowBefore: 0, next: { index: 0, minutesUntil: 120 } });
    const night = timelineState(entries, 23 * 60);
    expect(night).toMatchObject({ nowBefore: 4, next: null });
    expect([...night.done]).toEqual(["desayuno", "paseo", "museo", "cena"]);
  });

  it("keeps untimed activities at the top ahead before the first timed one starts", () => {
    const morning = [{ id: "valija", startTime: null }, ...entries];
    expect(timelineState(morning, 8 * 60)).toMatchObject({ nowBefore: 0, next: { index: 1, minutesUntil: 60 } });
    expect([...timelineState(morning, 8 * 60).done]).toEqual([]);
  });

  it("shows the first activity as next on other days", () => {
    expect(timelineState(entries, null)).toEqual({
      done: new Set(),
      nowBefore: null,
      next: { index: 0, minutesUntil: null },
    });
    expect(timelineState([], null).next).toBeNull();
  });
});
