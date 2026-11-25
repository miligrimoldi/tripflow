import { describe, expect, it } from "vitest";
import { TripAccessPolicy } from "../members/trip-access";
import { NotFoundError } from "../shared/errors";
import { createTestApp } from "../testing/in-memory";
import type { RealtimeTokenIssuer } from "./trip-events";
import { RealtimeService } from "./realtime.service";

describe("RealtimeService", () => {
  it("gives tokens to a trip's members only", async () => {
    const app = createTestApp();
    const ana = app.addUser("Ana");
    const outsider = app.addUser("Carla");
    const { id: tripId } = await app.tripService.create(ana.id, {
      name: "Patagonia",
      destination: "Bariloche",
      startDate: "2026-07-10",
      endDate: "2026-07-12",
    });
    const issued: [string, string][] = [];
    const issuer: RealtimeTokenIssuer = {
      tokenFor: async (userId, trip) => {
        issued.push([userId, trip]);
        return { token: "t" };
      },
    };
    const service = new RealtimeService(issuer, new TripAccessPolicy(app.repositories.members));

    expect(await service.tokenFor(ana.id, tripId)).toEqual({ token: "t" });
    await expect(service.tokenFor(outsider.id, tripId)).rejects.toBeInstanceOf(NotFoundError);
    expect(issued).toEqual([[ana.id, tripId]]);
  });

  it("is off without a provider", async () => {
    const app = createTestApp();
    const ana = app.addUser("Ana");
    const { id: tripId } = await app.tripService.create(ana.id, {
      name: "P",
      destination: "B",
      startDate: "2026-07-10",
      endDate: "2026-07-10",
    });
    const service = new RealtimeService(null, new TripAccessPolicy(app.repositories.members));
    expect(service.enabled).toBe(false);
    expect(await service.tokenFor(ana.id, tripId)).toBeNull();
  });
});
