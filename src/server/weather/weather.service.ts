import type { Coordinates } from "../shared/coordinates";
import type { DateOnly } from "../shared/date-only";
import type { DayWeather, WeatherSource } from "./weather";

export interface DayOutlook {
  /** `null` when the day is beyond the forecast (or it couldn't be loaded). */
  weather: DayWeather | null;
  /** The place's time zone, if known. */
  timeZone: string | null;
}

/** The weather of one day of the trip. Optional extra: failures mean "no forecast". */
export class WeatherService {
  constructor(private readonly source: WeatherSource) {}

  async dayOutlook(point: Coordinates | null, date: DateOnly): Promise<DayOutlook> {
    if (!point) return { weather: null, timeZone: null };
    try {
      const forecast = await this.source.forecast(point);
      return { weather: forecast.days.find((day) => day.date === date) ?? null, timeZone: forecast.timeZone };
    } catch (error) {
      console.warn("[weather] forecast unavailable", error);
      return { weather: null, timeZone: null };
    }
  }
}
