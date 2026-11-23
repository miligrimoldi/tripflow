"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue } from "@/lib/action-state";
import { signUpAction } from "../actions";

export function SignUpForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState(signUpAction, idleState);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <FormAlert state={state} />
      <Field label="Nombre" error={fieldError(state, "name")}>
        {(props) => (
          <Input {...props} name="name" autoComplete="name" defaultValue={submittedValue(state, "name")} required />
        )}
      </Field>
      <Field label="Email" error={fieldError(state, "email")}>
        {(props) => (
          <Input
            {...props}
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={submittedValue(state, "email")}
            required
          />
        )}
      </Field>
      <Field label="Contraseña" error={fieldError(state, "password")} hint="Mínimo 8 caracteres">
        {(props) => <Input {...props} name="password" type="password" autoComplete="new-password" required />}
      </Field>
      <SubmitButton className="w-full" pendingText="Creando cuenta…">
        Crear cuenta
      </SubmitButton>
    </form>
  );
}
