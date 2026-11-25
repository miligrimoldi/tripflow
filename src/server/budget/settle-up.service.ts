import { noTripEvents, type TripEventPublisher } from "../realtime/trip-events";
import type { MembershipRepository } from "../members/member.repository";
import type { TripAccessPolicy } from "../members/trip-access";
import { NotFoundError, ValidationError } from "../shared/errors";
import { parseInput } from "../shared/validation";
import { computeBalances, type Balances } from "./balances";
import type { ExpenseRepository } from "./expense.repository";
import { settlementSchema, type SettlementInput } from "./expense.schemas";
import type { Settlement } from "./settlement";
import type { SettlementRepository } from "./settlement.repository";

export interface SettleUpOverview extends Balances {
  /** Payments already made between members, most recent first. */
  settlements: Settlement[];
}

/**
 * "Splitwise" inside the trip: who owes whom after the expenses each member
 * paid, and the payments they make to each other to settle up.
 */
export class SettleUpService {
  constructor(
    private readonly expenses: Pick<ExpenseRepository, "listByTrip">,
    private readonly settlements: SettlementRepository,
    private readonly members: Pick<MembershipRepository, "listByTrip">,
    private readonly access: TripAccessPolicy,
    private readonly events: TripEventPublisher = noTripEvents,
  ) {}

  async getOverview(userId: string, tripId: string): Promise<SettleUpOverview> {
    await this.access.require(tripId, userId, "trip:view");
    const [members, expenses, settlements] = await Promise.all([
      this.members.listByTrip(tripId),
      this.expenses.listByTrip(tripId),
      this.settlements.listByTrip(tripId),
    ]);
    const people = members.map((member) => ({ id: member.userId, name: member.user.name }));
    return { ...computeBalances(people, expenses, settlements), settlements };
  }

  /** Records that one member paid another (all they owed, or part of it). */
  async record(userId: string, tripId: string, input: SettlementInput): Promise<Settlement> {
    await this.access.require(tripId, userId, "expense:manage");
    const { fromId, toId, amountCents } = parseInput(settlementSchema, input);

    const members = new Set((await this.members.listByTrip(tripId)).map((member) => member.userId));
    if (!members.has(fromId) || !members.has(toId)) {
      throw new ValidationError("Elegí personas del viaje", { _form: ["Elegí personas del viaje"] });
    }
    const settlement = await this.settlements.create({ tripId, fromId, toId, amountCents, createdById: userId });
    await this.events.publish({ tripId, topic: "budget", actorId: userId });
    return settlement;
  }

  /** Undoes a payment recorded by mistake. */
  async delete(userId: string, settlementId: string): Promise<void> {
    const settlement = await this.settlements.findById(settlementId);
    if (!settlement) throw new NotFoundError("Pago");
    await this.access.require(settlement.tripId, userId, "expense:manage");
    await this.settlements.delete(settlementId);
    await this.events.publish({ tripId: settlement.tripId, topic: "budget", actorId: userId });
  }
}
