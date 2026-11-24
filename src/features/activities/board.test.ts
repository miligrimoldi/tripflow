import { describe, expect, it } from "vitest";
import type { Activity } from "@/server/activities/activity";
import { IDEAS_SLOT, locate, slotDate, toBoardSlots } from "./board";

const activity = (id: string) => ({ id }) as Activity;

describe("board helpers", () => {
  const itinerary = {
    days: [
      { date: "2026-03-01", dayNumber: 1, activities: [activity("a"), activity("b")] },
      { date: "2026-03-02", dayNumber: 2, activities: [] },
    ],
    ideas: [activity("idea")],
  };

  it("builds one slot per day plus the ideas slot", () => {
    const slots = toBoardSlots(itinerary);
    expect(Object.keys(slots)).toEqual(["2026-03-01", "2026-03-02", IDEAS_SLOT]);
    expect(slots[IDEAS_SLOT].map((a) => a.id)).toEqual(["idea"]);
  });

  it("locates an activity on the board", () => {
    const slots = toBoardSlots(itinerary);
    expect(locate(slots, "b")).toEqual({ slotId: "2026-03-01", index: 1 });
    expect(locate(slots, "idea")).toEqual({ slotId: IDEAS_SLOT, index: 0 });
    expect(locate(slots, "missing")).toBeNull();
  });

  it("maps slots to dates", () => {
    expect(slotDate("2026-03-01")).toBe("2026-03-01");
    expect(slotDate(IDEAS_SLOT)).toBeNull();
  });
});
