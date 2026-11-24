"use client";

import { CloudRain, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-24 text-center">
      <IconTile icon={CloudRain} tone="slate" size="lg" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Algo salió mal</h1>
        <p className="mx-auto max-w-md text-slate-600">Tuvimos un problema cargando esta página. Probá de nuevo.</p>
      </div>
      <Button onClick={reset}>
        <RotateCcw aria-hidden />
        Reintentar
      </Button>
    </div>
  );
}
