"use client";

import { useActionState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue, type ActionState } from "@/lib/action-state";
import { ACTIVITY_CATEGORIES, type ActivityDetails } from "@/server/activities/activity";
import { CATEGORY_META } from "../categories";

export interface DayOption {
  value: string;
  label: string;
}

interface ActivityFormProps {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  dayOptions: DayOption[];
  initial?: Partial<ActivityDetails>;
  submitLabel: string;
}

export function ActivityForm({ action, dayOptions, initial, submitLabel }: ActivityFormProps) {
  const [state, formAction] = useActionState(action, idleState);
  const value = (field: keyof ActivityDetails) => submittedValue(state, field) ?? initial?.[field] ?? "";

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormAlert state={state} />
      <Field label="¿Qué quieren hacer?" error={fieldError(state, "title")}>
        {(props) => (
          <Input {...props} name="title" placeholder="Cena en La Cabrera" defaultValue={value("title")} required />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Categoría" error={fieldError(state, "category")}>
          {(props) => (
            <Select {...props} name="category" defaultValue={value("category") || "SIGHTSEEING"}>
              {ACTIVITY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {CATEGORY_META[category].icon} {CATEGORY_META[category].label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Día" error={fieldError(state, "date")}>
          {(props) => (
            <Select {...props} name="date" defaultValue={value("date")}>
              <option value="">💡 Guardar como idea</option>
              {dayOptions.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hora (opcional)" error={fieldError(state, "startTime")}>
          {(props) => <Input {...props} name="startTime" type="time" defaultValue={value("startTime")} />}
        </Field>
        <Field label="Ubicación (opcional)" error={fieldError(state, "location")}>
          {(props) => <Input {...props} name="location" placeholder="Palermo" defaultValue={value("location")} />}
        </Field>
      </div>
      <Field label="Link (opcional)" error={fieldError(state, "url")}>
        {(props) => <Input {...props} name="url" type="url" placeholder="https://…" defaultValue={value("url")} />}
      </Field>
      <Field label="Notas (opcional)" error={fieldError(state, "notes")}>
        {(props) => (
          <Textarea
            {...props}
            name="notes"
            rows={2}
            placeholder="Reservar con anticipación, precio aprox…"
            defaultValue={value("notes")}
          />
        )}
      </Field>
      <SubmitButton className="w-full" pendingText="Guardando…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}
