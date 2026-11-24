import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

/** Color families for icon tiles (literal classes so Tailwind can see them). */
export const TONES = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  slate: "bg-slate-100 text-slate-700 ring-slate-200/70",
  pink: "bg-pink-50 text-pink-700 ring-pink-100",
  indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  coral: "bg-coral-50 text-coral-600 ring-coral-100",
  stone: "bg-stone-100 text-stone-600 ring-stone-200/70",
} as const;

export type Tone = keyof typeof TONES;

const SIZES = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-14 rounded-2xl [&_svg]:size-7",
};

interface IconTileProps {
  icon: LucideIcon;
  tone?: Tone;
  size?: keyof typeof SIZES;
  className?: string;
}

/** A soft colored square holding an icon: categories, features, empty states. */
export function IconTile({ icon: Icon, tone = "brand", size = "md", className }: IconTileProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center ring-1 ring-inset",
        TONES[tone],
        SIZES[size],
        className,
      )}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}
