"use client";

import { useActionState, useState } from "react";
import { changePasswordAction, participantLogoutAction, updateEmailAction } from "@/app/actions/participant";
import { FormMessage, PasswordInput, SubmitButton } from "@/components/forms";

type T = Record<"account" | "emailLabel" | "newPassword" | "changePassword" | "calendar" | "logout" | "save" | "show" | "hide" | "loading", string>;

export function AccountSection({ eventId, email, hasPassword, hasDate, t }: { eventId: string; email: string; hasPassword: boolean; hasDate: boolean; t: T }) {
  const [open, setOpen] = useState(false);
  const [emailState, emailAction] = useActionState(updateEmailAction.bind(null, eventId), undefined);
  const [pwState, pwAction] = useActionState(changePasswordAction.bind(null, eventId), undefined);

  return (
    <section className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {hasDate ? (
          <a href={`/e/${eventId}/kalendarz`} className="btn-secondary text-sm">
            {t.calendar}
          </a>
        ) : (
          <span />
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="btn-secondary text-sm">
          {t.account}
        </button>
      </div>
      {open && (
        <div className="card flex flex-col gap-4">
          {hasPassword && (
            <>
              <form action={emailAction} className="flex flex-col gap-2">
                <label className="label flex flex-col gap-2">
                  {t.emailLabel}
                  <input name="email" type="email" defaultValue={email} autoComplete="email" className="input font-normal" />
                </label>
                <FormMessage state={emailState} />
                <SubmitButton pending={t.loading} className="btn-secondary">
                  {t.save}
                </SubmitButton>
              </form>
              <form action={pwAction} className="flex flex-col gap-2">
                <label htmlFor="np" className="label">
                  {t.newPassword}
                </label>
                <PasswordInput id="np" autoComplete="new-password" minLength={6} showLabel={t.show} hideLabel={t.hide} />
                <FormMessage state={pwState} />
                <SubmitButton pending={t.loading} className="btn-secondary">
                  {t.changePassword}
                </SubmitButton>
              </form>
            </>
          )}
          <form action={participantLogoutAction.bind(null, eventId)}>
            <SubmitButton className="btn w-full border-2 border-surface-2 text-muted">{t.logout}</SubmitButton>
          </form>
        </div>
      )}
    </section>
  );
}
