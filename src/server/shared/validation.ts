import type { z } from "zod";
import { ValidationError, type FieldErrors } from "./errors";

/**
 * Parses untrusted input with a Zod schema and converts failures into a
 * framework-agnostic {@link ValidationError}.
 */
export function parseInput<TSchema extends z.ZodType>(schema: TSchema, input: unknown): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  throw new ValidationError("Revisá los datos ingresados", fieldErrors);
}

/**
 * Raw input accepted by a use case: the schema's keys, with values that are
 * not trusted yet (they usually come straight from a form). Validation is
 * the use case's job, via {@link parseInput}.
 */
export type RawInput<TSchema extends z.ZodType> = Partial<Record<keyof z.input<TSchema>, unknown>>;
