import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/server/env";
import { prisma } from "@/server/infrastructure/prisma/client";

export const MIN_PASSWORD_LENGTH = 8;

/** Whether "Continuar con Google" is configured on this server. */
export const googleSignInEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    autoSignIn: true,
  },
  socialProviders: googleSignInEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          // Always show the account chooser, so a shared computer doesn't
          // silently sign in with whoever used Google last.
          prompt: "select_account",
        },
      }
    : undefined,
  // Account linking keeps Better Auth's safe default: a Google sign-in is
  // only linked to an existing email/password account if that account's
  // email was verified. Otherwise, someone could sign up first with another
  // person's email and get their Google identity attached to it.
  // Lets server actions set the session cookie (must be the last plugin).
  plugins: [nextCookies()],
});
