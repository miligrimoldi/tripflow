import type { Metadata } from "next";
import { SignUpForm } from "@/features/auth/components/sign-up-form";
import { AuthPage } from "../auth-page";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <AuthPage
      title="Creá tu cuenta"
      subtitle="Empezá a organizar tu próximo viaje en grupo."
      searchParams={searchParams}
      form={(callbackUrl) => <SignUpForm callbackUrl={callbackUrl} />}
      footer={{ text: "¿Ya tenés cuenta?", linkLabel: "Ingresá", href: "/sign-in" }}
    />
  );
}
