import { BusinessRuleError, NotFoundError } from "../shared/errors";
import type { Clock, TokenGenerator } from "../shared/ports";
import type { Trip } from "../trips/trip";
import type { TripRepository } from "../trips/trip.repository";
import { invitationExpiry, isInvitationExpired, type Invitation } from "./invitation";
import type { InvitationRepository } from "./invitation.repository";
import type { TripMember } from "./member";
import type { MembershipRepository } from "./member.repository";
import type { TripAccessPolicy } from "./trip-access";

export interface InvitationPreview {
  trip: Pick<Trip, "id" | "name" | "destination" | "startDate" | "endDate">;
  expired: boolean;
  alreadyMember: boolean;
}

export class MembershipService {
  constructor(
    private readonly members: MembershipRepository,
    private readonly invitations: InvitationRepository,
    private readonly trips: Pick<TripRepository, "findById">,
    private readonly access: TripAccessPolicy,
    private readonly tokens: TokenGenerator,
    private readonly clock: Clock,
  ) {}

  async listMembers(userId: string, tripId: string): Promise<TripMember[]> {
    await this.access.require(tripId, userId, "trip:view");
    return this.members.listByTrip(tripId);
  }

  /** The trip's current invite link, if it has one that has not expired. */
  async getActiveInvitation(userId: string, tripId: string): Promise<Invitation | null> {
    await this.access.require(tripId, userId, "member:invite");
    const invitation = await this.invitations.findLatestByTrip(tripId);
    return invitation && !isInvitationExpired(invitation, this.clock.now()) ? invitation : null;
  }

  /** Generates a new invite link. Any previous link stops working. */
  async createInvitation(userId: string, tripId: string): Promise<Invitation> {
    await this.access.require(tripId, userId, "member:invite");
    return this.invitations.replaceForTrip({
      tripId,
      token: this.tokens.generate(),
      createdById: userId,
      expiresAt: invitationExpiry(this.clock.now()),
    });
  }

  async previewInvitation(userId: string, token: string): Promise<InvitationPreview> {
    const invitation = await this.invitations.findByToken(token);
    if (!invitation) throw new NotFoundError("Invitación");
    const trip = await this.trips.findById(invitation.tripId);
    if (!trip) throw new NotFoundError("Invitación");

    return {
      trip: {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        startDate: trip.startDate,
        endDate: trip.endDate,
      },
      expired: isInvitationExpired(invitation, this.clock.now()),
      alreadyMember: (await this.members.find(trip.id, userId)) !== null,
    };
  }

  /** Joins the trip as EDITOR. Idempotent for users who are already members. */
  async acceptInvitation(userId: string, token: string): Promise<{ tripId: string }> {
    const invitation = await this.invitations.findByToken(token);
    if (!invitation) throw new NotFoundError("Invitación");

    const { tripId } = invitation;
    if (await this.members.find(tripId, userId)) return { tripId };
    if (isInvitationExpired(invitation, this.clock.now())) {
      throw new BusinessRuleError("La invitación expiró. Pedile un nuevo link a quien organiza el viaje.");
    }

    await this.members.add(tripId, userId, "EDITOR");
    return { tripId };
  }

  async removeMember(userId: string, tripId: string, memberUserId: string): Promise<void> {
    await this.access.require(tripId, userId, "member:remove");
    const member = await this.members.find(tripId, memberUserId);
    if (!member) throw new NotFoundError("Integrante");
    if (member.role === "OWNER") {
      throw new BusinessRuleError("No se puede quitar a quien organiza el viaje");
    }
    await this.members.remove(tripId, memberUserId);
  }

  async leaveTrip(userId: string, tripId: string): Promise<void> {
    const member = await this.access.require(tripId, userId, "trip:view");
    if (member.role === "OWNER") {
      throw new BusinessRuleError(
        "Quien organiza el viaje no puede abandonarlo. Podés eliminarlo desde la configuración.",
      );
    }
    await this.members.remove(tripId, userId);
  }
}
