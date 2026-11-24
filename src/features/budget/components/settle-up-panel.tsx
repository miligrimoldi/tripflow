import { ArrowRight, Scale, Undo2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardHeading } from "@/components/ui/card";
import { ConfirmAction } from "@/components/ui/confirm-action";
import { cn } from "@/lib/cn";
import { formatDateTimeShort } from "@/lib/format";
import type { MemberBalance } from "@/server/budget/balances";
import type { SettleUpOverview } from "@/server/budget/settle-up.service";
import { centsToInput, formatMoney, type Currency } from "@/server/shared/money";
import { deleteSettlementAction } from "../actions";
import type { MemberOption } from "./expense-form";
import { RecordPaymentForm, SettleTransferButton } from "./settle-up-controls";

interface SettleUpPanelProps {
  tripId: string;
  overview: SettleUpOverview;
  currency: Currency;
  /** Current members, for recording payments. */
  members: MemberOption[];
  canManage: boolean;
}

/** "Splitwise" for the trip: balances, the fewest transfers to settle, and payments made. */
export function SettleUpPanel({ tripId, overview, currency, members, canManage }: SettleUpPanelProps) {
  const money = (cents: number) => formatMoney(cents, currency);
  const names = new Map(overview.members.map((m) => [m.person.id, m.person.name]));
  const hasActivity = overview.members.some((m) => m.paidCents > 0) || overview.settlements.length > 0;

  return (
    <Card className="overflow-hidden">
      <div className="p-6 pb-4">
        <CardHeading
          icon={Scale}
          tone="emerald"
          title="Cuentas del grupo"
          description="Quién puso plata, cuánto le toca a cada uno y cómo quedar a mano."
        />
      </div>

      {!hasActivity ? (
        <p className="px-6 pb-6 text-sm text-slate-500">
          Cuando cargues un gasto con <span className="font-medium text-slate-700">quién pagó</span>, acá vas a ver
          quién le debe a quién.
        </p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {overview.members.map((balance) => (
              <BalanceRow key={balance.person.id} balance={balance} money={money} />
            ))}
          </ul>

          <section aria-labelledby="settle-title" className="space-y-3 p-6">
            <h3 id="settle-title" className="text-sm font-semibold text-slate-900">
              Para quedar a mano
            </h3>
            {overview.transfers.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                Están todos a mano.
              </p>
            ) : (
              <ul className="space-y-2">
                {overview.transfers.map((transfer) => (
                  <li
                    key={`${transfer.fromId}-${transfer.toId}`}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-sand-100 px-4 py-3"
                  >
                    <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{names.get(transfer.fromId)}</span>
                      <ArrowRight className="size-4 text-slate-400" aria-label="le paga a" />
                      <span className="font-semibold text-slate-900">{names.get(transfer.toId)}</span>
                      <span className="font-display text-base font-semibold text-slate-900 tabular-nums">
                        {money(transfer.amountCents)}
                      </span>
                    </p>
                    {canManage && (
                      <SettleTransferButton
                        tripId={tripId}
                        transfer={{
                          fromId: transfer.fromId,
                          toId: transfer.toId,
                          amount: centsToInput(transfer.amountCents),
                        }}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
            {overview.transfers.length > 1 && (
              <p className="text-xs text-slate-500">
                Es la menor cantidad de transferencias posible para que nadie quede debiendo.
              </p>
            )}
            {canManage && <RecordPaymentForm tripId={tripId} members={members} currency={currency} />}
          </section>

          {overview.settlements.length > 0 && (
            <section aria-labelledby="payments-title" className="border-t border-slate-100 p-6 pt-5">
              <h3 id="payments-title" className="mb-2 text-sm font-semibold text-slate-900">
                Pagos registrados
              </h3>
              <ul className="divide-y divide-slate-100">
                {overview.settlements.map((settlement) => (
                  <li key={settlement.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                    <p className="min-w-0 flex-1 text-slate-700">
                      <span className="font-medium text-slate-900">{settlement.from.name}</span> le pagó{" "}
                      <span className="font-medium text-slate-900 tabular-nums">{money(settlement.amountCents)}</span> a{" "}
                      <span className="font-medium text-slate-900">{settlement.to.name}</span>
                      <time dateTime={settlement.createdAt.toISOString()} className="ml-2 text-xs text-slate-500">
                        {formatDateTimeShort(settlement.createdAt)}
                      </time>
                    </p>
                    {canManage && (
                      <ConfirmAction
                        action={deleteSettlementAction.bind(null, settlement.id)}
                        label="Deshacer"
                        icon={<Undo2 aria-hidden />}
                        question="¿Deshacer este pago?"
                        confirmLabel="Sí, deshacer"
                        variant="ghost"
                        size="sm"
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </Card>
  );
}

function BalanceRow({ balance, money }: { balance: MemberBalance; money: (cents: number) => string }) {
  const { person, paidCents, shareCents, balanceCents, isMember } = balance;
  const status =
    balanceCents > 0
      ? { text: `Le deben ${money(balanceCents)}`, className: "bg-emerald-50 text-emerald-800 ring-emerald-200" }
      : balanceCents < 0
        ? { text: `Debe ${money(-balanceCents)}`, className: "bg-coral-50 text-coral-700 ring-coral-200" }
        : { text: "A mano", className: "bg-slate-100 text-slate-600 ring-slate-200" };

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-6 py-3">
      <Avatar name={person.name} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-900">
          {person.name}
          {!isMember && <span className="ml-1.5 text-xs font-normal text-slate-500">(ya no está en el viaje)</span>}
        </p>
        <p className="text-xs text-slate-500 tabular-nums">
          Pagó {money(paidCents)} · le toca {money(shareCents)}
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums ring-1 ring-inset",
          status.className,
        )}
      >
        {status.text}
      </span>
    </li>
  );
}
