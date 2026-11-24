import { z } from "zod";
import { isDateOnly } from "./date-only";

/** Trims strings and turns blank values (common in HTML forms) into `null`. */
const blankToNull = (value: unknown) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

/**
 * Optional field: callers may omit it or send a blank string; the parsed
 * value is always `T | null` (never `undefined` or `""`).
 */
const blankable = <T extends z.ZodType>(inner: T) =>
  z
    .preprocess(blankToNull, inner.nullable())
    .optional()
    .transform((value): z.output<T> | null => value ?? null);

export const requiredTextSchema = (label: string, max: number) =>
  z
    .string({ error: `${label} es obligatorio` })
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(max, `${label} puede tener como máximo ${max} caracteres`);

export const optionalTextSchema = (max: number) =>
  blankable(z.string().max(max, `Puede tener como máximo ${max} caracteres`));

export const dateOnlySchema = (label: string) =>
  z.string({ error: `Ingresá ${label}` }).refine((value) => isDateOnly(value), `Ingresá ${label} con formato válido`);

export const optionalDateOnlySchema = blankable(z.string().refine((value) => isDateOnly(value), "Fecha inválida"));

export const optionalTimeSchema = blankable(
  z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresá una hora válida (HH:mm)"),
);

/** Optional coordinate component (latitude or longitude) within ±`limit` degrees. */
export const optionalCoordinateSchema = (limit: number) =>
  blankable(
    z.coerce
      .number({ error: "Coordenada inválida" })
      .refine((value) => Number.isFinite(value) && Math.abs(value) <= limit, "Coordenada inválida"),
  );

export const optionalUrlSchema = blankable(
  z.url({ protocol: /^https?$/, error: "Ingresá un link válido (http o https)" }).max(2000),
);
