import type { Invitation, NewInvitation } from "@/server/members/invitation";
import type { InvitationRepository } from "@/server/members/invitation.repository";
import type { Db } from "./client";

export class PrismaInvitationRepository implements InvitationRepository {
  constructor(private readonly db: Db) {}

  async replaceForTrip(data: NewInvitation): Promise<Invitation> {
    const [, invitation] = await this.db.$transaction([
      this.db.tripInvitation.deleteMany({ where: { tripId: data.tripId } }),
      this.db.tripInvitation.create({ data }),
    ]);
    return invitation;
  }

  findLatestByTrip(tripId: string): Promise<Invitation | null> {
    return this.db.tripInvitation.findFirst({
      where: { tripId },
      orderBy: { createdAt: "desc" },
    });
  }

  findByToken(token: string): Promise<Invitation | null> {
    return this.db.tripInvitation.findUnique({ where: { token } });
  }
}
