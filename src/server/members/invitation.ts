export const INVITATION_TTL_DAYS = 7;

export interface Invitation {
  id: string;
  tripId: string;
  token: string;
  createdById: string;
  expiresAt: Date;
  createdAt: Date;
}

export type NewInvitation = Pick<Invitation, "tripId" | "token" | "createdById" | "expiresAt">;

export function isInvitationExpired(invitation: Pick<Invitation, "expiresAt">, now: Date): boolean {
  return invitation.expiresAt.getTime() <= now.getTime();
}

export function invitationExpiry(now: Date): Date {
  return new Date(now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
}
