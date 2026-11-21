"use client";

import { useActionState } from "react";
import { organizerLoginAction } from "@/app/actions/auth";
import { FormMessage, PasswordInput, SubmitButton } from "@/components/forms";

export function LoginForm({ t }: { t: { submit: string; email: string; password: string; show: string; hide: string; loading: string } }) {
  const [state, action] = useActionState(organizerLoginAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="label flex flex-col gap-2">
        {t.email}
        <input name="email" type="email" required autoComplete="email" className="input font-normal" />
      </label>
      <label htmlFor="pw" className="label -mb-2">
        {t.password}
      </label>
      <PasswordInput id="pw" autoComplete="current-password" showLabel={t.show} hideLabel={t.hide} />
      <FormMessage state={state} />
      <SubmitButton pending={t.loading}>{t.submit}</SubmitButton>
    </form>
  );
}
