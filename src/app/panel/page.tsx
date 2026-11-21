import type { Metadata } from "next";
import Link from "next/link";
import { organizerLogoutAction } from "@/app/actions/auth";
import { Shell } from "@/components/shell";
import { getT } from "@/lib/i18n";
import { getOrganizerEvents } from "@/lib/queries";
import { requireOrganizer } from "@/lib/session";

export const metadata: Metadata = { title: "Panel organizatora" };

export default async function PanelPage() {
  const organizer = await requireOrganizer();
  const [t, evs] = await Promise.all([getT(), getOrganizerEvents(organizer.id)]);
  return (
    <Shell>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-accent">{t.panel.title}</span>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight">{t.panel.myEvents}</h1>
        <span className="text-sm text-muted">{organizer.email}</span>
      </div>
      {evs.length === 0 && <p className="card text-muted">{t.panel.noEvents}</p>}
      <div className="flex flex-col gap-2">
        {evs.map((e) => (
          <Link key={e.id} href={`/panel/${e.id}`} className="card flex items-center justify-between gap-3 !py-4">
            <span className="font-semibold">{e.name}</span>
            <span className="text-xs text-muted">{e.drawnAt ? t.panel.statusDrawing : t.panel.statusOpen}</span>
          </Link>
        ))}
      </div>
      <Link href="/nowe" className="btn-primary">
        {t.panel.newEvent}
      </Link>
      <form action={organizerLogoutAction}>
        <button className="btn w-full border-2 border-surface-2 text-muted">{t.common.logout}</button>
      </form>
    </Shell>
  );
}
