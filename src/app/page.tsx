import {
  ArrowRight,
  BedDouble,
  CalendarDays,
  Clock,
  GripVertical,
  Landmark,
  Lightbulb,
  Map as MapIcon,
  Mountain,
  Sparkles,
  UserPlus,
  Users,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { IconTile, type Tone } from "@/components/ui/icon-tile";
import { getCurrentUser } from "@/server/auth/session";

const features: { icon: LucideIcon; tone: Tone; title: string; text: string }[] = [
  {
    icon: CalendarDays,
    tone: "brand",
    title: "Itinerario día por día",
    text: "Cada día tiene sus actividades, con horarios. Arrastrá para reordenar o cambiar de día.",
  },
  {
    icon: Lightbulb,
    tone: "amber",
    title: "Tablero de ideas",
    text: "Guardá ese restaurante o excursión aunque todavía no sepan qué día ir.",
  },
  {
    icon: MapIcon,
    tone: "sky",
    title: "Mapa del viaje",
    text: "Todos los lugares en un mapa, por día y en orden, para no dar vueltas de más.",
  },
  {
    icon: Wallet,
    tone: "emerald",
    title: "Presupuesto compartido",
    text: "Cargá gastos estimados, compará contra el presupuesto y mirá cuánto toca por persona.",
  },
  {
    icon: Users,
    tone: "violet",
    title: "Todos editan",
    text: "Invitá con un link y que cada uno sume lo suyo. Se ve quién agregó qué.",
  },
  {
    icon: Sparkles,
    tone: "coral",
    title: "Lugares reales",
    text: "Buscá lugares mientras escribís y quedan ubicados en el mapa automáticamente.",
  },
];

const steps = [
  { title: "Creá el viaje", text: "Destino y fechas. TripFlow arma un día por cada día del viaje." },
  { title: "Invitá al grupo", text: "Compartí el link por WhatsApp. Se suman con un clic." },
  { title: "Planifiquen juntos", text: "Ideas, itinerario, mapa y presupuesto, siempre actualizados para todos." },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col overflow-x-clip">
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Suspense fallback={<GuestActions />}>
            <HeaderActions />
          </Suspense>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
            <div className="absolute -top-40 -left-32 size-[32rem] rounded-full bg-brand-200/50 blur-3xl" />
            <div className="absolute top-20 -right-40 size-[28rem] rounded-full bg-coral-100/80 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-14 px-4 pt-10 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-16">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-sm font-medium text-brand-800 backdrop-blur">
                <Sparkles className="size-4 text-brand-600" aria-hidden />
                Planificación de viajes en grupo
              </p>
              <h1 className="mt-6 text-[2.6rem] leading-[1.04] font-extrabold tracking-tight text-balance text-slate-900 sm:text-6xl sm:leading-[1.02] lg:text-7xl">
                Planifiquen el viaje{" "}
                <span className="relative whitespace-nowrap text-brand-600">
                  juntos
                  <svg
                    aria-hidden
                    viewBox="0 0 200 12"
                    className="absolute -bottom-2 left-0 h-3 w-full text-coral-400"
                    preserveAspectRatio="none"
                  >
                    <path
                      d="M2 9C50 3 150 1 198 7"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                , sin perder nada en el chat
              </h1>
              <p className="mt-6 max-w-xl text-lg text-pretty text-slate-600">
                Itinerario, ideas, mapa y presupuesto en un solo lugar, para que amigos, parejas y familias organicen
                todo en conjunto.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/sign-up" size="lg">
                  Empezar gratis
                  <ArrowRight aria-hidden />
                </ButtonLink>
                <ButtonLink href="/sign-in" variant="secondary" size="lg">
                  Ya tengo cuenta
                </ButtonLink>
              </div>
              <div className="mt-10 flex items-center gap-3 text-sm text-slate-500">
                <div className="flex -space-x-2">
                  {["Ana", "Bruno", "Carla", "Diego"].map((name) => (
                    <Avatar key={name} name={name} />
                  ))}
                </div>
                Pensado para grupos de amigos, parejas y familias.
              </div>
            </div>

            <ProductPreview />
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-slate-200/70 bg-white/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold tracking-wide text-brand-700 uppercase">Todo en un lugar</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Lo que hoy está repartido entre el chat, notas y planillas
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <IconTile icon={feature.icon} tone={feature.tone} />
                  <h3 className="mt-5 font-display text-lg font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Listo en tres pasos
          </h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-900 font-display text-xl font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Final CTA */}
        <section className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-linear-to-br from-brand-600 via-brand-700 to-brand-900 px-6 py-14 text-center shadow-lift sm:px-12">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgb(255_255_255/0.12)_1px,transparent_0)] bg-size-[20px_20px]"
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-balance text-white sm:text-4xl">
                ¿Cuál es el próximo destino?
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-brand-100">
                Creá el viaje en un minuto e invitá a quienes viajan con vos.
              </p>
              <ButtonLink href="/sign-up" variant="light" size="lg" className="mt-8">
                Crear mi primer viaje
                <ArrowRight aria-hidden />
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-slate-500 sm:px-6">
          <Logo />
          <p>Hecho para planificar viajes en grupo.</p>
        </div>
      </footer>
    </div>
  );
}

