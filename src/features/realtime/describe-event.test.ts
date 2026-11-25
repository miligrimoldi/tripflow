import { describe, expect, it } from "vitest";
import { describeTripEvent, parseTripEvent } from "./describe-event";

describe("describeTripEvent", () => {
  it("says who changed what", () => {
    expect(describeTripEvent("itinerary", "Bruno")).toBe("Bruno actualizó el itinerario");
    expect(describeTripEvent("budget", undefined)).toBe("Alguien del grupo actualizó el presupuesto");
  });
});

describe("parseTripEvent", () => {
  it("accepts well-formed events and rejects anything else", () => {
    expect(parseTripEvent({ topic: "budget", actorId: "u1" })).toEqual({ topic: "budget", actorId: "u1" });
    expect(parseTripEvent({ topic: "secrets", actorId: "u1" })).toBeNull();
    expect(parseTripEvent({ topic: "budget" })).toBeNull();
    expect(parseTripEvent("budget")).toBeNull();
    expect(parseTripEvent(null)).toBeNull();
  });
});
