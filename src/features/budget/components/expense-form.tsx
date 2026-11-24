"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { Field, Input, Select } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/action-state";
import { useFormKey } from "@/lib/use-form-key";
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
  /** "" while nobody has paid it (an estimate). */
  paidById: string;
  participantIds: string[];
}

export interface MemberOption {
  id: string;
  name: string;
}

interface ExpenseFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  currency: string;
  activityOptions: ActivityOption[];
  /** Trip members, for "who paid" and "split among". */
  members: MemberOption[];
  initial?: Partial<ExpenseFormValues>;
  submitLabel: string;
}

export function ExpenseForm({ action, currency, activityOptions, members, initial, submitLabel }: ExpenseFormProps) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: Exclude<keyof ExpenseFormValues, "participantIds">) =>
    submittedValue(state, field) ?? initial?.[field] ?? "";
  // After an error the server echoes the checked ids joined by commas; by
  // default the cost is split among everyone.
  const submittedParticipants = submittedValue(state, "participantIds");
  const participants = new Set(
    submittedParticipants !== undefined
      ? submittedParticipants.split(",").filter(Boolean)
      : (initial?.participantIds ?? members.map((member) => member.id)),
  );
  const participantsError = fieldError(state, "participantIds");
  const formKey = useFormKey(state);

  return (
    <form key={formKey} action={formAction} className="@container space-y-4" noValidate>
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
      <Field
        label="¿Quién pagó?"
        error={fieldError(state, "paidById")}
        hint="Mientras nadie lo pague es solo una estimación y no genera deudas."
      >
        {(props) => (
          <Select {...props} name="paidById" defaultValue={value("paidById")}>
            <option value="">Nadie todavía (es una estimación)</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <fieldset aria-describedby={participantsError ? "participants-error" : undefined}>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">Dividir entre</legend>
        <div className="flex flex-wrap gap-2">
          {members.map((member) => (
            <label
              key={member.id}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors select-none has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-800 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600"
            >
              <input
                type="checkbox"
                name="participantIds"
                value={member.id}
                defaultChecked={participants.has(member.id)}
                className="peer sr-only"
              />
              <Check className="hidden size-3.5 peer-checked:block" aria-hidden />
              {member.name}
            </label>
          ))}
        </div>
        {participantsError ? (
          <p id="participants-error" className="mt-1.5 text-xs text-red-600">
            {participantsError}
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-slate-500">En partes iguales entre quienes marques.</p>
        )}
      </fieldset>
      <SubmitButton className="w-full" pendingText="Guardando…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
