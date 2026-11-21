import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { formatDate, formatMoney, getLang, getT } from "@/lib/i18n";
import { getEventForJoin } from "@/lib/queries";
import { getMyParticipant } from "@/lib/session";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Zaproszenie", referrer: "no-referrer" };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const [t, lang, data] = await Promise.all([getT(), getLang(), getEventForJoin(code)]);
  if (!data) {
    return (
      <Shell>
        <p className="card text-center">{t.join.notFound}</p>
        <Link href="/" className="btn-secondary">
          {t.common.back}
        </Link>
      </Shell>
    );
  }
  const { event, people, organizerName } = data;
  if (await getMyParticipant(event.id)) redirect(`/e/${event.id}`);
  const budget = formatMoney(event.budget, event.currency, lang);
  const date = formatDate(event.exchangeDate, lang);

  return (
    <Shell theme={event.theme}>
      <section className="card flex flex-col gap-3">
        <span className="text-sm text-muted">{t.join.invitedBy(organizerName)}</span>
        <h1 className="font-display text-[30px] font-extrabold leading-[1.05] tracking-tight">{event.name}</h1>
        <div className="flex flex-wrap gap-2">
          {budget && <span className="chip">{t.common.budgetUpTo(budget)}</span>}
          {date && <span className="chip">{t.common.exchangeOn(date)}</span>}
          <span className="chip">{t.common.people(people.length)}</span>
        </div>
      </section>
      <JoinForm
        code={code}
        people={people}
        t={{
          whoAreYou: t.join.whoAreYou,
          joined: t.join.joined,
          free: t.join.free,
          newHint: t.join.newHint,
          emailOptional: t.join.emailOptional,
          emailHint: t.join.emailHint,
          passwordPh: t.join.passwordPh,
          join: t.join.join,
          login: t.join.login,
          forgot: t.join.forgot,
          joinedNote: t.join.joinedNote,
          organizerEntry: t.join.organizerEntry,
          show: t.common.show,
          hide: t.common.hide,
          loading: t.common.loading,
          organizerLogin: t.login.submit,
          hiNew: Object.fromEntries(people.map((p) => [p.id, t.join.hiNew(p.name)])),
          welcomeBack: Object.fromEntries(people.map((p) => [p.id, t.join.welcomeBack(p.name)])),
        }}
      />
    </Shell>
  );
}
