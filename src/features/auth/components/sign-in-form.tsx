"use client";

import { useActionState } from "react";
import { Field, Input } from "@/components/ui/field";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { fieldError, idleState, submittedValue } from "@/lib/action-state";
import { signInAction } from "../actions";

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action] = useActionState(signInAction, idleState);

  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
      <FormAlert state={state} />
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
      <Field label="Contraseña" error={fieldError(state, "password")}>
        {(props) => <Input {...props} name="password" type="password" autoComplete="current-password" required />}
      </Field>
      <SubmitButton className="w-full" pendingText="Ingresando…">
        Ingresar
      </SubmitButton>
    </form>
  );
}
