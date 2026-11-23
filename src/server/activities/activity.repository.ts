import type { DateOnly } from "../shared/date-only";
import type { Activity, ActivityDetails, NewActivity } from "./activity";

export interface ActivityRepository {
  findById(id: string): Promise<Activity | null>;
  listByTrip(tripId: string): Promise<Activity[]>;
  /** Activities of one day (or the ideas board when `date` is null), ordered by position. */
  listBySlot(tripId: string, date: DateOnly | null): Promise<Activity[]>;
  /** Position for an item appended at the end of a day / the ideas board. */
  nextPosition(tripId: string, date: DateOnly | null): Promise<number>;
  create(data: NewActivity): Promise<Activity>;
  update(id: string, data: ActivityDetails & { position: number }): Promise<Activity>;
  /** Persists a new order: `orderedIds[i]` gets position `i`. */
  setOrder(orderedIds: string[]): Promise<void>;
  delete(id: string): Promise<void>;
  /**
   * Moves every activity dated outside [start, end] back to the ideas board.
   * Used when a trip's dates change.
   */
  unscheduleOutsideRange(tripId: string, start: DateOnly, end: DateOnly): Promise<number>;
}
