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
