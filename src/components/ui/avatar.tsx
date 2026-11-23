import { initials } from "@/lib/format";
import { cn } from "@/lib/cn";

const palette = [
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-violet-100 text-violet-700",
];

/** Deterministic color per name, so each traveler is recognizable. */
function colorFor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return palette[hash % palette.length];
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white",
        colorFor(name),
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
