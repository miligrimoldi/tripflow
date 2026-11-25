"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";
import { describeTripEvent } from "../describe-event";
import { useTripChannel } from "../use-trip-channel";

interface TripLiveProps {
  tripId: string;
  currentUserId: string;
  members: { id: string; name: string }[];
  /** Real time configured on the server. */
  enabled: boolean;
}

/** Several changes in a row (dragging a few activities) trigger one refresh. */
const REFRESH_DELAY_MS = 400;
const NOTICE_MS = 4500;

/**
 * The trip's members, with who is online right now. When someone else
 * changes the trip, the page reloads its data in place and says who did what.
 */
export function TripLive({ tripId, currentUserId, members, enabled }: TripLiveProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const names = new Map(members.map((member) => [member.id, member.name]));

  const { online } = useTripChannel({
    tripId,
    enabled,
    onEvent: ({ topic, actorId }) => {
      // Our own changes are already on screen (the action refreshed the page).
      if (actorId === currentUserId) return;
      clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), REFRESH_DELAY_MS);
      setNotice(describeTripEvent(topic, names.get(actorId)));
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
    },
  });

  useEffect(
    () => () => {
      clearTimeout(refreshTimer.current);
      clearTimeout(noticeTimer.current);
    },
    [],
  );

  const othersOnline = members.filter((member) => member.id !== currentUserId && online.has(member.id));

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex -space-x-2" aria-label={`${members.length} integrantes`}>
        {members.slice(0, 6).map((member) => (
          <span key={member.id} className="relative">
            <Avatar name={member.name} className="size-9 ring-white/80" />
            {online.has(member.id) && member.id !== currentUserId && (
              <span
                aria-hidden
                className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full bg-emerald-400 ring-2 ring-white"
              />
            )}
          </span>
        ))}
        {members.length > 6 && (
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-white/25 text-xs font-semibold text-white ring-2 ring-white/80 backdrop-blur-sm">
            +{members.length - 6}
          </span>
        )}
      </div>
      {othersOnline.length > 0 && (
        <p className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white ring-1 ring-white/25 backdrop-blur-sm ring-inset">
          <span aria-hidden className="mr-1.5 inline-block size-1.5 rounded-full bg-emerald-400 align-middle" />
          {othersOnline.length === 1
            ? `${othersOnline[0].name} está viendo el viaje`
            : `${othersOnline.length} personas más están viendo el viaje`}
        </p>
      )}

      <div
        role="status"
        aria-live="polite"
        className={cn(
          "fixed bottom-5 left-1/2 z-50 -translate-x-1/2 transition-all duration-300",
          notice ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
        )}
      >
        {notice && (
          <p className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lift">
            <RefreshCw className="size-4 text-emerald-300" aria-hidden />
            {notice}
          </p>
        )}
      </div>
    </div>
  );
}
