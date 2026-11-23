"use server";

import { redirect } from "next/navigation";
import type { ActionState } from "@/lib/action-state";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { formValues, runAction } from "@/lib/server-action";
import { signInWithEmail, signOut, signUpWithEmail } from "@/server/auth/credentials";

/** Values to re-fill the form after an error. Never echo the password back. */
function withoutPassword(values: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(values).filter(([key]) => key !== "password"));
}

export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const state = await runAction(() => signUpWithEmail(values), withoutPassword(values));
  if (state.status === "success") redirect(safeCallbackUrl(values.callbackUrl));
  return state;
}

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const values = formValues(formData);
  const state = await runAction(() => signInWithEmail(values), withoutPassword(values));
  if (state.status === "success") redirect(safeCallbackUrl(values.callbackUrl));
  return state;
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/");
}
