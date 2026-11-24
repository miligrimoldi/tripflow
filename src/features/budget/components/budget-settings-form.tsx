"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/action-state";
import { CURRENCIES } from "@/server/shared/money";
import { CURRENCY_LABELS } from "../categories";

interface BudgetSettingsFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  currency: string;
  /** Current budget as an input string ("" when there is none). */
  budget: string;
}

export function BudgetSettingsForm({ action, currency, budget }: BudgetSettingsFormProps) {
  const [state, formAction] = useActionState(action, idleState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Presupuesto total (opcional)" error={fieldError(state, "budget")}>
          {(props) => (
            <Input
              {...props}
              name="budget"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Sin límite"
              defaultValue={submittedValue(state, "budget") ?? budget}
            />
          )}
        </Field>
        <Field
          label="Moneda"
          error={fieldError(state, "currency")}
          hint="Cambiarla no convierte los montos ya cargados."
        >
          {(props) => (
            <Select {...props} name="currency" defaultValue={submittedValue(state, "currency") ?? currency}>
              {CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {CURRENCY_LABELS[code]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <SubmitButton variant="secondary" pendingText="Guardando…">
        Guardar
      </SubmitButton>
    </form>
  );
}
