"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { joinOrLoginAction, participantForgotAction } from "@/app/actions/participant";
import { FormMessage, PasswordInput, SubmitButton } from "@/components/forms";

type Person = { id: string; name: string; joined: boolean; isOrganizer: boolean };
type T = Record<"whoAreYou" | "joined" | "free" | "newHint" | "emailOptional" | "emailHint" | "passwordPh" | "join" | "login" | "forgot" | "joinedNote" | "organizerEntry" | "show" | "hide" | "loading" | "organizerLogin", string> & {
  hiNew: Record<string, string>;
  welcomeBack: Record<string, string>;
};

export function JoinForm({ code, people, t }: { code: string; people: Person[]; t: T }) {
  const [picked, setPicked] = useState<Person | null>(null);
  const [state, action] = useActionState(joinOrLoginAction, undefined);
  const [forgotState, forgotAction] = useActionState(participantForgotAction, undefined);

  return (
    <>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">{t.whoAreYou}</h2>
        <div role="radiogroup" aria-label={t.whoAreYou} className="grid grid-cols-3 gap-2">
          {people.map((p) => {
            const sel = picked?.id === p.id;
            return (
              <motion.button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={sel}
                onClick={() => setPicked(p)}
                whileTap={{ scale: 0.94 }}
                animate={{ scale: sel ? 1.04 : 1 }}
                className={`flex min-h-14 flex-col items-center justify-center rounded-2xl border-2 px-1 py-2 text-[15px] font-semibold transition-colors ${
                  sel ? "border-accent bg-accent text-on-accent" : "border-surface-2 bg-surface text-ink"
                }`}
              >
                <span className="max-w-full truncate">{p.name}</span>
                <span className="text-[11px] font-medium opacity-80">{p.joined ? t.joined : t.free}</span>
              </motion.button>
            );
          })}
        </div>
      </section>

      <AnimatePresence mode="wait">
        {picked && (
          <motion.form
            key={picked.id}
            action={action}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col gap-3"
          >
            <input type="hidden" name="code" value={code} />
            <input type="hidden" name="participantId" value={picked.id} />
            {picked.isOrganizer && !picked.joined ? null : picked.isOrganizer ? (
              <div className="card flex flex-col gap-3">
                <p className="text-sm">{t.organizerEntry}</p>
                <Link href="/logowanie" className="btn-primary">
                  {t.organizerLogin}
                </Link>
              </div>
            ) : picked.joined ? (
              <>
                <label htmlFor="pw" className="label">
                  {t.welcomeBack[picked.id]}
                </label>
                <PasswordInput id="pw" placeholder={t.passwordPh} autoComplete="current-password" showLabel={t.show} hideLabel={t.hide} autoFocus />
                <FormMessage state={state} />
                <SubmitButton pending={t.loading} className="btn-primary h-14 w-full text-lg">
                  {t.login}
                </SubmitButton>
                <button type="submit" formAction={forgotAction} formNoValidate className="mx-auto text-sm font-semibold text-accent-2 underline-offset-4 hover:underline">
                  {t.forgot}
                </button>
                <FormMessage state={forgotState} />
              </>
            ) : (
              <>
                <label htmlFor="pw" className="label">
                  {t.hiNew[picked.id]}
                </label>
                <PasswordInput id="pw" autoComplete="new-password" minLength={6} showLabel={t.show} hideLabel={t.hide} autoFocus />
                <p className="text-xs leading-relaxed text-muted">{t.newHint}</p>
                <label className="label mt-1 flex flex-col gap-2">
                  {t.emailOptional}
                  <input name="email" type="email" autoComplete="email" className="input font-normal" />
                  <span className="text-xs font-normal text-muted">{t.emailHint}</span>
                </label>
                <FormMessage state={state} />
                <SubmitButton pending={t.loading} className="btn-primary h-14 w-full text-lg">
                  {t.join}
                </SubmitButton>
              </>
            )}
          </motion.form>
        )}
      </AnimatePresence>
      {!picked && <p className="text-center text-xs text-muted">{t.joinedNote}</p>}
    </>
  );
}
