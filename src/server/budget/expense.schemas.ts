import { z } from "zod";
import { CURRENCIES, parseAmountToCents, parseRate } from "../shared/money";
import { requiredTextSchema } from "../shared/schemas";
import type { RawInput } from "../shared/validation";
import { EXPENSE_CATEGORIES } from "./expense";

/** An amount typed in a form ("1.234,50") converted to integer cents. */
const amountSchema = (message: string) =>
  z.string({ error: message }).transform((value, context) => {
    const cents = parseAmountToCents(value);
    if (cents === null) {
      context.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return cents;
  });

const blankToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : (value ?? null));

export const expenseSchema = z
  .object({
    description: requiredTextSchema("La descripción", 120),
    category: z.enum(EXPENSE_CATEGORIES, { error: "Elegí una categoría" }),
    amount: amountSchema("Ingresá un monto válido, por ejemplo 15.000 o 1.234,50"),
    activityId: z.preprocess(blankToNull, z.string().max(50).nullable()).optional(),
    paidById: z.preprocess(blankToNull, z.string().max(50).nullable()).optional(),
    /** Currency it was paid in; blank means the trip's. */
    currency: z.preprocess(blankToNull, z.enum(CURRENCIES, { error: "Elegí una moneda" }).nullable()).optional(),
    /** 1 unit of `currency` in the trip's currency; only needed for another currency. */
    rate: z
      .preprocess(blankToNull, z.string().max(30).nullable())
      .optional()
      .transform((value, context) => {
        if (value == null) return null;
        const rate = parseRate(value);
        if (rate === null) {
          context.addIssue({ code: "custom", message: "Ingresá una cotización válida, por ejemplo 1.450 o 269,95" });
          return z.NEVER;
        }
        return rate;
      }),
    // A form sends one value per checked box: a single string or an array.
    participantIds: z.preprocess(
      (value) => (typeof value === "string" ? [value] : (value ?? [])),
      z
        .array(z.string().min(1).max(50))
        .min(1, "Elegí al menos una persona")
        .max(100)
        .transform((ids) => [...new Set(ids)]),
    ),
  })
  .transform(({ amount, activityId, paidById, currency, ...rest }) => ({
    ...rest,
    amountCents: amount,
    currency: currency ?? null,
    activityId: activityId ?? null,
    paidById: paidById ?? null,
  }));

export type ExpenseInput = RawInput<typeof expenseSchema>;

export const budgetSettingsSchema = z
  .object({
    currency: z.enum(CURRENCIES, { error: "Elegí una moneda" }),
    budget: z.preprocess(blankToNull, amountSchema("Ingresá un presupuesto válido").nullable()).optional(),
  })
  .transform(({ currency, budget }) => ({ currency, budgetCents: budget ?? null }));

export type BudgetSettingsInput = RawInput<typeof budgetSettingsSchema>;

export const settlementSchema = z
  .object({
    fromId: z.string({ error: "Elegí quién pagó" }).min(1, "Elegí quién pagó").max(50),
    toId: z.string({ error: "Elegí a quién" }).min(1, "Elegí a quién").max(50),
    amount: amountSchema("Ingresá un monto válido, por ejemplo 15.000 o 1.234,50"),
  })
  .refine(({ fromId, toId }) => fromId !== toId, { message: "Tienen que ser dos personas distintas", path: ["toId"] })
  .transform(({ amount, ...rest }) => ({ ...rest, amountCents: amount }));

export type SettlementInput = RawInput<typeof settlementSchema>;
