import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { getT } from "@/lib/i18n";
import { peekResetToken } from "@/lib/reset";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Nowe hasło", referrer: "no-referrer" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [t, info] = await Promise.all([getT(), peekResetToken(token)]);
  return (
    <Shell>
      <h1 className="font-display text-[32px] font-extrabold tracking-tight">{t.reset.title}</h1>
      {info ? (
        <>
          <p className="text-muted">{t.reset.for(info.name)}</p>
          <ResetForm
            token={token}
            kind={info.kind}
            t={{ submit: t.reset.submit, password: t.common.password, show: t.common.show, hide: t.common.hide, loading: t.common.loading, hint: info.kind === "organizer" ? t.create.passwordHint : "" }}
          />
        </>
      ) : (
        <>
          <p className="card text-danger">{t.reset.invalid}</p>
          <Link href="/" className="btn-secondary">
            {t.common.back}
          </Link>
        </>
      )}
    </Shell>
  );
}
