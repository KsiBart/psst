import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { getT } from "@/lib/i18n";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Odzyskiwanie hasła" };

export default async function ForgotPage() {
  const t = await getT();
  return (
    <Shell>
      <h1 className="font-display text-[32px] font-extrabold tracking-tight">{t.forgot.title}</h1>
      <p className="text-muted">{t.forgot.lead}</p>
      <ForgotForm t={{ submit: t.forgot.submit, email: t.common.email, loading: t.common.loading }} />
      <p className="card text-sm leading-relaxed text-muted">{t.forgot.participantInfo}</p>
    </Shell>
  );
}
