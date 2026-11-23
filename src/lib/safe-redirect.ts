/**
 * Only allows same-origin relative paths as post-login destinations, to
 * prevent open redirects (e.g. `?callbackUrl=https://evil.com`).
 */
export function safeCallbackUrl(value: unknown, fallback = "/trips"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
