import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/card";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { getCurrentUser } from "@/server/auth/session";

interface AuthPageProps {
  title: string;
  subtitle: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  form: (callbackUrl: string | undefined) => ReactNode;
  footer: { text: string; linkLabel: string; href: string };
}

/** Shared shell for the sign-in and sign-up pages. */
export function AuthPage({ title, subtitle, searchParams, form, footer }: AuthPageProps) {
  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">{subtitle}</p>
      <Suspense fallback={<Skeleton className="h-64" />}>
        <AuthFormGate searchParams={searchParams} form={form} footer={footer} />
      </Suspense>
    </>
  );
}

async function AuthFormGate({ searchParams, form, footer }: Pick<AuthPageProps, "searchParams" | "form" | "footer">) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : undefined;

  // Already signed in: skip the form.
  if (await getCurrentUser()) redirect(safeCallbackUrl(callbackUrl));

  const footerHref = callbackUrl ? `${footer.href}?callbackUrl=${encodeURIComponent(callbackUrl)}` : footer.href;
  return (
    <>
      {form(callbackUrl)}
      <p className="mt-6 text-center text-sm text-slate-600">
        {footer.text}{" "}
        <Link href={footerHref} className="font-medium text-brand-700 hover:underline">
          {footer.linkLabel}
        </Link>
      </p>
    </>
  );
}
