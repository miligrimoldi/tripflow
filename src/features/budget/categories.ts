import type { ExpenseCategory } from "@/server/budget/expense";

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string }> = {
  ACCOMMODATION: { label: "Alojamiento", icon: "🏨" },
  TRANSPORT: { label: "Transporte", icon: "🚆" },
  FOOD: { label: "Comidas", icon: "🍽️" },
  ACTIVITIES: { label: "Excursiones y entradas", icon: "🎟️" },
  SHOPPING: { label: "Compras", icon: "🛍️" },
  OTHER: { label: "Otros", icon: "📦" },
};

export const CURRENCY_LABELS: Record<string, string> = {
  ARS: "Peso argentino (ARS)",
  USD: "Dólar estadounidense (USD)",
  EUR: "Euro (EUR)",
  BRL: "Real brasileño (BRL)",
  CLP: "Peso chileno (CLP)",
  UYU: "Peso uruguayo (UYU)",
  MXN: "Peso mexicano (MXN)",
  GBP: "Libra esterlina (GBP)",
};
