"use client";

import { Check, CircleCheck, Clock, LoaderCircle, MapPinOff, Route, TrendingDown, X } from "lucide-react";
import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { RouteSuggestion } from "@/server/routes/route.service";
import { applyDayRouteAction, suggestDayRouteAction } from "../actions";
import { costSourceLabel, formatCost, formatSavings } from "../format";

type Plan = Extract<RouteSuggestion, { kind: "plan" }>;

type PanelState =
  { kind: "closed" } | { kind: "plan"; plan: Plan } | { kind: "message"; text: string; tone: "info" | "error" };

interface DayRouteOptimizerProps {
  tripId: string;
  date: string;
  /** Show the button (only for members who can reorder, on days worth optimizing). */
  enabled: boolean;
  /**
   * Renders the day's header with the "Optimizar recorrido" button (or `null`
   * when it doesn't apply) wherever it fits: next to a title, over a photo…
   */
  header: (button: ReactNode) => ReactNode;
  /** `light` for the button over a photo or dark background. */
  buttonVariant?: "secondary" | "light";
}

/**
 * "Optimizar recorrido" for one day: asks the server for a shorter order,
 * shows it with the distance saved, and applies it only if the user agrees.
 */
export function DayRouteOptimizer({
  tripId,
  date,
  enabled,
  header,
  buttonVariant = "secondary",
}: DayRouteOptimizerProps) {
  const [panel, setPanel] = useState<PanelState>({ kind: "closed" });
  const [calculating, startCalculating] = useTransition();
  const [applying, startApplying] = useTransition();

  function suggest() {
    startCalculating(async () => {
      const result = await suggestDayRouteAction(tripId, date);
      if (result.status === "error") return setPanel({ kind: "message", text: result.message, tone: "error" });
      const { suggestion } = result;
      if (suggestion.kind === "not-enough") {
        return setPanel({
          kind: "message",
          tone: "info",
          text: "Se necesitan al menos 3 actividades con ubicación en el mapa para optimizar el recorrido.",
        });
      }
      setPanel({ kind: "plan", plan: suggestion });
    });
  }

  function apply(plan: Plan) {
    startApplying(async () => {
      const result = await applyDayRouteAction(
        tripId,
        date,
        plan.stops.map((stop) => stop.id),
      );
      setPanel(
        result.status === "error" ? { kind: "message", text: result.message, tone: "error" } : { kind: "closed" },
      );
    });
  }

  return (
    <div className="mb-3 space-y-3">
      {header(
        enabled ? (
          <Button
            type="button"
            size="sm"
            variant={buttonVariant}
            onClick={suggest}
            disabled={calculating}
            aria-expanded={panel.kind !== "closed"}
          >
            {calculating ? <LoaderCircle className="animate-spin" aria-hidden /> : <Route aria-hidden />}
            {calculating ? "Calculando…" : "Optimizar recorrido"}
          </Button>
        ) : null,
      )}

      {panel.kind === "message" && (
        <div
          role={panel.tone === "error" ? "alert" : "status"}
          className={cn(
            "flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm",
            panel.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-200 bg-white text-slate-600",
          )}
        >
          {panel.text}
          <CloseButton onClick={() => setPanel({ kind: "closed" })} />
        </div>
      )}

      {panel.kind === "plan" && !panel.plan.changed && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-brand-900"
        >
          <span className="inline-flex items-start gap-2">
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
            <span>
              <strong className="font-semibold">Este día ya está en el mejor orden.</strong> Recorrido de{" "}
              {formatCost(panel.plan.currentCost, panel.plan.unit)} {costSourceLabel(panel.plan.source)}.
            </span>
          </span>
          <CloseButton onClick={() => setPanel({ kind: "closed" })} />
        </div>
      )}

      {panel.kind === "plan" && panel.plan.changed && (
        <section
          aria-label="Recorrido sugerido"
          className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-soft"
        >
          <div className="flex items-start justify-between gap-3 bg-linear-to-r from-brand-50 to-white px-4 py-3">
            <div>
              <p className="font-display font-semibold text-slate-900">Recorrido sugerido</p>
              <p className="mt-0.5 inline-flex flex-wrap items-center gap-x-1.5 text-sm text-slate-600">
                <TrendingDown className="size-4 text-brand-600" aria-hidden />
                De {formatCost(panel.plan.currentCost, panel.plan.unit)} a{" "}
                <strong className="font-semibold text-slate-900">
                  {formatCost(panel.plan.suggestedCost, panel.plan.unit)}
                </strong>{" "}
                {costSourceLabel(panel.plan.source)}
                <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {formatSavings(panel.plan)} menos
                </span>
              </p>
            </div>
            <CloseButton onClick={() => setPanel({ kind: "closed" })} />
          </div>

          <ol className="space-y-1.5 px-4 py-3">
            {panel.plan.stops.map((stop, index) => (
              <li key={stop.id} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    stop.located ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-800">{stop.title}</span>
                {stop.startTime && (
                  <span className="inline-flex items-center gap-1 font-mono text-xs text-slate-500">
                    <Clock className="size-3" aria-hidden />
                    {stop.startTime}
                  </span>
                )}
                {!stop.located && (
                  <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                    <MapPinOff className="size-3" aria-hidden />
                    queda en su lugar
                  </span>
                )}
              </li>
            ))}
          </ol>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500">
              Las actividades con horario quedan fijas y el resto se reordena entre ellas.
            </p>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setPanel({ kind: "closed" })}>
                Descartar
              </Button>
              <Button type="button" size="sm" onClick={() => apply(panel.plan)} disabled={applying}>
                {applying ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
                Aplicar este orden
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Cerrar"
      className="-m-1 shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-900/5 hover:text-slate-700"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}
