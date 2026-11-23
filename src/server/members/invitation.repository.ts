import type { Invitation, NewInvitation } from "./invitation";

export interface InvitationRepository {
  /** Creates a new invite link for the trip, invalidating any previous one. */
  replaceForTrip(data: NewInvitation): Promise<Invitation>;
  findLatestByTrip(tripId: string): Promise<Invitation | null>;
  findByToken(token: string): Promise<Invitation | null>;
}
