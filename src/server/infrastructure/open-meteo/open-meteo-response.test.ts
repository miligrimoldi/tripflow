import { describe, expect, it } from "vitest";
import { parseOpenMeteoForecast } from "./open-meteo-response";

describe("parseOpenMeteoForecast", () => {
  it("reads each day's weather and the place's time zone", () => {
    const json = {
      timezone: "America/Argentina/Salta",
      daily: {
        time: ["2026-11-24", "2026-11-25", "2026-11-26"],
        weather_code: [3, 61, null],
        temperature_2m_max: [12.8, 20.2, 18],
        temperature_2m_min: [7.2, 7.8, 5],
        precipitation_probability_max: [22, 80, 0],
      },
    };
    expect(parseOpenMeteoForecast(json)).toEqual({
      timeZone: "America/Argentina/Salta",
      days: [
        { date: "2026-11-24", condition: "cloudy", label: "Nublado", maxC: 13, minC: 7, precipitationChance: 22 },
        { date: "2026-11-25", condition: "rain", label: "Lluvia", maxC: 20, minC: 8, precipitationChance: 80 },
      ],
    });
  });

  it("rejects unexpected responses", () => {
    expect(() => parseOpenMeteoForecast({ error: true, reason: "bad" })).toThrow();
  });
});
