import { BedDouble, Package, ShoppingBag, Ticket, TrainFront, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { Tone } from "@/components/ui/icon-tile";
import type { ExpenseCategory } from "@/server/budget/expense";

export const EXPENSE_CATEGORY_META: Record<ExpenseCategory, { label: string; icon: LucideIcon; tone: Tone }> = {
  ACCOMMODATION: { label: "Alojamiento", icon: BedDouble, tone: "violet" },
  TRANSPORT: { label: "Transporte", icon: TrainFront, tone: "slate" },
  FOOD: { label: "Comidas", icon: UtensilsCrossed, tone: "amber" },
  ACTIVITIES: { label: "Excursiones y entradas", icon: Ticket, tone: "emerald" },
  SHOPPING: { label: "Compras", icon: ShoppingBag, tone: "pink" },
  OTHER: { label: "Otros", icon: Package, tone: "stone" },
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
