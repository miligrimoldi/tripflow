import { z } from "zod";
import { CURRENCIES, parseAmountToCents } from "../shared/money";
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
  })
  .transform(({ amount, activityId, ...rest }) => ({ ...rest, amountCents: amount, activityId: activityId ?? null }));

export type ExpenseInput = RawInput<typeof expenseSchema>;

export const budgetSettingsSchema = z
  .object({
    currency: z.enum(CURRENCIES, { error: "Elegí una moneda" }),
    budget: z.preprocess(blankToNull, amountSchema("Ingresá un presupuesto válido").nullable()).optional(),
  })
  .transform(({ currency, budget }) => ({ currency, budgetCents: budget ?? null }));

export type BudgetSettingsInput = RawInput<typeof budgetSettingsSchema>;
