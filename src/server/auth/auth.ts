import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { env } from "@/server/env";
import { prisma } from "@/server/infrastructure/prisma/client";

export const MIN_PASSWORD_LENGTH = 8;

export const auth = betterAuth({
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: MIN_PASSWORD_LENGTH,
    autoSignIn: true,
  },
  // Lets server actions set the session cookie (must be the last plugin).
  plugins: [nextCookies()],
});
