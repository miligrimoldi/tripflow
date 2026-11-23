import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { JoinTripForm } from "@/features/members/components/join-trip-form";
import { formatDateRange } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { membershipService } from "@/server/container";

export const metadata: Metadata = { title: "Invitación a un viaje" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-md p-8 text-center">
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Invitation params={params} />
        </Suspense>
      </Card>
    </main>
  );
}

async function Invitation({ params }: Pick<PageProps<"/invite/[token]">, "params">) {
  const { token } = await params;
  const user = await requireUser(`/invite/${token}`);
  const preview = await orNotFound(membershipService.previewInvitation(user.id, token));

  if (preview.alreadyMember) redirect(`/trips/${preview.trip.id}`);

  if (preview.expired) {
    return (
      <div className="space-y-4">
        <span className="text-4xl" aria-hidden>
          ⌛
        </span>
        <h1 className="text-xl font-bold text-slate-900">Esta invitación expiró</h1>
        <p className="text-sm text-slate-600">Pedile un nuevo link a quien organiza «{preview.trip.name}».</p>
        <ButtonLink href="/trips" variant="secondary">
          Ir a mis viajes
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <span className="text-4xl" aria-hidden>
        🎒
      </span>
      <div>
        <p className="text-sm text-slate-600">Te invitaron a planificar</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{preview.trip.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          📍 {preview.trip.destination} · 🗓️ {formatDateRange(preview.trip.startDate, preview.trip.endDate)}
        </p>
      </div>
      <JoinTripForm token={token} />
    </div>
  );
}
