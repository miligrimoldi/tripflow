import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconTile, type Tone } from "./icon-tile";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-2xl border border-slate-200/70 bg-white shadow-soft", className)} {...props} />;
}

interface CardHeadingProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  tone?: Tone;
  className?: string;
}

/** Card title with an icon tile and an optional line of help text. */
export function CardHeading({ icon, title, description, tone = "brand", className }: CardHeadingProps) {
  return (
    <div className={cn("mb-5 flex items-start gap-3", className)}>
      <IconTile icon={icon} tone={tone} size="sm" className="mt-0.5" />
      <div>
        <h2 className="text-lg leading-tight font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/60", className)} />;
}
