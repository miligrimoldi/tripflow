import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import { TripCard } from "@/features/trips/components/trip-card";
import { requireUser } from "@/server/auth/session";
import { tripService } from "@/server/container";

export const metadata: Metadata = { title: "Mis viajes" };

export default function TripsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mis viajes</h1>
          <p className="text-sm text-slate-600">Los viajes que organizás o en los que te invitaron a colaborar.</p>
        </div>
        <ButtonLink href="/trips/new">+ Nuevo viaje</ButtonLink>
      </div>
      <Suspense fallback={<TripGridSkeleton />}>
        <TripList />
      </Suspense>
    </div>
  );
}

async function TripList() {
  const user = await requireUser();
  const trips = await tripService.listForUser(user.id);

  if (trips.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 px-6 py-16 text-center">
        <span className="text-5xl" aria-hidden>
          🧳
        </span>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Todavía no tenés viajes</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
          Creá tu primer viaje e invitá a quienes viajan con vos para planificarlo juntos.
        </p>
        <ButtonLink href="/trips/new" className="mt-6">
          Crear mi primer viaje
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}

function TripGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  );
}
