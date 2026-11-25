import type { TripAccessPolicy } from "../members/trip-access";
import type { RealtimeTokenIssuer } from "./trip-events";

/** Who may listen to a trip in real time: its members, nobody else. */
export class RealtimeService {
  constructor(
    /** `null` when real time isn't configured. */
    private readonly issuer: RealtimeTokenIssuer | null,
    private readonly access: TripAccessPolicy,
  ) {}

  get enabled(): boolean {
    return this.issuer !== null;
  }

  /** A credential to subscribe to the trip's channel. Non-members get a NotFoundError. */
  async tokenFor(userId: string, tripId: string): Promise<unknown> {
    await this.access.require(tripId, userId, "trip:view");
    if (!this.issuer) return null;
    return this.issuer.tokenFor(userId, tripId);
  }
}
