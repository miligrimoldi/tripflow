import { Plane } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export function Logo({ href = "/", inverted = false }: { href?: string; inverted?: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight",
        inverted ? "text-white" : "text-slate-900",
      )}
    >
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-sm shadow-brand-900/20"
      >
        <Plane className="size-[18px] -rotate-45" strokeWidth={2} />
      </span>
      TripFlow
    </Link>
  );
}
