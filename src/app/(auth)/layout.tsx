import { CalendarDays, Map as MapIcon, Wallet, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/logo";

const highlights: { icon: LucideIcon; text: string }[] = [
  { icon: CalendarDays, text: "Un itinerario compartido, día por día" },
  { icon: MapIcon, text: "Todos los lugares en el mapa" },
  { icon: Wallet, text: "El presupuesto claro para todo el grupo" },
];

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid flex-1 lg:grid-cols-2">
      <main className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-sm">{children}</div>
        </div>
      </main>

      <aside className="relative hidden overflow-hidden bg-linear-to-br from-brand-600 via-brand-700 to-brand-950 lg:block">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.12)_1px,transparent_0)] bg-size-[22px_22px]"
        />
        <div aria-hidden className="absolute -right-24 -bottom-24 size-96 rounded-full bg-coral-400/30 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <h2 className="max-w-md text-4xl leading-tight font-bold text-balance text-white">
            Todo el viaje, en un solo lugar.
          </h2>
          <p className="mt-4 max-w-md text-brand-100">
            Basta de buscar el restaurante que alguien mandó hace tres semanas en el grupo.
          </p>
          <ul className="mt-10 space-y-4">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white">
                <span className="flex size-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20 ring-inset">
                  <Icon className="size-5" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
