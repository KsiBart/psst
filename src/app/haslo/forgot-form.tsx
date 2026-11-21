"use client";

import { useActionState } from "react";
import { organizerForgotAction } from "@/app/actions/auth";
import { FormMessage, SubmitButton } from "@/components/forms";

export function ForgotForm({ t }: { t: { submit: string; email: string; loading: string } }) {
  const [state, action] = useActionState(organizerForgotAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="label flex flex-col gap-2">
        {t.email}
        <input name="email" type="email" required autoComplete="email" className="input font-normal" />
      </label>
      <FormMessage state={state} />
      {!state?.ok && <SubmitButton pending={t.loading}>{t.submit}</SubmitButton>}
    </form>
  );
}
