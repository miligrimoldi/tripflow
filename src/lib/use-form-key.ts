"use client";

import { useState } from "react";
import type { ActionState } from "./action-state";

/**
 * A `key` for a form that changes with every server response.
 *
 * React resets a form after its action runs, but a reset does not re-apply
 * `defaultValue` to <select> elements nor `defaultChecked` changes, so after
 * an error they would show their first option instead of what was submitted.
 * Remounting the form with this key makes every field start from its default
 * (the submitted values) again.
 */
export function useFormKey(state: ActionState): number {
  const [seen, setSeen] = useState(state);
  const [key, setKey] = useState(0);
  if (state !== seen) {
    setSeen(state);
    setKey(key + 1);
  }
  return key;
}
