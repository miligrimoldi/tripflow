import { describe, expect, it } from "vitest";
import { centroid, isValidCoordinates } from "./coordinates";

describe("coordinates", () => {
  it("validates ranges", () => {
    expect(isValidCoordinates({ latitude: -41.1, longitude: -71.4 })).toBe(true);
    expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
    expect(isValidCoordinates({ latitude: Number.NaN, longitude: 0 })).toBe(false);
  });

  it("computes the centroid of a set of points", () => {
    expect(
      centroid([
        { latitude: -41, longitude: -71 },
        { latitude: -43, longitude: -73 },
      ]),
    ).toEqual({ latitude: -42, longitude: -72 });
    expect(centroid([])).toBeNull();
  });
});
