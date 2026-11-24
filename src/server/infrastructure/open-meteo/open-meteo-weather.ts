import "server-only";
import { cacheLife } from "next/cache";
import type { Coordinates } from "@/server/shared/coordinates";
import type { Forecast, WeatherSource } from "@/server/weather/weather";
import { parseOpenMeteoForecast } from "./open-meteo-response";

const TIMEOUT_MS = 4000;

/** Open-Meteo (https://open-meteo.com): free forecasts, no API key, about 16 days ahead. */
export class OpenMeteoWeather implements WeatherSource {
  forecast(point: Coordinates): Promise<Forecast> {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      // Rounded so nearby points of the same trip share cache entries.
      latitude: point.latitude.toFixed(2),
      longitude: point.longitude.toFixed(2),
      daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
      timezone: "auto",
      forecast_days: "16",
    }).toString();
    return fetchForecast(url.toString());
  }
}

/** Cached per place for an hour: forecasts update a few times a day. */
async function fetchForecast(url: string): Promise<Forecast> {
  "use cache";
  cacheLife("hours");

  const response = await fetch(url, {
    headers: { "User-Agent": "TripFlow (collaborative trip planner)" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  return parseOpenMeteoForecast(await response.json());
}
