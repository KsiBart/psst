import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import { getT } from "@/lib/i18n";
import { getOrganizer } from "@/lib/session";
import { CreateForm } from "./create-form";

export const metadata: Metadata = { title: "Nowe wydarzenie" };

export default async function NewEventPage() {
  const [t, organizer] = await Promise.all([getT(), getOrganizer()]);
  return (
    <Shell>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold text-muted">{t.create.step}</span>
        <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-tight">{t.create.title}</h1>
      </div>
      <CreateForm
        loggedIn={!!organizer}
        defaultName={organizer?.name ?? ""}
        t={t.create}
        themes={t.themes}
        common={{ add: t.common.add, email: t.common.email, password: t.common.password, show: t.common.show, hide: t.common.hide, loading: t.common.loading, delete: t.common.delete }}
      />
    </Shell>
  );
}
