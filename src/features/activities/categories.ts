import type { ActivityCategory } from "@/server/activities/activity";

interface CategoryMeta {
  label: string;
  icon: string;
  badge: string;
}

/** Presentation metadata for each category (labels, icon, colors). */
export const CATEGORY_META: Record<ActivityCategory, CategoryMeta> = {
  SIGHTSEEING: { label: "Lugar para visitar", icon: "🏛️", badge: "bg-sky-50 text-sky-700 ring-sky-200" },
  FOOD: { label: "Comida", icon: "🍽️", badge: "bg-amber-50 text-amber-700 ring-amber-200" },
  EXCURSION: { label: "Excursión", icon: "🥾", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  ACCOMMODATION: { label: "Alojamiento", icon: "🏨", badge: "bg-violet-50 text-violet-700 ring-violet-200" },
  TRANSPORT: { label: "Transporte", icon: "🚆", badge: "bg-slate-100 text-slate-700 ring-slate-200" },
  SHOPPING: { label: "Compras", icon: "🛍️", badge: "bg-pink-50 text-pink-700 ring-pink-200" },
  NIGHTLIFE: { label: "Salida nocturna", icon: "🌙", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  OTHER: { label: "Otro", icon: "📌", badge: "bg-slate-100 text-slate-600 ring-slate-200" },
};
