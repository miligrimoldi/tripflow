import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm " +
  "placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "aria-invalid:border-red-400 aria-invalid:focus:ring-red-500/20";

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
  return <input className={cn(control, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-20", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "h-10", className)} {...props} />;
}
