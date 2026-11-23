/**
 * Serializable result of a server action, consumed by `useActionState`.
 * Shared between server actions and client forms (types only, no server code).
 */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message?: string }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
      /** Submitted values, so the form can be re-filled after an error. */
      values?: Record<string, string>;
    };

export const idleState: ActionState = { status: "idle" };

export function fieldError(state: ActionState, field: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[field]?.[0] : undefined;
}

export function submittedValue(state: ActionState, field: string): string | undefined {
  return state.status === "error" ? state.values?.[field] : undefined;
}
