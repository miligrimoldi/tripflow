import type { ReactNode } from "react";
import { requireUser } from "@/server/auth/session";

/**
 * Renders its children only for signed-in users (redirects otherwise).
 * Must be placed inside a <Suspense> boundary because it reads the request.
 */
export async function RequireUser({ children, returnTo }: { children: ReactNode; returnTo?: string }) {
  await requireUser(returnTo);
  return children;
}
