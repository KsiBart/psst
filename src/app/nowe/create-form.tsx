"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { createEventAction } from "@/app/actions/auth";
import { FormMessage, PasswordInput, SubmitButton, ThemePicker } from "@/components/forms";
import type { pl } from "@/lib/i18n/dict";

type Props = {
  loggedIn: boolean;
  defaultName: string;
  t: typeof pl.create;
  themes: typeof pl.themes;
  common: { add: string; email: string; password: string; show: string; hide: string; loading: string; delete: string };
};

export function CreateForm({ loggedIn, defaultName, t, themes, common }: Props) {
  const [state, action] = useActionState(createEventAction, undefined);
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [takePart, setTakePart] = useState(true);

  const add = () => {
    const parts = draft.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
    setNames((prev) => {
      const out = [...prev];
      for (const p of parts) if (!out.some((n) => n.toLowerCase() === p.toLowerCase())) out.push(p.slice(0, 40));
      return out;
    });
    setDraft("");
  };

  return (
    <form action={action} className="flex flex-col gap-5">
      <label className="label flex flex-col gap-2">
        {t.eventName}
        <input name="eventName" required maxLength={80} placeholder={t.eventNamePh} className="input font-normal" />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="label mb-2">{t.theme}</legend>
        <ThemePicker value="frost" labels={themes} />
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <label className="label flex flex-col gap-2">
          {t.budget}
          <input name="budget" type="number" inputMode="numeric" min={0} max={1000000} placeholder="100" className="input font-normal" />
        </label>
        <label className="label flex flex-col gap-2">
          {t.date}
          <input name="date" type="date" className="input font-normal" />
        </label>
      </div>

      <label className="label flex flex-col gap-2">
        {t.note}
        <textarea name="note" maxLength={300} rows={2} placeholder={t.notePh} className="input h-auto py-3 font-normal" />
      </label>

      <div className="flex flex-col gap-2">
        <span className="label">
          {t.participants} ({names.length + (takePart ? 1 : 0)})
        </span>
        <ul className="flex flex-wrap gap-1.5">
          <AnimatePresence initial={false}>
            {names.map((n) => (
              <motion.li key={n} layout initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} className="chip flex items-center gap-1 !py-1 !pr-1">
                {n}
                <button type="button" aria-label={`${common.delete} ${n}`} onClick={() => setNames(names.filter((x) => x !== n))} className="flex h-7 w-7 items-center justify-center rounded-full text-muted">
                  ×
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            aria-label={t.addNamePh}
            placeholder={t.addNamePh}
            maxLength={200}
            className="input min-w-0 flex-1 border-dashed"
            enterKeyHint="done"
          />
          <button type="button" onClick={add} className="btn bg-accent-2 text-on-accent-2">
            {common.add}
          </button>
        </div>
        <input type="hidden" name="names" value={JSON.stringify(names)} />
      </div>

      <label className="card flex items-center justify-between gap-3 !py-3.5 text-sm font-semibold">
        {t.takePart}
        <input type="checkbox" name="takePart" checked={takePart} onChange={(e) => setTakePart(e.target.checked)} className="h-6 w-6 shrink-0 accent-[var(--accent)]" />
      </label>

      {(takePart || !loggedIn) && (
        <label className="label flex flex-col gap-2">
          {t.yourName}
          <input name="yourName" required maxLength={40} defaultValue={defaultName} autoComplete="given-name" className="input font-normal" />
        </label>
      )}

      {!loggedIn && (
        <fieldset className="card flex flex-col gap-3">
          <legend className="sr-only">{t.account}</legend>
          <h2 className="font-semibold">{t.account}</h2>
          <p className="text-sm leading-relaxed text-muted">{t.accountHint}</p>
          <label className="label flex flex-col gap-2">
            {common.email}
            <input name="email" type="email" required autoComplete="email" className="input font-normal" />
          </label>
          <label htmlFor="org-pw" className="label">
            {common.password} <span className="font-normal text-muted">· {t.passwordHint}</span>
          </label>
          <PasswordInput id="org-pw" autoComplete="new-password" minLength={8} showLabel={common.show} hideLabel={common.hide} />
        </fieldset>
      )}

      <FormMessage state={state} />
      <SubmitButton pending={common.loading} className="btn-primary h-14 w-full text-lg">
        {t.submit}
      </SubmitButton>
    </form>
  );
}
