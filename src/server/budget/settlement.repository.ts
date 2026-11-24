import type { NewSettlement, Settlement } from "./settlement";

export interface SettlementRepository {
  findById(id: string): Promise<Settlement | null>;
  /** Most recent first. */
  listByTrip(tripId: string): Promise<Settlement[]>;
  create(data: NewSettlement): Promise<Settlement>;
  delete(id: string): Promise<void>;
}
