import "server-only";
import { unstable_rethrow } from "next/navigation";
import { AppError, ValidationError } from "@/server/shared/errors";
import type { ActionState } from "./action-state";

/** Converts FormData into a plain object of strings (files are ignored). */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) values[key] = value;
  }
  return values;
}

/**
 * Runs a server action body and maps domain errors to an {@link ActionState}.
 *
 * Keeps every action free of try/catch boilerplate and guarantees that
 * unexpected errors never leak internal details to the browser.
 * Navigation signals (`redirect`, `notFound`) are re-thrown untouched.
 */
export async function runAction(
  body: () => Promise<ActionState | void>,
  submitted?: Record<string, string>,
): Promise<ActionState> {
  try {
    return (await body()) ?? { status: "success" };
  } catch (error) {
    unstable_rethrow(error);

    if (error instanceof ValidationError) {
      return { status: "error", message: error.message, fieldErrors: error.fieldErrors, values: submitted };
    }
    if (error instanceof AppError) {
      return { status: "error", message: error.message, values: submitted };
    }

    console.error("[server action] unexpected error", error);
    return { status: "error", message: "Algo salió mal. Intentá de nuevo.", values: submitted };
  }
}
