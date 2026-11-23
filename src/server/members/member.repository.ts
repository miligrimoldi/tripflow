import type { MemberRole, TripMember } from "./member";

export interface MembershipRepository {
  find(tripId: string, userId: string): Promise<TripMember | null>;
  listByTrip(tripId: string): Promise<TripMember[]>;
  add(tripId: string, userId: string, role: MemberRole): Promise<void>;
  remove(tripId: string, userId: string): Promise<void>;
}
