import type { TripTopic } from "@/server/realtime/trip-events";

const WHAT: Record<TripTopic, string> = {
  itinerary: "actualizó el itinerario",
  budget: "actualizó el presupuesto",
  discussion: "votó o comentó una idea",
  trip: "cambió los datos del viaje",
  members: "hizo cambios en el grupo",
};

/** "Bruno actualizó el itinerario". Someone who just joined may not be in the list yet. */
export function describeTripEvent(topic: TripTopic, actorName: string | undefined): string {
  return `${actorName ?? "Alguien del grupo"} ${WHAT[topic] ?? "hizo cambios"}`;
}

/** Validates an event from the channel: it comes over the network, so it's untrusted. */
export function parseTripEvent(data: unknown): { topic: TripTopic; actorId: string } | null {
  if (typeof data !== "object" || data === null) return null;
  const { topic, actorId } = data as Record<string, unknown>;
  if (typeof actorId !== "string" || typeof topic !== "string" || !(topic in WHAT)) return null;
  return { topic: topic as TripTopic, actorId };
}
