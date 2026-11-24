import { ChevronDown } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 shadow-xs transition " +
  "placeholder:text-slate-400 hover:border-slate-300 " +
  "focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15 " +
  "aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/15 disabled:opacity-60";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}

/** Label + control + error message, wired together for accessibility. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": message ? messageId : undefined,
      })}
      {message && (
        <p id={messageId} className={cn("text-xs", error ? "text-red-600" : "text-slate-500")}>
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-20 py-2.5", className)} {...props} />;
}

/**
 * Native <select> (accessible, works on mobile) with our own chevron: the
 * browser's arrow sits glued to the border and can't be positioned.
 */
export function Select({
  className,
  size = "md",
  ...props
}: Omit<ComponentProps<"select">, "size"> & { size?: "sm" | "md" }) {
  return (
    <div className={cn("relative", size === "md" ? "w-full" : "inline-block")}>
      <select
        className={cn(
          control,
          "cursor-pointer appearance-none",
          size === "md" ? "h-11 pr-10" : "h-8 rounded-lg pr-8 pl-2.5 text-xs",
          className,
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-slate-400",
          size === "md" ? "right-3.5 size-4" : "right-2.5 size-3.5",
        )}
      />
    </div>
  );
}
