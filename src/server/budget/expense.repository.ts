import type { Expense, ExpenseDetails, NewExpense } from "./expense";

export interface ExpenseRepository {
  findById(id: string): Promise<Expense | null>;
  /** Largest first, then most recent. */
  listByTrip(tripId: string): Promise<Expense[]>;
  create(data: NewExpense): Promise<Expense>;
  update(id: string, details: ExpenseDetails): Promise<Expense>;
  delete(id: string): Promise<void>;
}
