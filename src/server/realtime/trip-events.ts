/**
 * What part of a trip changed. Coarse on purpose: listeners refresh the
 * page's data, they don't patch it piece by piece, so they only need to know
 * that something changed and roughly what (to say "Bruno updated the budget").
 */
export const TRIP_TOPICS = ["itinerary", "budget", "discussion", "trip", "members"] as const;
export type TripTopic = (typeof TRIP_TOPICS)[number];

/** "Someone changed something in this trip". Never contains the data itself. */
export interface TripEvent {
  tripId: string;
  topic: TripTopic;
  /** Who did it, so their own screens don't announce it to them. */
  actorId: string;
}

/**
 * Port to tell everyone looking at a trip that it changed. Implementations
 * must never throw: real time is a nicety, and a failure to publish must not
 * undo or fail the change the person just made.
 */
export interface TripEventPublisher {
  publish(event: TripEvent): Promise<void>;
}

/** When real time isn't configured: changes just aren't broadcast. */
export const noTripEvents: TripEventPublisher = { publish: async () => {} };

/** The channel every member of a trip listens to. */
export function tripChannel(tripId: string): string {
  return `trip:${tripId}`;
}

/**
 * Port to issue the credential a browser uses to listen to one trip's
 * channel (and only that one). The shape is up to the provider.
 */
export interface RealtimeTokenIssuer {
  tokenFor(userId: string, tripId: string): Promise<unknown>;
}
