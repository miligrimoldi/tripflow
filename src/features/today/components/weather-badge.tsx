import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Sun,
  type LucideIcon,
} from "lucide-react";
import type { DayWeather, WeatherCondition } from "@/server/weather/weather";

const ICONS: Record<WeatherCondition, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

/** "Nieve · 3° / -4° · 70 %". */
export function WeatherBadge({ weather, place }: { weather: DayWeather; place: string }) {
  const Icon = ICONS[weather.condition];
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-slate-200/70">
      <Icon className="size-9 shrink-0 text-amber-500" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0">
        <p className="font-display text-xl leading-tight font-semibold text-slate-900 tabular-nums">
          {weather.maxC}° <span className="text-base font-medium text-slate-400">/ {weather.minC}°</span>
        </p>
        <p className="truncate text-xs text-slate-500">
          {weather.label} en {place}
          {weather.precipitationChance !== null && weather.precipitationChance >= 20 && (
            <span className="ml-1.5 inline-flex items-center gap-0.5 text-sky-700">
              <Droplets className="size-3" aria-hidden />
              {weather.precipitationChance} %
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
