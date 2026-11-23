"use client";

import { useActionState } from "react";
import { FormAlert } from "@/components/ui/form-alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { idleState } from "@/lib/action-state";
import { acceptInvitationAction } from "../actions";

export function JoinTripForm({ token }: { token: string }) {
  const [state, action] = useActionState(() => acceptInvitationAction(token), idleState);

  return (
    <form action={action} className="space-y-3">
      <FormAlert state={state} />
      <SubmitButton className="w-full" pendingText="Uniéndote…">
        Unirme al viaje
      </SubmitButton>
    </form>
  );
}
