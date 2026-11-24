import {
  BedDouble,
  Landmark,
  Martini,
  Mountain,
  ShoppingBag,
  Sparkles,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import type { Tone } from "@/components/ui/icon-tile";
import type { ActivityCategory } from "@/server/activities/activity";

interface CategoryMeta {
  label: string;
  icon: LucideIcon;
  tone: Tone;
}

/** Presentation metadata for each category (label, icon, color). */
export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  SIGHTSEEING: { label: "Lugar para visitar", icon: Landmark, tone: "sky" },
  FOOD: { label: "Comida", icon: UtensilsCrossed, tone: "amber" },
  EXCURSION: { label: "Excursión", icon: Mountain, tone: "emerald" },
  ACCOMMODATION: { label: "Alojamiento", icon: BedDouble, tone: "violet" },
  TRANSPORT: { label: "Transporte", icon: TrainFront, tone: "slate" },
  SHOPPING: { label: "Compras", icon: ShoppingBag, tone: "pink" },
  NIGHTLIFE: { label: "Salida nocturna", icon: Martini, tone: "indigo" },
  OTHER: { label: "Otro", icon: Sparkles, tone: "stone" },
};
