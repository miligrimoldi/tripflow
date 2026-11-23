import type { Trip, TripDetails, TripSummary } from "./trip";

export interface TripRepository {
  /** Creates the trip and registers `ownerId` as its OWNER atomically. */
  createWithOwner(details: TripDetails, ownerId: string): Promise<Trip>;
  findById(id: string): Promise<Trip | null>;
  listForUser(userId: string): Promise<TripSummary[]>;
  update(id: string, details: TripDetails): Promise<Trip>;
  delete(id: string): Promise<void>;
}
