import type { Person } from "./expense";

/** Money one member gave another to settle up ("Bruno le pagó $15.000 a Ana"). */
export interface Settlement {
  id: string;
  tripId: string;
  from: Person;
  to: Person;
  amountCents: number;
  createdBy: Person;
  createdAt: Date;
}

export interface NewSettlement {
  tripId: string;
  fromId: string;
  toId: string;
  amountCents: number;
  createdById: string;
}
