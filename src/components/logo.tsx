import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900">
      <span
        className="flex size-8 items-center justify-center rounded-lg bg-brand-600 text-base text-white"
        aria-hidden
      >
        ✈
      </span>
      TripFlow
    </Link>
  );
}
