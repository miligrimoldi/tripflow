import type { ActionState } from "@/lib/action-state";

/** Form-level message (errors without a specific field, or success notes). */
export function FormAlert({ state }: { state: ActionState }) {
  if (state.status === "idle") return null;
  if (state.status === "success" && !state.message) return null;

  const isError = state.status === "error";
  return (
    <p
      role={isError ? "alert" : "status"}
      className={
        isError
          ? "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          : "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
      }
    >
      {state.message}
    </p>
  );
}
