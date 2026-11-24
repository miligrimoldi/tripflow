"use client";

import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/action-state";
import { EXPENSE_CATEGORIES } from "@/server/budget/expense";
import { EXPENSE_CATEGORY_META } from "../categories";

export interface ActivityOption {
  value: string;
  label: string;
}

export interface ExpenseFormValues {
  description: string;
  category: string;
  /** As typed in the input, e.g. "15000" or "1234,50". */
  amount: string;
  activityId: string;
}

interface ExpenseFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  currency: string;
  activityOptions: ActivityOption[];
  initial?: Partial<ExpenseFormValues>;
  submitLabel: string;
}

export function ExpenseForm({ action, currency, activityOptions, initial, submitLabel }: ExpenseFormProps) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: keyof ExpenseFormValues) => submittedValue(state, field) ?? initial?.[field] ?? "";

  return (
    <form action={formAction} className="@container space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="¿En qué?" error={fieldError(state, "description")}>
        {(props) => (
          <Input
            {...props}
            name="description"
            placeholder="Cabaña 3 noches, pasajes, nafta…"
            defaultValue={value("description")}
            required
          />
        )}
      </Field>
      <div className="grid gap-4 @md:grid-cols-2">
        <Field label={`Monto estimado (${currency})`} error={fieldError(state, "amount")} hint="Ej.: 15.000 o 1.234,50">
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
        <Field label="Categoría" error={fieldError(state, "category")}>
          {(props) => (
            <Select {...props} name="category" defaultValue={value("category") || "ACCOMMODATION"}>
              {EXPENSE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EXPENSE_CATEGORY_META[category].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      {activityOptions.length > 0 && (
        <Field
          label="Actividad (opcional)"
          error={fieldError(state, "activityId")}
          hint="Si es el costo de una actividad, se va a ver en el itinerario."
        >
          {(props) => (
            <Select {...props} name="activityId" defaultValue={value("activityId")}>
              <option value="">— Ninguna (gasto general) —</option>
              {activityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
      <SubmitButton className="w-full" pendingText="Guardando…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
