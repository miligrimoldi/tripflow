import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/card";
import { updateActivityAction } from "@/features/activities/actions";
import { ActivityForm } from "@/features/activities/components/activity-form";
import { toDayOptions } from "@/features/activities/day-options";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { activityService, tripService } from "@/server/container";
import { hasPermission } from "@/server/members/member";

export const metadata: Metadata = { title: "Editar actividad" };

type Props = PageProps<"/trips/[tripId]/activities/[activityId]/edit">;

export default function EditActivityPage({ params }: Props) {
  return (
    <div className="mx-auto max-w-xl">
      <Suspense fallback={<Skeleton className="h-[32rem]" />}>
        <EditActivity params={params} />
      </Suspense>
    </div>
  );
}

async function EditActivity({ params }: Pick<Props, "params">) {
  const { tripId, activityId } = await params;
  const user = await requireUser();
  const [{ trip, role }, activity] = await orNotFound(
    Promise.all([tripService.get(user.id, tripId), activityService.get(user.id, activityId)]),
  );
  if (activity.tripId !== trip.id || !hasPermission(role, "activity:manage")) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/trips/${trip.id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← {trip.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Editar actividad</h1>
      </div>
      <Card className="p-6">
        <ActivityForm
          action={updateActivityAction.bind(null, activity.id)}
          dayOptions={toDayOptions(trip)}
          initial={activity}
          submitLabel="Guardar cambios"
        />
      </Card>
    </div>
  );
}
