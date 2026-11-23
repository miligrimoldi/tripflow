import type { Metadata } from "next";
import { SignInForm } from "@/features/auth/components/sign-in-form";
import { AuthPage } from "../auth-page";

export const metadata: Metadata = { title: "Ingresar" };

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <AuthPage
      title="Bienvenida/o de nuevo"
      subtitle="Ingresá para seguir planificando tus viajes."
      searchParams={searchParams}
      form={(callbackUrl) => <SignInForm callbackUrl={callbackUrl} />}
      footer={{ text: "¿No tenés cuenta?", linkLabel: "Creá una", href: "/sign-up" }}
    />
  );
}
