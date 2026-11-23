import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <span className="text-5xl" aria-hidden>
        🧭
      </span>
      <h1 className="text-2xl font-bold text-slate-900">No encontramos lo que buscabas</h1>
      <p className="max-w-md text-slate-600">Puede que el enlace sea incorrecto o que no tengas acceso a este viaje.</p>
      <ButtonLink href="/trips">Volver a mis viajes</ButtonLink>
    </main>
  );
}
