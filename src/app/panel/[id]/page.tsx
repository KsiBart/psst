import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Shell } from "@/components/shell";
import { getT } from "@/lib/i18n";
import { getPanel } from "@/lib/queries";
import { getOwnedEvent, requireOrganizer } from "@/lib/session";
import { appUrl } from "@/lib/url";
import { DangerZone, Exclusions, InviteCard, Participants, SettingsForm } from "./manage";

export const metadata: Metadata = { title: "Panel organizatora" };

export default async function ManageEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireOrganizer();
  const ev = await getOwnedEvent(id);
  if (!ev) notFound();
  const [t, data, base] = await Promise.all([getT(), getPanel(ev.id), appUrl()]);
  const inviteUrl = `${base}/j/${ev.joinCode}`;
  const qr = await QRCode.toString(inviteUrl, { type: "svg", margin: 1, color: { dark: "#000000", light: "#ffffff" } });
  const locked = !!ev.drawnAt;
  const me = data.people.find((p) => p.isOrganizer);

  return (
    <Shell theme={ev.theme}>
      <div className="flex flex-col gap-1">
        <Link href="/panel" className="text-xs font-semibold uppercase tracking-wider text-accent">
          ← {t.panel.title}
        </Link>
        <h1 className="font-display text-[28px] font-extrabold leading-tight tracking-tight">{ev.name}</h1>
      </div>

      <InviteCard eventId={ev.id} url={inviteUrl} qrSvg={qr} title={ev.name} t={{ invite: t.panel.invite, share: t.common.share, copy: t.common.copy, copied: t.common.copied, qr: t.panel.qr, newLink: t.panel.newLink, newLinkConfirm: t.panel.newLinkConfirm }} />

      <div className="grid grid-cols-3 gap-2">
        {[
          [`${data.stats.joined}/${data.stats.total}`, t.panel.joined],
          [data.stats.drawn, t.panel.drawn],
          [data.stats.ready, t.panel.ready],
        ].map(([v, l]) => (
          <div key={String(l)} className="card flex flex-col gap-0.5 !rounded-2xl !p-3">
            <span className="font-display text-2xl font-extrabold">{v}</span>
            <span className="text-xs text-muted">{l}</span>
          </div>
        ))}
      </div>
      <p className="flex items-start gap-2 text-sm leading-relaxed text-muted">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0">
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7a4 4 0 018 0v4" />
        </svg>
        {t.panel.privacy}
      </p>
      {me && (
        <Link href={`/e/${ev.id}`} className="btn-primary">
          {t.panel.viewAsParticipant}
        </Link>
      )}

      <SettingsForm
        eventId={ev.id}
        values={{ name: ev.name, theme: ev.theme, budget: ev.budget, date: ev.exchangeDate, note: ev.note, allowEarlyDraw: ev.allowEarlyDraw }}
        themes={t.themes}
        t={{ settings: t.panel.settings, eventName: t.create.eventName, theme: t.create.theme, budget: t.create.budget, date: t.create.date, note: t.create.note, notePh: t.create.notePh, allowEarly: t.panel.allowEarly, save: t.common.save, loading: t.common.loading }}
      />

      <Participants
        eventId={ev.id}
        people={data.people}
        locked={locked}
        t={{
          title: t.panel.participants(data.people.length),
          waiting: t.panel.waiting,
          inGame: t.panel.inGame,
          you: t.panel.organizer,
          addNamePh: t.panel.addNamePh,
          add: t.common.add,
          locked: t.panel.locked,
          resetLink: t.panel.resetLink,
          resetLinkHint: t.panel.resetLinkHint,
          sendEmail: t.panel.sendEmail,
          emailSent: t.panel.emailSent,
          copy: t.common.copy,
          copied: t.common.copied,
          del: t.common.delete,
          loading: t.common.loading,
          removeConfirm: Object.fromEntries(data.people.map((p) => [p.id, t.panel.removeConfirm(p.name)])),
          resetFor: Object.fromEntries(data.people.map((p) => [p.id, t.panel.resetLinkFor(p.name)])),
        }}
      />

      <Exclusions
        eventId={ev.id}
        people={data.people.map((p) => ({ id: p.id, name: p.name }))}
        exclusions={data.exclusions}
        locked={locked}
        t={{ title: t.panel.exclusions, hint: t.panel.exclusionsHint, add: t.panel.addExclusion, del: t.common.delete, loading: t.common.loading }}
      />

      <DangerZone eventId={ev.id} locked={locked} t={{ resetDraws: t.panel.resetDraws, resetConfirm: t.panel.resetConfirm, deleteEvent: t.panel.deleteEvent, deleteConfirm: t.panel.deleteConfirm }} />
    </Shell>
  );
}
