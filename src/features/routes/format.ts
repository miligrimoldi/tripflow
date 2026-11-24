import type { RouteSuggestion } from "@/server/routes/route.service";

type Plan = Extract<RouteSuggestion, { kind: "plan" }>;

const km = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const percent = new Intl.NumberFormat("es-AR", { style: "percent", maximumFractionDigits: 0 });

/** "12,4 km" or "35 min". */
export function formatCost(value: number, unit: Plan["unit"]): string {
  return unit === "km" ? `${km.format(value)} km` : `${Math.round(value)} min`;
}

/** "en línea recta" / "en auto". */
export function costSourceLabel(source: Plan["source"]): string {
  return source === "roads" ? "en auto" : "en línea recta";
}

/** Fraction saved by the suggestion (0–1), or 0 if none. */
export function savingsRatio(plan: Pick<Plan, "currentCost" | "suggestedCost">): number {
  return plan.currentCost > 0 ? Math.max(0, 1 - plan.suggestedCost / plan.currentCost) : 0;
}

export function formatSavings(plan: Pick<Plan, "currentCost" | "suggestedCost">): string {
  return percent.format(savingsRatio(plan));
}

const distanceKm = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** "850 m", "4,2 km", "38 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km >= 10 ? Math.round(km) : distanceKm.format(km)} km`;
}

/** "3 min", "45 min", "1 h", "2 h 05 min". Never less than a minute. */
export function formatDuration(minutes: number): string {
  const total = Math.max(1, Math.round(minutes));
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")} min`;
}
