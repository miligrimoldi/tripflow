import { Backpack, CalendarDays, Hourglass, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { Card, Skeleton } from "@/components/ui/card";
import { IconTile } from "@/components/ui/icon-tile";
import { JoinTripForm } from "@/features/members/components/join-trip-form";
import { formatDateRange } from "@/lib/format";
import { orNotFound } from "@/lib/page-data";
import { requireUser } from "@/server/auth/session";
import { membershipService } from "@/server/container";

export const metadata: Metadata = { title: "Invitación a un viaje" };

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/4 size-96 rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute right-1/4 -bottom-32 size-96 rounded-full bg-coral-100/80 blur-3xl" />
      </div>
      <div className="relative mb-8">
        <Logo />
      </div>
      <Card className="relative w-full max-w-md p-8 text-center shadow-lift">
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
      <div className="flex flex-col items-center space-y-4">
        <IconTile icon={Hourglass} tone="amber" size="lg" />
        <h1 className="text-2xl font-bold text-slate-900">Esta invitación expiró</h1>
        <p className="text-sm text-slate-600">Pedile un nuevo link a quien organiza «{preview.trip.name}».</p>
        <ButtonLink href="/trips" variant="secondary">
          Ir a mis viajes
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-6">
      <IconTile icon={Backpack} tone="brand" size="lg" />
      <div>
        <p className="text-sm font-medium text-slate-500">Te invitaron a planificar</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{preview.trip.name}</h1>
        <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4 text-slate-400" aria-hidden />
            {preview.trip.destination}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-4 text-slate-400" aria-hidden />
            {formatDateRange(preview.trip.startDate, preview.trip.endDate)}
          </span>
        </p>
      </div>
      <div className="w-full">
        <JoinTripForm token={token} />
      </div>
    </div>
  );
}
