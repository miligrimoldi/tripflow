"use client";

import { ArrowRight, Check, HandCoins } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue } from "@/lib/action-state";
import { useFormKey } from "@/lib/use-form-key";
import { recordSettlementAction, settleTransferAction } from "../actions";
import type { MemberOption } from "./expense-form";

/** "Marcar como pagado" for a suggested transfer: records the whole amount. */
export function SettleTransferButton({
  tripId,
  transfer,
}: {
  tripId: string;
  transfer: { fromId: string; toId: string; amount: string };
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await settleTransferAction(tripId, transfer);
            setError(result.status === "error" ? result.message : null);
          })
        }
      >
        <Check aria-hidden />
        {pending ? "Guardando…" : "Marcar como pagado"}
      </Button>
      {error && (
        <p role="alert" className="w-full text-xs text-red-600">
          {error}
        </p>
      )}
    </>
  );
}

/** For partial payments or ones that don't match a suggestion. */
export function RecordPaymentForm({
  tripId,
  members,
  currency,
}: {
  tripId: string;
  members: MemberOption[];
  currency: string;
}) {
  const [state, action] = useActionState(recordSettlementAction.bind(null, tripId), idleState);
  const value = (field: string) => submittedValue(state, field) ?? "";
  const formKey = useFormKey(state);

  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50/60 open:bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 hover:text-slate-900">
        <HandCoins className="size-4 text-slate-400" aria-hidden />
        Registrar otro pago
        <span className="text-xs font-normal text-slate-500">(por ejemplo, una parte de lo que debe)</span>
      </summary>
      <form key={formKey} action={action} className="@container space-y-3 border-t border-slate-100 p-4" noValidate>
        <FormAlert state={state} />
        <div className="grid items-start gap-3 @md:grid-cols-[1fr_auto_1fr]">
          <Field label="Quién pagó" error={fieldError(state, "fromId")}>
            {(props) => (
              <Select {...props} name="fromId" defaultValue={value("fromId")} required>
                <option value="" disabled>
                  Elegí…
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <ArrowRight className="mt-9 hidden size-4 text-slate-400 @md:block" aria-hidden />
          <Field label="A quién" error={fieldError(state, "toId")}>
            {(props) => (
              <Select {...props} name="toId" defaultValue={value("toId")} required>
                <option value="" disabled>
                  Elegí…
                </option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label={`Monto (${currency})`} error={fieldError(state, "amount")} hint="Ej.: 15.000 o 1.234,50">
          {(props) => (
            <Input
              {...props}
              name="amount"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              defaultValue={value("amount")}
              required
            />
          )}
        </Field>
        <SubmitButton pendingText="Guardando…">Registrar pago</SubmitButton>
      </form>
    </details>
  );
}
