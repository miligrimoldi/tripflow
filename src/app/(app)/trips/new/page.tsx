import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink } from "@/components/back-link";
import { Card, CardHeading, Skeleton } from "@/components/ui/card";
import { RequireUser } from "@/components/require-user";
import { createTripAction } from "@/features/trips/actions";
import { TripForm } from "@/features/trips/components/trip-form";

export const metadata: Metadata = { title: "Nuevo viaje" };

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-3">
        <BackLink href="/trips">Mis viajes</BackLink>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Nuevo viaje</h1>
      </div>
      <Card className="p-6 sm:p-8">
        <CardHeading
          icon={Compass}
          title="¿A dónde van?"
          description="Después vas a poder invitar a quienes viajan con vos."
        />
        <Suspense fallback={<Skeleton className="h-96" />}>
          <RequireUser returnTo="/trips/new">
            <TripForm action={createTripAction} submitLabel="Crear viaje" />
          </RequireUser>
        </Suspense>
      </Card>
    </div>
  );
}
