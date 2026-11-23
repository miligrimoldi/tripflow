import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { getCurrentUser } from "@/server/auth/session";

const features = [
  {
    icon: "🗓️",
    title: "Itinerario día por día",
    text: "Cada día del viaje tiene su lista de actividades, con horarios y orden.",
  },
  {
    icon: "💡",
    title: "Tablero de ideas",
    text: "Guardá restaurantes, excursiones o lugares aunque todavía no sepan qué día ir.",
  },
  {
    icon: "👥",
    title: "Planificación en grupo",
    text: "Invitá con un link y que todos puedan sumar y organizar actividades.",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Suspense fallback={<GuestActions />}>
            <HeaderActions />
          </Suspense>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center px-4 pt-16 pb-24 text-center sm:px-6">
        <p className="rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          Chau planes perdidos en el grupo de WhatsApp 👋
        </p>
        <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-balance text-slate-900 sm:text-6xl">
          Planifiquen el viaje <span className="text-brand-600">juntos</span>, en un solo lugar
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-slate-600">
          TripFlow reúne el itinerario, las ideas y las actividades de tu viaje para que amigos, parejas y familias
          organicen todo en conjunto.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/sign-up" className="h-12 px-6 text-base">
            Empezar gratis
          </ButtonLink>
          <ButtonLink href="/sign-in" variant="secondary" className="h-12 px-6 text-base">
            Ya tengo cuenta
          </ButtonLink>
        </div>

        <section className="mt-24 grid w-full gap-6 text-left sm:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <span className="text-3xl" aria-hidden>
                {feature.icon}
              </span>
              <h2 className="mt-4 font-semibold text-slate-900">{feature.title}</h2>
              <p className="mt-2 text-sm text-slate-600">{feature.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

function GuestActions() {
  return (
    <>
      <ButtonLink href="/sign-in" variant="ghost">
        Ingresar
      </ButtonLink>
      <ButtonLink href="/sign-up">Crear cuenta</ButtonLink>
    </>
  );
}

async function HeaderActions() {
  const user = await getCurrentUser();
  if (!user) return <GuestActions />;
  return <ButtonLink href="/trips">Ir a mis viajes</ButtonLink>;
}