/** A static mock of the planner, so visitors see the product right away. */
function ProductPreview() {
  const activities = [
    { icon: Landmark, tone: "sky" as const, title: "Museo de la Patagonia", time: "10:00", by: "Ana" },
    {
      icon: UtensilsCrossed,
      tone: "amber" as const,
      title: "Almuerzo en el Centro Cívico",
      time: "13:30",
      by: "Bruno",
    },
    { icon: Mountain, tone: "emerald" as const, title: "Atardecer en el Cerro Campanario", time: "18:00", by: "Carla" },
  ];

  return (
    <div aria-hidden className="relative mx-auto w-full max-w-md lg:max-w-none">
      <div className="rotate-1 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-lift">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-linear-to-br from-brand-500 to-brand-700 font-display font-bold text-white">
            2
          </span>
          <div>
            <p className="font-display font-semibold text-slate-900">Domingo, 11 de julio</p>
            <p className="text-xs text-slate-500">3 actividades · Bariloche</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2.5">
          {activities.map((activity) => (
            <li
              key={activity.title}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3 shadow-soft"
            >
              <GripVertical className="size-4 text-slate-300" />
              <IconTile icon={activity.icon} tone={activity.tone} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{activity.title}</p>
                <p className="text-xs text-slate-400">Agregado por {activity.by}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-mono text-xs font-semibold text-brand-700">
                <Clock className="size-3" />
                {activity.time}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute -top-6 -right-2 hidden -rotate-2 items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-lift sm:flex">
        <IconTile icon={Wallet} tone="emerald" size="sm" />
        <div>
          <p className="text-xs text-slate-500">Presupuesto</p>
          <div className="mt-1 h-1.5 w-28 rounded-full bg-slate-100">
            <div className="h-full w-[72%] rounded-full bg-brand-500" />
          </div>
        </div>
        <span className="text-sm font-semibold text-slate-900">72%</span>
      </div>

      <div className="absolute -bottom-14 -left-4 hidden rotate-[-3deg] items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-3 shadow-lift sm:flex">
        <IconTile icon={BedDouble} tone="violet" size="sm" />
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Diego</span> agregó una cabaña a Ideas
        </p>
      </div>
    </div>
  );
}

function GuestActions() {
  return (
    <>
      <ButtonLink href="/sign-in" variant="ghost">
        Ingresar
      </ButtonLink>
      <ButtonLink href="/sign-up">
        <UserPlus aria-hidden />
        Crear cuenta
      </ButtonLink>
    </>
  );
}

async function HeaderActions() {
  const user = await getCurrentUser();
  if (!user) return <GuestActions />;
  return (
    <ButtonLink href="/trips">
      Ir a mis viajes
      <ArrowRight aria-hidden />
    </ButtonLink>
  );
}
