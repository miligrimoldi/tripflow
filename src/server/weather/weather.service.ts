import type { Coordinates } from "../shared/coordinates";
import type { Forecast, WeatherSource } from "./weather";

/** The forecast at a trip's place. Optional extra: failures mean "no forecast". */
export class WeatherService {
  constructor(private readonly source: WeatherSource) {}

  async forecast(point: Coordinates | null): Promise<Forecast | null> {
    if (!point) return null;
    try {
      return await this.source.forecast(point);
    } catch (error) {
      console.warn("[weather] forecast unavailable", error);
      return null;
    }
  }
}
