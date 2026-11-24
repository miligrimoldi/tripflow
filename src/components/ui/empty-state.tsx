import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconTile, type Tone } from "./icon-tile";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  tone?: Tone;
  /** Compact version for small areas (an empty day, the ideas board). */
  compact?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, children, action, tone = "brand", compact, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-dashed border-slate-300/80 bg-white/50 text-center",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-14",
        className,
      )}
    >
      <IconTile icon={icon} tone={tone} size={compact ? "sm" : "lg"} />
      <div className={compact ? "space-y-0.5" : "space-y-1"}>
        <p className={cn("font-medium text-slate-900", compact ? "text-sm" : "font-display text-lg")}>{title}</p>
        {children && (
          <p className={cn("mx-auto max-w-sm text-slate-500", compact ? "text-xs" : "text-sm")}>{children}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
