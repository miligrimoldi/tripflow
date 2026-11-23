"use client";

import { Button } from "@/components/ui/button";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <span className="text-5xl" aria-hidden>
        🌧️
      </span>
      <h1 className="text-2xl font-bold text-slate-900">Algo salió mal</h1>
      <p className="max-w-md text-slate-600">Tuvimos un problema cargando esta página. Probá de nuevo.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
