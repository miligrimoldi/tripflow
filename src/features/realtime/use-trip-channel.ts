"use client";

import { useEffect, useRef, useState } from "react";
import type { TripTopic } from "@/server/realtime/trip-events";
import { parseTripEvent } from "./describe-event";

interface TripChannelOptions {
  tripId: string;
  /** False when real time isn't configured: nothing connects. */
  enabled: boolean;
  onEvent: (event: { topic: TripTopic; actorId: string }) => void;
}

/**
 * Listens to a trip's channel over WebSockets (Ably) and tracks who is
 * looking at the trip right now (presence). The SDK is loaded only here, on
 * demand, and the connection is authenticated with a token our server issues
 * to members of this trip only.
 */
export function useTripChannel({ tripId, enabled, onEvent }: TripChannelOptions): { online: Set<string> } {
  const [online, setOnline] = useState<Set<string>>(() => new Set());
  // The latest callback, without reconnecting every render.
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let close: (() => void) | undefined;

    import("ably")
      .then((Ably) => {
        if (cancelled) return;
        const client = new Ably.Realtime({
          authUrl: `/api/realtime/token?tripId=${encodeURIComponent(tripId)}`,
          closeOnUnload: true,
        });
        close = () => client.close();
        const channel = client.channels.get(`trip:${tripId}`);

        channel.subscribe("changed", (message) => {
          const event = parseTripEvent(message.data);
          if (event) onEventRef.current(event);
        });

        const refreshPresence = () =>
          channel.presence
            .get()
            .then((members) => !cancelled && setOnline(new Set(members.map((member) => member.clientId))))
            .catch(() => {});
        channel.presence.subscribe(refreshPresence);
        channel.presence.enter().then(refreshPresence, (error: unknown) => {
          console.warn("[realtime] could not join the trip's presence", error);
        });
      })
      .catch((error: unknown) => console.warn("[realtime] could not connect", error));

    return () => {
      cancelled = true;
      close?.();
    };
  }, [tripId, enabled]);

  return { online };
}
