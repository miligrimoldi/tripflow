/**
 * What to tell someone who comes back from Google with `?error=<code>`
 * (Better Auth's callback error codes, plus Google's own `access_denied`).
 * `null` when there's no error to show.
 */
export function oauthErrorMessage(code: unknown): string | null {
  if (typeof code !== "string" || code === "") return null;
  switch (code) {
    case "account_not_linked":
      return "Ya tenés una cuenta con ese email. Ingresá con tu email y contraseña.";
    case "access_denied":
      return "Cancelaste el ingreso con Google.";
    case "email_not_found":
    case "email_not_verified":
      return "Tu cuenta de Google no tiene un email verificado. Probá con otra cuenta o con tu email.";
    case "state_mismatch":
    case "please_restart_the_process":
      return "El ingreso con Google se interrumpió. Probá de nuevo.";
    default:
      return "No pudimos ingresar con Google. Probá de nuevo o usá tu email.";
  }
}
