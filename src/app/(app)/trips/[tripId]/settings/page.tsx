import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Skeleton } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { leaveTripAction } from "@/features/members/actions";
import { InviteLinkPanel } from "@/features/members/components/invite-link-panel";
import { MemberList } from "@/features/members/components/member-list";
import { deleteTripAction, updateTripAction } from "@/features/trips/actions";
import { TripForm } from "@/features/trips/components/trip-form";
import { TripHeader } from "@/features/trips/components/trip-header";
import { tripMetadata } from "@/features/trips/metadata";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { membershipService, tripService } from "@/server/container";
import { absoluteUrl } from "@/server/env";
import { hasPermission } from "@/server/members/member";

const expiryFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });

export async function generateMetadata({ params }: PageProps<"/trips/[tripId]/settings">): Promise<Metadata> {
  return tripMetadata((await params).tripId, "Grupo y ajustes");
}

export default function TripSettingsPage({ params }: PageProps<"/trips/[tripId]/settings">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <TripSettings params={params} />
    </Suspense>
  );
}

async function TripSettings({ params }: Pick<PageProps<"/trips/[tripId]/settings">, "params">) {
  const { tripId } = await params;
  const user = await requireUser(`/trips/${tripId}/settings`);
  const [{ trip, role }, members] = await orNotFound(
    Promise.all([tripService.get(user.id, tripId), membershipService.listMembers(user.id, tripId)]),
  );

  const canInvite = hasPermission(role, "member:invite");
  const invitation = canInvite ? await membershipService.getActiveInvitation(user.id, tripId) : null;

  return (
    <div className="space-y-8">
      <TripHeader trip={trip} members={members} active="settings" />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-semibold text-slate-900">Integrantes ({members.length})</h2>
            <MemberList
              tripId={trip.id}
              members={members}
              currentUserId={user.id}
              canRemove={hasPermission(role, "member:remove")}
            />
          </Card>

          {canInvite && (
            <Card className="p-6">
              <h2 className="mb-3 font-semibold text-slate-900">Invitar al viaje</h2>
              <InviteLinkPanel
                tripId={trip.id}
                inviteUrl={invitation ? absoluteUrl(`/invite/${invitation.token}`) : null}
                expiresLabel={invitation ? expiryFormat.format(invitation.expiresAt) : null}
              />
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {hasPermission(role, "trip:edit") && (
            <Card className="p-6">
              <h2 className="mb-1 font-semibold text-slate-900">Datos del viaje</h2>
              <p className="mb-4 text-xs text-slate-500">
                Si acortás el viaje, las actividades de los días que se quitan vuelven a Ideas.
              </p>
              <TripForm action={updateTripAction.bind(null, trip.id)} initial={trip} submitLabel="Guardar cambios" />
            </Card>
          )}

          <Card className="border-red-200 p-6">
            <h2 className="font-semibold text-red-700">Zona de peligro</h2>
            {hasPermission(role, "trip:delete") ? (
              <>
                <p className="mt-1 mb-4 text-sm text-slate-600">
                  Eliminar el viaje borra el itinerario y las ideas para todo el grupo. No se puede deshacer.
                </p>
                <ConfirmAction
                  action={deleteTripAction.bind(null, trip.id)}
                  label="Eliminar viaje"
                  confirmLabel="Sí, eliminar"
                  question="¿Seguro?"
                />
              </>
            ) : (
              <>
                <p className="mt-1 mb-4 text-sm text-slate-600">
                  Si abandonás el viaje vas a dejar de verlo. Tus actividades quedan para el grupo.
                </p>
                <ConfirmAction
                  action={leaveTripAction.bind(null, trip.id)}
                  label="Abandonar viaje"
                  confirmLabel="Sí, abandonar"
                  question="¿Seguro?"
                />
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
