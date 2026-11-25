import "server-only";
import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { z } from "zod";
import { BusinessRuleError } from "../shared/errors";
import { requiredTextSchema } from "../shared/schemas";
import { parseInput, type RawInput } from "../shared/validation";
import { auth, MIN_PASSWORD_LENGTH } from "./auth";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Ingresá un email válido"));

const signUpSchema = z.object({
  name: requiredTextSchema("El nombre", 60),
  email: emailSchema,
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`)
    .max(128, "La contraseña es demasiado larga"),
});

const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Ingresá tu contraseña"),
});

/** Translates Better Auth errors into our own error vocabulary. */
async function callAuth(operation: () => Promise<unknown>, fallbackMessage: string): Promise<void> {
  try {
    await operation();
  } catch (error) {
    if (!isAPIError(error)) throw error;
    const code = (error.body as { code?: string } | undefined)?.code;
    if (code === "USER_ALREADY_EXISTS" || code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      throw new BusinessRuleError("Ya existe una cuenta con ese email");
    }
    throw new BusinessRuleError(fallbackMessage);
  }
}

export async function signUpWithEmail(input: RawInput<typeof signUpSchema>): Promise<void> {
  const body = parseInput(signUpSchema, input);
  await callAuth(
    async () => auth.api.signUpEmail({ body, headers: await headers() }),
    "No pudimos crear la cuenta. Intentá de nuevo.",
  );
}

export async function signInWithEmail(input: RawInput<typeof signInSchema>): Promise<void> {
  const body = parseInput(signInSchema, input);
  await callAuth(
    async () => auth.api.signInEmail({ body, headers: await headers() }),
    "Email o contraseña incorrectos",
  );
}

/**
 * Starts "Continuar con Google": returns Google's consent URL. After it,
 * Better Auth's callback (/api/auth/callback/google) creates the session and
 * sends the person to `callbackPath`, or to the sign-in page with `?error=`.
 */
export async function googleSignInUrl(callbackPath: string): Promise<string> {
  const errorPath = `/sign-in?callbackUrl=${encodeURIComponent(callbackPath)}`;
  let url: string | undefined;
  await callAuth(async () => {
    ({ url } = await auth.api.signInSocial({
      body: { provider: "google", callbackURL: callbackPath, errorCallbackURL: errorPath, disableRedirect: true },
      headers: await headers(),
    }));
  }, "No pudimos conectar con Google. Intentá de nuevo.");
  if (!url) throw new BusinessRuleError("No pudimos conectar con Google. Intentá de nuevo.");
  return url;
}

export async function signOut(): Promise<void> {
  await auth.api.signOut({ headers: await headers() });
}
