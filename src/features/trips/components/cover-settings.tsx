"use client";

import { ImageUp, RotateCcw } from "lucide-react";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/form-alert";
import type { ActionState } from "@/lib/action-state";
import type { TripCover } from "@/server/covers/cover";
import { removeCoverAction, uploadCoverAction } from "../actions";
import { resizeImage } from "../resize-image";

interface CoverSettingsProps {
  tripId: string;
  cover: TripCover | null;
  /** False when the server has nowhere to store uploads. */
  uploadsEnabled: boolean;
}

export function CoverSettings({ tripId, cover, uploadsEnabled }: CoverSettingsProps) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ActionState | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(file: File) {
    startTransition(async () => {
      const formData = new FormData();
      formData.append("cover", await resizeImage(file), "cover.jpg");
      setState(await uploadCoverAction(tripId, formData));
    });
  }

  return (
    <div className="space-y-4">
      <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
        {cover ? (
          <Image
            src={cover.url}
            alt="Foto de portada actual"
            fill
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover"
          />
        ) : (
          <p className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
            No encontramos una foto del destino. Subí una para darle identidad al viaje.
          </p>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-slate-700 backdrop-blur-sm">
            Subiendo…
          </div>
        )}
      </div>

      <p className="text-sm text-slate-600">
        {cover?.source === "upload"
          ? "Estás usando una foto propia."
          : cover
            ? "Es una foto del destino tomada de Wikipedia. Podés reemplazarla por una propia."
            : "Sin foto, el viaje usa un degradé de color."}
      </p>

      {uploadsEnabled ? (
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (file) upload(file);
            }}
          />
          <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
            <ImageUp aria-hidden />
            {cover?.source === "upload" ? "Cambiar foto" : "Subir foto"}
          </Button>
          {cover?.source === "upload" && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(async () => setState(await removeCoverAction(tripId)))}
            >
              <RotateCcw aria-hidden />
              Usar la foto del destino
            </Button>
          )}
        </div>
      ) : (
        <p className="text-xs text-slate-500">La subida de fotos no está habilitada en este servidor.</p>
      )}

      {state && state.status !== "idle" && <FormAlert state={state} />}
    </div>
  );
}
