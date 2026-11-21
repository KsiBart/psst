import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { getT } from "@/lib/i18n";
import { getOrganizer } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logowanie" };

export default async function LoginPage() {
  const [t, organizer] = await Promise.all([getT(), getOrganizer()]);
  if (organizer) redirect("/panel");
  return (
    <Shell>
      <h1 className="font-display text-[32px] font-extrabold tracking-tight">{t.login.title}</h1>
      <LoginForm t={{ ...t.login, email: t.common.email, password: t.common.password, show: t.common.show, hide: t.common.hide, loading: t.common.loading }} />
      <Link href="/haslo" className="text-center text-sm font-semibold text-accent-2 underline-offset-4 hover:underline">
        {t.login.forgot}
      </Link>
      <Link href="/nowe" className="text-center text-sm text-muted underline-offset-4 hover:underline">
        {t.login.noAccount}
      </Link>
    </Shell>
  );
}
