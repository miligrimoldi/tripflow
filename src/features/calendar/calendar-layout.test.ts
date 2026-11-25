import { describe, expect, it } from "vitest";
import { calendarHours, layoutDay } from "./calendar-layout";

describe("layoutDay", () => {
  it("gives each activity its estimated duration, cut short by the next one", () => {
    const blocks = layoutDay([
      { id: "museo", category: "SIGHTSEEING", startTime: "10:00" }, // 2 h, but lunch is at 11:30
      { id: "almuerzo", category: "FOOD", startTime: "11:30" }, // 1 h 30
      { id: "cerro", category: "EXCURSION", startTime: "15:00" }, // 4 h
    ]);
    expect(blocks.map((b) => [b.id, b.start / 60, b.end / 60, b.columns])).toEqual([
      ["museo", 10, 11.5, 1],
      ["almuerzo", 11.5, 13, 1],
      ["cerro", 15, 19, 1],
    ]);
  });

  it("puts activities at the same time side by side", () => {
    const blocks = layoutDay([
      { id: "a", category: "FOOD", startTime: "13:00" },
      { id: "b", category: "SHOPPING", startTime: "13:00" },
      { id: "c", category: "OTHER", startTime: "16:00" },
    ]);
    expect(blocks.map((b) => [b.id, b.column, b.columns])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 1],
    ]);
  });

  it("reuses a column once its block ends", () => {
    // a and b start together and both end at 11:00 (b is cut short by c), so
    // c starts a new group and goes back to the full width.
    const blocks = layoutDay([
      { id: "a", category: "OTHER", startTime: "10:00" },
      { id: "b", category: "EXCURSION", startTime: "10:00" },
      { id: "c", category: "OTHER", startTime: "11:00" },
    ]);
    expect(blocks.map((b) => [b.id, b.column, b.columns])).toEqual([
      ["a", 0, 2],
      ["b", 1, 2],
      ["c", 0, 1],
    ]);
  });

  it("keeps blocks readable and inside the day", () => {
    const blocks = layoutDay([
      { id: "a", category: "FOOD", startTime: "09:00" },
      { id: "b", category: "FOOD", startTime: "09:10" },
      { id: "cena", category: "NIGHTLIFE", startTime: "23:30" },
    ]);
    expect(blocks.find((b) => b.id === "a")).toMatchObject({ start: 540, end: 570, columns: 2 });
    expect(blocks.find((b) => b.id === "cena")).toMatchObject({ end: 24 * 60 });
  });
});

describe("calendarHours", () => {
  it("shows 8 to 22 by default and stretches to fit early or late plans", () => {
    expect(calendarHours([])).toEqual({ from: 8, to: 22 });
    expect(calendarHours([{ start: 6 * 60 + 30, end: 8 * 60 }])).toEqual({ from: 6, to: 22 });
    expect(calendarHours([{ start: 21 * 60, end: 23 * 60 + 15 }])).toEqual({ from: 8, to: 24 });
  });
});
