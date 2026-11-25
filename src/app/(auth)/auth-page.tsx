import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/card";
import { safeCallbackUrl } from "@/lib/safe-redirect";
import { GoogleButton } from "@/features/auth/components/google-button";
import { oauthErrorMessage } from "@/features/auth/oauth-errors";
import { googleSignInEnabled } from "@/server/auth/auth";
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
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 mb-8 text-slate-600">{subtitle}</p>
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
  // Coming back from Google with an error (cancelled, email already used…).
  const oauthError = oauthErrorMessage(params.error);
  return (
    <>
      {oauthError && (
        <p role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {oauthError}
        </p>
      )}
      {googleSignInEnabled && (
        <>
          <GoogleButton callbackUrl={callbackUrl} />
          <div className="my-6 flex items-center gap-3 text-xs font-medium text-slate-400 uppercase">
            <span className="h-px flex-1 bg-slate-200" />o con tu email
            <span className="h-px flex-1 bg-slate-200" />
          </div>
        </>
      )}
      {form(callbackUrl)}
      <p className="mt-8 text-center text-sm text-slate-600">
        {footer.text}{" "}
        <Link href={footerHref} className="font-medium text-brand-700 hover:underline">
          {footer.linkLabel}
        </Link>
      </p>
    </>
  );
}
