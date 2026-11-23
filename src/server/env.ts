import "server-only";
import { z } from "zod";

/**
 * Validated server environment. Fails fast at startup with a readable message
 * instead of a cryptic error deep inside a request.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment variables:\n${details}\nSee .env.example`);
}

export const env = parsed.data;

/** Absolute URL for links shared outside the app (e.g. invitations). */
export function absoluteUrl(path: string): string {
  return new URL(path, env.BETTER_AUTH_URL).toString();
}
