"use client";

import { useActionState, useState } from "react";
import { idleState, type ActionState } from "@/lib/action-state";
import { Button } from "./button";
import { SubmitButton } from "./submit-button";

interface ConfirmActionProps {
  action: () => Promise<ActionState | void>;
  label: string;
  confirmLabel: string;
  question: string;
  variant?: "danger" | "secondary" | "ghost";
  size?: "sm" | "md";
}

/**
 * Two-step destructive action: the first click asks for confirmation inline
 * (no blocking browser dialogs), the second one submits.
 */
export function ConfirmAction({
  action,
  label,
  confirmLabel,
  question,
  variant = "danger",
  size = "md",
}: ConfirmActionProps) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(async () => (await action()) ?? idleState, idleState);

  if (!confirming) {
    return (
      <Button type="button" variant={variant} size={size} onClick={() => setConfirming(true)}>
        {label}
      </Button>
    );
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-slate-700">{question}</span>
      <SubmitButton variant="danger" size={size} pendingText="…">
        {confirmLabel}
      </SubmitButton>
      <Button type="button" variant="ghost" size={size} onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
      {state.status === "error" && (
        <p role="alert" className="w-full text-sm text-red-600">
          {state.message}
        </p>
      )}
    </form>
  );
}
