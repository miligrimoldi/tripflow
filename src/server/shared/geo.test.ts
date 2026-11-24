import { describe, expect, it } from "vitest";
import { haversineKm } from "./geo";

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ latitude: -41.13, longitude: -71.3 }, { latitude: -41.13, longitude: -71.3 })).toBe(0);
  });

  it("matches known distances", () => {
    const obelisco = { latitude: -34.6037, longitude: -58.3816 };
    const cordoba = { latitude: -31.4201, longitude: -64.1888 };
    // Buenos Aires → Córdoba is ~646 km in a straight line.
    expect(haversineKm(obelisco, cordoba)).toBeCloseTo(646, -1);
  });

  it("is symmetric", () => {
    const a = { latitude: 48.8584, longitude: 2.2945 };
    const b = { latitude: 48.8606, longitude: 2.3376 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });
});
