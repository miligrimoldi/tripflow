import { describe, expect, it } from "vitest";
import { parseOsrmDurations } from "./osrm-response";

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
