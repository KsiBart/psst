import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell } from "@/components/shell";
import { formatDate, formatMoney, getLang, getT } from "@/lib/i18n";
import { getDashboard } from "@/lib/queries";
import { getMyParticipant, getOrganizer } from "@/lib/session";
import { AccountSection } from "./account";
import { DrawCard } from "./draw-card";
import { Wishlist } from "./wishlist";

export const metadata: Metadata = { title: "Moje losowanie" };

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - today) / 864e5);
}

export default async function DashboardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMyParticipant(id);
  if (!me) notFound();
  const [t, lang, d, organizer] = await Promise.all([getT(), getLang(), getDashboard(me), getOrganizer()]);
  const ev = d.event;
  const days = daysUntil(ev.exchangeDate);
  const date = formatDate(ev.exchangeDate, lang);
  const budget = formatMoney(ev.budget, ev.currency, lang);
  const isOrganizer = organizer?.id === ev.organizerId;
  const waiting = !ev.drawnAt && !ev.allowEarlyDraw && d.joined < d.total;

  return (
    <Shell theme={ev.theme} right={isOrganizer ? <Link href={`/panel/${ev.id}`} className="flex h-11 items-center rounded-xl bg-surface px-3 text-sm font-bold text-muted">{t.panel.title.split(" ")[0]}</Link> : undefined}>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">{t.dash.hi(me.name)}</span>
        <h1 className="font-display text-[26px] font-extrabold leading-tight tracking-tight">{ev.name}</h1>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="card flex flex-col gap-0.5 !py-3.5">
          {days == null ? (
            <span className="font-display text-xl font-extrabold">{t.dash.noDate}</span>
          ) : days > 0 ? (
            <span className="font-display text-[30px] font-extrabold leading-none">
              {days}
              <span className="text-[15px] font-semibold"> {t.dash.days(days)}</span>
            </span>
          ) : (
            <span className="font-display text-xl font-extrabold">{days === 0 ? t.dash.today : t.dash.past}</span>
          )}
          {date && <span className="text-xs text-muted">{t.dash.until(date)}</span>}
        </div>
        <div className="card flex flex-col gap-0.5 !py-3.5">
          <span className="font-display text-[30px] font-extrabold leading-none">{budget ?? "∞"}</span>
          <span className="text-xs text-muted">{budget ? t.dash.maxBudget : t.dash.noBudget}</span>
        </div>
      </div>

      {ev.note && (
        <div className="card !py-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t.dash.note}</span>
          <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{ev.note}</p>
        </div>
      )}

      <DrawCard
        eventId={ev.id}
        receiver={d.receiver}
        giftReady={me.giftReady}
        waitingMsg={waiting ? t.dash.waitAll(d.joined, d.total) : null}
        t={{
          drawTitle: t.dash.drawTitle,
          drawLead: t.dash.drawLead,
          drawBtn: t.dash.drawBtn,
          drawing: t.dash.drawing,
          giftingFor: t.dash.giftingFor,
          tapHide: t.dash.tapHide,
          tapShow: t.dash.tapShow,
          giftReady: t.dash.giftReady,
          theirWishlist: d.receiver ? t.dash.theirWishlist(d.receiver.name) : "",
          noWishes: d.receiver ? t.dash.noWishes(d.receiver.name) : "",
        }}
      />

      <Wishlist
        eventId={ev.id}
        wishes={d.myWishes}
        t={{ title: t.dash.myWishlist, count: t.dash.ofMax(d.myWishes.length), addIdea: t.dash.addIdea, ideaPh: t.dash.ideaPh, linkPh: t.dash.linkPh, add: t.common.add, cancel: t.common.cancel, del: t.common.delete, loading: t.common.loading }}
      />

      <div className="flex items-center gap-3 text-sm text-muted">
        <div className="flex">
          {d.initials.map((i, k) => (
            <span key={k} className="-mr-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-bg bg-accent-2 text-[11px] font-bold text-on-accent-2">
              {i}
            </span>
          ))}
        </div>
        <span className="pl-2">{t.dash.progress(d.joined, d.total, d.drawn)}</span>
      </div>

      <AccountSection
        eventId={ev.id}
        email={me.email ?? ""}
        hasPassword={!!me.passwordHash}
        hasDate={!!ev.exchangeDate}
        t={{ account: t.dash.account, emailLabel: t.dash.emailLabel, newPassword: t.dash.newPassword, changePassword: t.dash.changePassword, calendar: t.dash.calendar, logout: t.common.logout, save: t.common.save, show: t.common.show, hide: t.common.hide, loading: t.common.loading }}
      />
    </Shell>
  );
}
