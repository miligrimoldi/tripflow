import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

/**
 * The single entry point the rest of the app uses to know who is logged in.
 * Nothing outside `server/auth` imports Better Auth directly, so swapping
 * the auth provider only touches this folder.
 *
 * Wrapped in React `cache` so it hits the database once per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const { id, name, email, image } = session.user;
  return { id, name, email, image: image ?? null };
});

/**
 * For pages and server actions that require authentication.
 * @param returnTo path to come back to after signing in.
 */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/sign-in?callbackUrl=${encodeURIComponent(returnTo)}` : "/sign-in");
  }
  return user;
}
