"use client";

import { AnimatePresence, motion } from "motion/react";
import { useActionState, useState } from "react";
import { addWishAction, deleteWishAction } from "@/app/actions/participant";
import { FormMessage, SubmitButton } from "@/components/forms";
import { fire } from "@/components/particles";

type Wish = { id: string; title: string; url: string | null };
type T = Record<"title" | "count" | "addIdea" | "ideaPh" | "linkPh" | "add" | "cancel" | "del" | "loading", string>;

export function Wishlist({ eventId, wishes, t }: { eventId: string; wishes: Wish[]; t: T }) {
  const [adding, setAdding] = useState(false);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof addWishAction>>, fd: FormData) => {
    const r = await addWishAction(eventId, prev, fd);
    if (r?.ok) setAdding(false);
    return r;
  }, undefined);

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{t.title}</h2>
        <span className="text-sm text-muted">{t.count}</span>
      </div>
      <AnimatePresence initial={false}>
        {wishes.map((w, i) => (
          <motion.div key={w.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -40 }} className="card flex items-center gap-3 !rounded-2xl !py-2.5 !pr-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold">{i + 1}</span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="break-words font-semibold">{w.title}</span>
              {w.url && (
                <a href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-xs font-semibold text-accent-2">
                  {new URL(w.url).hostname.replace(/^www\./, "")} ↗
                </a>
              )}
            </div>
            <button type="button" aria-label={`${t.del}: ${w.title}`} onClick={() => deleteWishAction(eventId, w.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
              </svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>

      {wishes.length < 3 &&
        (adding ? (
          <motion.form action={action} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card flex flex-col gap-2 !rounded-2xl !p-3">
            <input
              name="title"
              required
              maxLength={120}
              placeholder={t.ideaPh}
              aria-label={t.ideaPh}
              autoFocus
              className="input"
              onChange={(e) => {
                if (/ho\s*ho\s*ho/i.test(e.target.value)) fire("psst:hohoho");
              }}
            />
            <input name="url" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" maxLength={500} placeholder={t.linkPh} aria-label={t.linkPh} className="input" />
            <FormMessage state={state} />
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setAdding(false)} className="btn-secondary">
                {t.cancel}
              </button>
              <SubmitButton pending={t.loading} className="btn-primary">
                {t.add}
              </SubmitButton>
            </div>
          </motion.form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="btn-ghost h-[52px]">
            {t.addIdea}
          </button>
        ))}
    </section>
  );
}
