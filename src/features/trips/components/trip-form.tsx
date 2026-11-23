"use client";

import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/action-state";
import type { TripDetails } from "@/server/trips/trip";

interface TripFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: TripDetails;
  submitLabel: string;
}

export function TripForm({ action, initial, submitLabel }: TripFormProps) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: keyof TripDetails) => submittedValue(state, field) ?? initial?.[field] ?? "";

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormAlert state={state} />
      <Field label="Nombre del viaje" error={fieldError(state, "name")}>
        {(props) => (
          <Input {...props} name="name" placeholder="Vacaciones de invierno" defaultValue={value("name")} required />
        )}
      </Field>
      <Field label="Destino" error={fieldError(state, "destination")}>
        {(props) => (
          <Input {...props} name="destination" placeholder="Bariloche, Argentina" defaultValue={value("destination")} />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desde" error={fieldError(state, "startDate")}>
          {(props) => <Input {...props} name="startDate" type="date" defaultValue={value("startDate")} required />}
        </Field>
        <Field label="Hasta" error={fieldError(state, "endDate")}>
          {(props) => <Input {...props} name="endDate" type="date" defaultValue={value("endDate")} required />}
        </Field>
      </div>
      <Field label="Descripción (opcional)" error={fieldError(state, "description")}>
        {(props) => (
          <Textarea
            {...props}
            name="description"
            rows={3}
            placeholder="¿Qué tienen en mente para este viaje?"
            defaultValue={value("description")}
          />
        )}
      </Field>
      <SubmitButton pendingText="Guardando…">{submitLabel}</SubmitButton>
    </form>
  );
}
