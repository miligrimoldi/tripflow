import { LogOut } from "lucide-react";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { signOutAction } from "@/features/auth/actions";
import { getCurrentUser } from "@/server/auth/session";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-sand-50/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo href="/trips" />
          <Suspense fallback={<Skeleton className="h-8 w-32" />}>
            <UserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2.5 rounded-full border border-slate-200/70 bg-white py-1 pr-3.5 pl-1 shadow-xs">
        <Avatar name={user.name} className="ring-0" />
        <span className="hidden text-sm font-medium text-slate-700 sm:inline">{user.name}</span>
      </div>
      <form action={signOutAction}>
        <Button variant="ghost" size="sm" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut aria-hidden />
          <span className="hidden sm:inline">Salir</span>
        </Button>
      </form>
    </div>
  );
}
