import { describe, expect, it } from "vitest";
import { describeWeatherCode, type DayWeather, type WeatherSource } from "./weather";
import { WeatherService } from "./weather.service";

describe("describeWeatherCode", () => {
  it.each([
    [0, "clear", "Despejado"],
    [2, "partly-cloudy", "Parcialmente nublado"],
    [45, "fog", "Niebla"],
    [53, "drizzle", "Llovizna"],
    [81, "rain", "Lluvia"],
    [75, "snow", "Nieve"],
    [95, "storm", "Tormenta"],
    [42, "cloudy", "Variable"],
  ])("code %i is %s", (code, condition, label) => {
    expect(describeWeatherCode(code)).toEqual({ condition, label });
  });
});

describe("WeatherService", () => {
  const point = { latitude: -41.13, longitude: -71.31 };
  const day: DayWeather = {
    date: "2026-07-11",
    condition: "snow",
    label: "Nieve",
    maxC: 3,
    minC: -4,
    precipitationChance: 70,
  };
  const source: WeatherSource = { forecast: async () => ({ timeZone: "America/Argentina/Salta", days: [day] }) };

  it("returns the day's weather and the place's time zone", async () => {
    expect(await new WeatherService(source).dayOutlook(point, "2026-07-11")).toEqual({
      weather: day,
      timeZone: "America/Argentina/Salta",
    });
  });

  it("has no weather for days beyond the forecast, but still knows the time zone", async () => {
    expect(await new WeatherService(source).dayOutlook(point, "2027-01-01")).toEqual({
      weather: null,
      timeZone: "America/Argentina/Salta",
    });
  });

  it("returns nothing without a place or when the source fails", async () => {
    const failing: WeatherSource = {
      forecast: async () => {
        throw new Error("down");
      },
    };
    expect(await new WeatherService(source).dayOutlook(null, "2026-07-11")).toEqual({ weather: null, timeZone: null });
    expect(await new WeatherService(failing).dayOutlook(point, "2026-07-11")).toEqual({
      weather: null,
      timeZone: null,
    });
  });
});
