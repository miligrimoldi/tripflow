"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./button";

interface SubmitButtonProps extends ComponentProps<typeof Button> {
  pendingText?: string;
}

/** Submit button that disables itself while its parent form is submitting. */
export function SubmitButton({ children, pendingText, disabled, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} {...props}>
      {pending && pendingText ? pendingText : children}
    </Button>
  );
}
