import { z } from "zod";
import { describeWeatherCode, type Forecast } from "@/server/weather/weather";

/** The part of an Open-Meteo `/v1/forecast` response (daily variables) we use. */
const forecastSchema = z.object({
  timezone: z.string().min(1),
  daily: z.object({
    time: z.array(z.string()),
    weather_code: z.array(z.number().nullable()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    precipitation_probability_max: z.array(z.number().nullable()).optional(),
  }),
});

/** Days with incomplete data are skipped rather than shown wrong. */
export function parseOpenMeteoForecast(json: unknown): Forecast {
  const parsed = forecastSchema.safeParse(json);
  if (!parsed.success) throw new Error("Unexpected Open-Meteo response");
  const { timezone, daily } = parsed.data;

  const days = daily.time.flatMap((date, i) => {
    const code = daily.weather_code[i];
    const maxC = daily.temperature_2m_max[i];
    const minC = daily.temperature_2m_min[i];
    if (code == null || maxC == null || minC == null) return [];
    return [
      {
        date,
        ...describeWeatherCode(code),
        maxC: Math.round(maxC),
        minC: Math.round(minC),
        precipitationChance: daily.precipitation_probability_max?.[i] ?? null,
      },
    ];
  });
  return { timeZone: timezone, days };
}
