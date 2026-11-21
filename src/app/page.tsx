import Link from "next/link";
import { Shell } from "@/components/shell";
import { getT } from "@/lib/i18n";
import { getEventsForParticipants, getOrganizerEvents } from "@/lib/queries";
import { getOrganizer, getSession } from "@/lib/session";

export default async function Home() {
  const [t, session, organizer] = await Promise.all([getT(), getSession(), getOrganizer()]);
  const mine = await getEventsForParticipants(session?.participantIds ?? []);
  const organized = organizer ? await getOrganizerEvents(organizer.id) : [];

  return (
    <Shell>
      <section className="flex flex-col gap-4 pt-4">
        <h1 className="font-display text-[40px] font-extrabold leading-[1.02] tracking-tight">{t.home.title}</h1>
        <p className="text-base leading-relaxed text-muted">{t.home.lead}</p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/nowe" className="btn-primary">
            {t.home.create}
          </Link>
          {organizer ? (
            <Link href="/panel" className="btn-secondary">
              {t.panel.title}
            </Link>
          ) : (
            <Link href="/logowanie" className="btn-secondary">
              {t.home.organizerLogin}
            </Link>
          )}
        </div>
      </section>

      {(mine.length > 0 || organized.length > 0) && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{t.home.myEvents}</h2>
          {mine.map((e) => (
            <Link key={e.eventId} href={`/e/${e.eventId}`} className="card flex items-center justify-between gap-3 !py-4">
              <span className="font-semibold">{e.name}</span>
              <span className="text-sm text-muted">{e.me}</span>
            </Link>
          ))}
          {organized
            .filter((e) => !mine.some((m) => m.eventId === e.id))
            .map((e) => (
              <Link key={e.id} href={`/panel/${e.id}`} className="card flex items-center justify-between gap-3 !py-4">
                <span className="font-semibold">{e.name}</span>
                <span className="text-sm text-muted">{t.home.asOrganizer}</span>
              </Link>
            ))}
        </section>
      )}

      <section className="grid gap-3">
        {[
          [t.home.how1t, t.home.how1],
          [t.home.how2t, t.home.how2],
          [t.home.how3t, t.home.how3],
        ].map(([title, body], i) => (
          <div key={title} className="card flex gap-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-2 font-display font-extrabold text-on-accent-2">{i + 1}</span>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>
      <p className="text-center text-sm text-muted">{t.home.invited}</p>
    </Shell>
  );
}
