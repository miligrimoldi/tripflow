import "server-only";
import * as Ably from "ably";
import {
  tripChannel,
  type RealtimeTokenIssuer,
  type TripEvent,
  type TripEventPublisher,
} from "@/server/realtime/trip-events";

/** Tokens are short-lived; the browser's SDK asks for a new one before it expires. */
const TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Real time over Ably (managed WebSockets). The server publishes through
 * its REST API, so it works from serverless functions; browsers hold the
 * WebSocket connections, authenticated with tokens limited to one trip.
 */
export class AblyRealtime implements TripEventPublisher, RealtimeTokenIssuer {
  private readonly client: Ably.Rest;

  constructor(apiKey: string) {
    this.client = new Ably.Rest({ key: apiKey });
  }

  async publish({ tripId, topic, actorId }: TripEvent): Promise<void> {
    try {
      await this.client.channels.get(tripChannel(tripId)).publish("changed", { topic, actorId });
    } catch (error) {
      // Real time is a nicety: the change itself is already saved.
      console.warn("[realtime] could not publish a trip event", error);
    }
  }

  /**
   * A token request signed with our key, valid for one trip's channel only
   * (to listen and to show presence, never to publish) and bound to the
   * user's id, so presence tells who is connected.
   */
  tokenFor(userId: string, tripId: string): Promise<Ably.TokenRequest> {
    return this.client.auth.createTokenRequest({
      clientId: userId,
      capability: { [tripChannel(tripId)]: ["subscribe", "presence"] },
      ttl: TOKEN_TTL_MS,
    });
  }
}
