import { ForbiddenError, NotFoundError } from "../shared/errors";
import { hasPermission, type TripMember, type TripPermission } from "./member";
import type { MembershipRepository } from "./member.repository";

/**
 * Single place where trip-level authorization is decided. Every service that
 * touches trip data goes through this policy.
 */
export class TripAccessPolicy {
  constructor(private readonly members: MembershipRepository) {}

  /**
   * Returns the membership if the user may perform `permission` on the trip.
   *
   * Non-members get a NotFoundError (not Forbidden) so the API does not reveal
   * whether a trip with that id exists.
   */
  async require(tripId: string, userId: string, permission: TripPermission): Promise<TripMember> {
    const member = await this.members.find(tripId, userId);
    if (!member) throw new NotFoundError("Viaje");
    if (!hasPermission(member.role, permission)) throw new ForbiddenError();
    return member;
  }
}
