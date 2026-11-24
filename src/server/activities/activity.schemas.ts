import { z } from "zod";
import type { RawInput } from "../shared/validation";
import {
  optionalDateOnlySchema,
  optionalTextSchema,
  optionalTimeSchema,
  optionalUrlSchema,
  requiredTextSchema,
} from "../shared/schemas";
import { ACTIVITY_CATEGORIES } from "./activity";

export const activityDetailsSchema = z.object({
  title: requiredTextSchema("El título", 120),
  category: z.enum(ACTIVITY_CATEGORIES, { error: "Elegí una categoría" }).default("OTHER"),
  notes: optionalTextSchema(2000),
  location: optionalTextSchema(200),
  url: optionalUrlSchema,
  date: optionalDateOnlySchema,
  startTime: optionalTimeSchema,
});

export type ActivityDetailsInput = RawInput<typeof activityDetailsSchema>;

/** Destination of a move: a day (or `null` for ideas) and, optionally, a position in it. */
export const moveSchema = z.object({
  date: optionalDateOnlySchema,
  index: z.coerce.number().int().min(0).optional(),
});
export type MoveInput = RawInput<typeof moveSchema>;
