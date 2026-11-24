import { ArrowLeft, Compass } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { IconTile } from "@/components/ui/icon-tile";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-4 py-24 text-center">
      <IconTile icon={Compass} tone="brand" size="lg" />
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">No encontramos lo que buscabas</h1>
        <p className="mx-auto max-w-md text-slate-600">
          Puede que el enlace sea incorrecto o que no tengas acceso a este viaje.
        </p>
      </div>
      <ButtonLink href="/trips">
        <ArrowLeft aria-hidden />
        Volver a mis viajes
      </ButtonLink>
    </main>
  );
}
