import { describe, expect, it } from "vitest";
import type { ActivityCategory } from "@/server/activities/activity";
import { pickDayCover } from "./day-cover";

const activity = (id: string, category: ActivityCategory) => ({ id, category });

describe("pickDayCover", () => {
  it("prefers the most representative place that has a photo", () => {
    const day = [activity("cena", "FOOD"), activity("museo", "SIGHTSEEING"), activity("cerro", "EXCURSION")];
    const photos = { cena: "cena.jpg", museo: "museo.jpg", cerro: "cerro.jpg" };
    expect(pickDayCover(day, photos)).toBe("museo.jpg");
    expect(pickDayCover(day, { cena: "cena.jpg", cerro: "cerro.jpg" })).toBe("cerro.jpg");
  });

  it("keeps the itinerary order between places of the same kind", () => {
    const day = [activity("a", "SIGHTSEEING"), activity("b", "SIGHTSEEING")];
    expect(pickDayCover(day, { a: "a.jpg", b: "b.jpg" })).toBe("a.jpg");
  });

  it("has no cover without photos", () => {
    expect(pickDayCover([activity("a", "FOOD")], {})).toBeNull();
    expect(pickDayCover([], {})).toBeNull();
  });
});
