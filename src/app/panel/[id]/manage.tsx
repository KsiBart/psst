"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  addExclusionAction,
  addParticipantAction,
  createResetLinkAction,
  deleteEventAction,
  emailResetLinkAction,
  newJoinCodeAction,
  removeExclusionAction,
  removeParticipantAction,
  resetDrawsAction,
  updateSettingsAction,
} from "@/app/actions/organizer";
import { FormMessage, SubmitButton, ThemePicker } from "@/components/forms";
import type { ThemeId } from "@/lib/themes";

function useCopy() {
  const [copied, setCopied] = useState(false);
  return {
    copied,
    copy: async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        window.prompt("", text);
      }
    },
  };
}

export function InviteCard({ eventId, url, qrSvg, title, t }: { eventId: string; url: string; qrSvg: string; title: string; t: Record<"invite" | "share" | "copy" | "copied" | "qr" | "newLink" | "newLinkConfirm", string> }) {
  const { copied, copy } = useCopy();
  const [showQr, setShowQr] = useState(false);
  const [pending, start] = useTransition();
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    copy(url);
  };
  return (
    <section className="card flex flex-col gap-3 !p-4">
      <span className="text-sm font-semibold">{t.invite}</span>
      <div className="truncate rounded-xl bg-surface-2 px-3 py-3 font-mono text-[13px]">{url.replace(/^https?:\/\//, "")}</div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={share} className="btn-primary !px-2 text-sm">
          {t.share}
        </button>
        <button type="button" onClick={() => copy(url)} className="btn-secondary !px-2 text-sm">
          {copied ? t.copied : t.copy}
        </button>
        <button type="button" onClick={() => setShowQr((s) => !s)} aria-expanded={showQr} className="btn-secondary !px-2 text-sm">
          {t.qr}
        </button>
      </div>
      <AnimatePresence>
        {showQr && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mx-auto w-56 rounded-2xl bg-white p-3" role="img" aria-label={t.qr} dangerouslySetInnerHTML={{ __html: qrSvg }} />
          </motion.div>
        )}
      </AnimatePresence>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm(t.newLinkConfirm) && start(() => newJoinCodeAction(eventId))}
        className="self-start text-xs font-semibold text-muted underline underline-offset-4"
      >
        {t.newLink}
      </button>
    </section>
  );
}

export function SettingsForm({
  eventId,
  values,
  themes,
  t,
}: {
  eventId: string;
  values: { name: string; theme: ThemeId; budget: number | null; date: string | null; note: string | null; allowEarlyDraw: boolean };
  themes: Record<string, string>;
  t: Record<"settings" | "eventName" | "theme" | "budget" | "date" | "note" | "notePh" | "allowEarly" | "save" | "loading", string>;
}) {
  const [state, action] = useActionState(updateSettingsAction.bind(null, eventId), undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{t.settings}</h2>
      <label className="label flex flex-col gap-2">
        {t.eventName}
        <input name="eventName" required maxLength={80} defaultValue={values.name} className="input font-normal" />
      </label>
      <fieldset>
        <legend className="label mb-2">{t.theme}</legend>
        <ThemePicker value={values.theme} labels={themes} />
      </fieldset>
      <div className="grid grid-cols-2 gap-2">
        <label className="label flex flex-col gap-2">
          {t.budget}
          <input name="budget" type="number" inputMode="numeric" min={0} max={1000000} defaultValue={values.budget ?? ""} className="input font-normal" />
        </label>
        <label className="label flex flex-col gap-2">
          {t.date}
          <input name="date" type="date" defaultValue={values.date ?? ""} className="input font-normal" />
        </label>
      </div>
      <label className="label flex flex-col gap-2">
        {t.note}
        <textarea name="note" maxLength={300} rows={2} defaultValue={values.note ?? ""} placeholder={t.notePh} className="input h-auto py-3 font-normal" />
      </label>
      <label className="card flex items-center justify-between gap-3 !rounded-2xl !py-3.5 text-sm font-semibold">
        {t.allowEarly}
        <input type="checkbox" name="allowEarlyDraw" defaultChecked={values.allowEarlyDraw} className="h-6 w-6 shrink-0 accent-[var(--accent)]" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pending={t.loading} className="btn-secondary w-full">
        {t.save}
      </SubmitButton>
    </form>
  );
}

type Person = { id: string; name: string; joined: boolean; isOrganizer: boolean; hasEmail: boolean };
type PT = Record<"title" | "waiting" | "inGame" | "you" | "addNamePh" | "add" | "locked" | "resetLink" | "resetLinkHint" | "sendEmail" | "emailSent" | "copy" | "copied" | "del" | "loading", string> & {
  removeConfirm: Record<string, string>;
  resetFor: Record<string, string>;
};

