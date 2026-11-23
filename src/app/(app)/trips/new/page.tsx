import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/card";
import { RequireUser } from "@/components/require-user";
import { createTripAction } from "@/features/trips/actions";
import { TripForm } from "@/features/trips/components/trip-form";

export const metadata: Metadata = { title: "Nuevo viaje" };

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link href="/trips" className="text-sm text-slate-500 hover:text-slate-700">
          ← Mis viajes
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Nuevo viaje</h1>
        <p className="text-sm text-slate-600">Después vas a poder invitar a quienes viajan con vos.</p>
      </div>
      <Card className="p-6">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <RequireUser returnTo="/trips/new">
            <TripForm action={createTripAction} submitLabel="Crear viaje" />
          </RequireUser>
        </Suspense>
      </Card>
    </div>
  );
}
