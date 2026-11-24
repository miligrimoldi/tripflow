import { describe, expect, it } from "vitest";
import { parseOsrmDurations, parseOsrmRoute } from "./osrm-response";

describe("parseOsrmDurations", () => {
  it("converts seconds to minutes", () => {
    const json = {
      code: "Ok",
      durations: [
        [0, 600],
        [630, 0],
      ],
    };
    expect(parseOsrmDurations(json, 2)).toEqual([
      [0, 10],
      [10.5, 0],
    ]);
  });

  it("rejects error codes, wrong sizes and unreachable pairs", () => {
    expect(() => parseOsrmDurations({ code: "InvalidQuery", durations: [] }, 2)).toThrow();
    expect(() => parseOsrmDurations({ code: "Ok", durations: [[0]] }, 2)).toThrow();
    expect(() =>
      parseOsrmDurations(
        {
          code: "Ok",
          durations: [
            [0, null],
            [5, 0],
          ],
        },
        2,
      ),
    ).toThrow();
    expect(() => parseOsrmDurations("not json", 2)).toThrow();
  });
});

describe("parseOsrmRoute", () => {
  const route = {
    code: "Ok",
    routes: [
      {
        geometry: {
          type: "LineString",
          coordinates: [
            [-71.31, -41.13],
            [-71.4, -41.15],
            [-71.46, -41.17],
          ],
        },
        legs: [
          { distance: 4200, duration: 720 },
          { distance: 850, duration: 90 },
        ],
      },
    ],
  };

  it("converts the path to coordinates and legs to km / minutes", () => {
    expect(parseOsrmRoute(route, 3)).toEqual({
      path: [
        { latitude: -41.13, longitude: -71.31 },
        { latitude: -41.15, longitude: -71.4 },
        { latitude: -41.17, longitude: -71.46 },
      ],
      legs: [
        { distanceKm: 4.2, durationMin: 12 },
        { distanceKm: 0.85, durationMin: 1.5 },
      ],
      source: "roads",
    });
  });

  it("rejects error codes, missing routes and a wrong number of legs", () => {
    expect(() => parseOsrmRoute({ code: "NoRoute", routes: [] }, 3)).toThrow();
    expect(() => parseOsrmRoute({ code: "Ok", routes: [] }, 3)).toThrow();
    expect(() => parseOsrmRoute(route, 4)).toThrow();
  });
});
