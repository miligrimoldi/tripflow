import { Luggage, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TripCard } from "@/features/trips/components/trip-card";
import { requireUser } from "@/server/auth/session";
import { tripService } from "@/server/container";

export const metadata: Metadata = { title: "Mis viajes" };

export default function TripsPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Mis viajes</h1>
          <p className="mt-1 text-slate-600">Los que organizás y en los que te invitaron a colaborar.</p>
        </div>
        <ButtonLink href="/trips/new">
          <Plus aria-hidden />
          Nuevo viaje
        </ButtonLink>
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
      <EmptyState
        icon={Luggage}
        title="Todavía no tenés viajes"
        action={
          <ButtonLink href="/trips/new">
            <Plus aria-hidden />
            Crear mi primer viaje
          </ButtonLink>
        }
      >
        Creá tu primer viaje e invitá a quienes viajan con vos para planificarlo juntos.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
      <Link
        href="/trips/new"
        className="group flex min-h-56 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300/80 text-slate-500 transition hover:border-brand-400 hover:bg-brand-50/50 hover:text-brand-700"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white shadow-soft ring-1 ring-slate-200/70 transition group-hover:scale-105">
          <Plus className="size-6" aria-hidden />
        </span>
        <span className="font-medium">Planificar otro viaje</span>
      </Link>
    </div>
  );
}

function TripGridSkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-60 rounded-2xl" />
      ))}
    </div>
  );
}
