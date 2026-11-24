import type { Coordinates } from "../shared/coordinates";
import type { DateOnly } from "../shared/date-only";

export type WeatherCondition = "clear" | "partly-cloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface DayWeather {
  date: DateOnly;
  condition: WeatherCondition;
  /** "Parcialmente nublado". */
  label: string;
  maxC: number;
  minC: number;
  /** Highest chance of rain during the day (0–100), if known. */
  precipitationChance: number | null;
}

export interface Forecast {
  /** IANA time zone of the place ("America/Argentina/Salta"), to know what "now" is there. */
  timeZone: string;
  /** The days the forecast covers (about two weeks ahead). */
  days: DayWeather[];
}

/** Port for the weather forecast at a place. */
export interface WeatherSource {
  forecast(point: Coordinates): Promise<Forecast>;
}

const CONDITIONS: { codes: number[]; condition: WeatherCondition; label: string }[] = [
  { codes: [0, 1], condition: "clear", label: "Despejado" },
  { codes: [2], condition: "partly-cloudy", label: "Parcialmente nublado" },
  { codes: [3], condition: "cloudy", label: "Nublado" },
  { codes: [45, 48], condition: "fog", label: "Niebla" },
  { codes: [51, 53, 55, 56, 57], condition: "drizzle", label: "Llovizna" },
  { codes: [61, 63, 65, 66, 67, 80, 81, 82], condition: "rain", label: "Lluvia" },
  { codes: [71, 73, 75, 77, 85, 86], condition: "snow", label: "Nieve" },
  { codes: [95, 96, 99], condition: "storm", label: "Tormenta" },
];

/**
 * WMO weather interpretation codes, as used by most forecast APIs.
 * https://open-meteo.com/en/docs#weather_variable_documentation
 */
export function describeWeatherCode(code: number): { condition: WeatherCondition; label: string } {
  const match = CONDITIONS.find((entry) => entry.codes.includes(code));
  return match ? { condition: match.condition, label: match.label } : { condition: "cloudy", label: "Variable" };
}