export function Participants({ eventId, people, locked, t }: { eventId: string; people: Person[]; locked: boolean; t: PT }) {
  const [state, action] = useActionState(addParticipantAction.bind(null, eventId), undefined);
  const [reset, setReset] = useState<{ id: string; url: string; hasEmail: boolean } | null>(null);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const { copied, copy } = useCopy();

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      {locked && <p className="text-sm leading-relaxed text-muted">{t.locked}</p>}
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {people.map((p) => (
            <motion.li key={p.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} className="card flex items-center gap-2 !rounded-2xl !py-2 !pl-4 !pr-2">
              <span className="min-w-0 flex-1 truncate font-semibold">
                {p.name}
                {p.isOrganizer && <span className="font-normal text-muted"> ({t.you})</span>}
              </span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${p.joined ? "bg-accent text-on-accent" : "bg-surface-2 text-muted"}`}>{p.joined ? t.inGame : t.waiting}</span>
              {!p.isOrganizer && p.joined && (
                <button
                  type="button"
                  aria-label={`${t.resetLink}: ${p.name}`}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      setSent(false);
                      const r = await createResetLinkAction(eventId, p.id);
                      if (r.url) setReset({ id: p.id, url: r.url, hasEmail: !!r.hasEmail });
                    })
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="8" cy="15" r="4" />
                    <path d="M10.8 12.2L20 3M16 7l3 3" />
                  </svg>
                </button>
              )}
              {!locked && (
                <button
                  type="button"
                  aria-label={`${t.del}: ${p.name}`}
                  disabled={pending}
                  onClick={() =>
                    confirm(t.removeConfirm[p.id]) &&
                    start(async () => {
                      const r = await removeParticipantAction(eventId, p.id);
                      setErr(r?.error ?? null);
                    })
                  }
                  className="flex h-11 w-11 items-center justify-center rounded-xl text-muted"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {err && <FormMessage state={{ error: err }} />}

      {reset && (
        <div className="card flex flex-col gap-2 !rounded-2xl border-2 border-accent-2">
          <span className="text-sm font-semibold">{t.resetFor[reset.id]}</span>
          <span className="text-xs leading-relaxed text-muted">{t.resetLinkHint}</span>
          <div className="truncate rounded-xl bg-surface-2 px-3 py-2.5 font-mono text-xs">{reset.url}</div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copy(reset.url)} className="btn-secondary text-sm">
              {copied ? t.copied : t.copy}
            </button>
            {reset.hasEmail && (
              <button
                type="button"
                disabled={pending || sent}
                onClick={() => start(async () => setSent((await emailResetLinkAction(eventId, reset.id)).ok))}
                className="btn-secondary text-sm"
              >
                {sent ? t.emailSent : t.sendEmail}
              </button>
            )}
          </div>
        </div>
      )}

      {!locked && (
        <form ref={formRef} action={action} className="flex gap-2">
          <input name="name" required maxLength={40} placeholder={t.addNamePh} aria-label={t.addNamePh} className="input min-w-0 flex-1 border-dashed" />
          <SubmitButton pending="…" className="btn bg-accent-2 text-on-accent-2">
            {t.add}
          </SubmitButton>
        </form>
      )}
      <FormMessage state={state?.error ? state : undefined} />
    </section>
  );
}

export function Exclusions({
  eventId,
  people,
  exclusions,
  locked,
  t,
}: {
  eventId: string;
  people: { id: string; name: string }[];
  exclusions: { a: string; b: string; label: string }[];
  locked: boolean;
  t: Record<"title" | "hint" | "add" | "del" | "loading", string>;
}) {
  const [state, action] = useActionState(addExclusionAction.bind(null, eventId), undefined);
  const [, start] = useTransition();
  if (people.length < 3) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{t.title}</h2>
      <p className="text-sm text-muted">{t.hint}</p>
      {exclusions.map((e) => (
        <div key={e.a + e.b} className="card flex items-center justify-between gap-2 !rounded-2xl !py-2 !pl-4 !pr-2">
          <span className="font-semibold">{e.label}</span>
          {!locked && (
            <button type="button" aria-label={`${t.del}: ${e.label}`} onClick={() => start(() => removeExclusionAction(eventId, e.a, e.b))} className="flex h-11 w-11 items-center justify-center rounded-xl text-xl text-muted">
              ×
            </button>
          )}
        </div>
      ))}
      {!locked && (
        <form action={action} className="grid grid-cols-[1fr_1fr_auto] gap-2">
          {(["a", "b"] as const).map((k, i) => (
            <select key={k} name={k} aria-label={`${t.title} ${i + 1}`} required defaultValue="" className="input min-w-0 px-2">
              <option value="" disabled>
                —
              </option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          ))}
          <SubmitButton pending="…" className="btn bg-accent-2 px-4 text-on-accent-2">
            +
          </SubmitButton>
        </form>
      )}
      <FormMessage state={state?.error ? state : undefined} />
    </section>
  );
}

export function DangerZone({ eventId, locked, t }: { eventId: string; locked: boolean; t: Record<"resetDraws" | "resetConfirm" | "deleteEvent" | "deleteConfirm", string> }) {
  const [pending, start] = useTransition();
  return (
    <section className="mt-4 flex flex-col gap-2">
      {locked && (
        <button type="button" disabled={pending} onClick={() => confirm(t.resetConfirm) && start(() => resetDrawsAction(eventId))} className="btn border-2 border-danger text-danger">
          {t.resetDraws}
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => confirm(t.deleteConfirm) && start(() => deleteEventAction(eventId))} className="btn text-sm text-danger underline underline-offset-4">
        {t.deleteEvent}
      </button>
    </section>
  );
}
