"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/app/actions/auth";
import { FormMessage, PasswordInput, SubmitButton } from "@/components/forms";

export function ResetForm({ token, kind, t }: { token: string; kind: "organizer" | "participant"; t: { submit: string; password: string; show: string; hide: string; loading: string; hint: string } }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="kind" value={kind} />
      <label htmlFor="new-pw" className="label -mb-2">
        {t.password} {t.hint && <span className="font-normal text-muted">· {t.hint}</span>}
      </label>
      <PasswordInput id="new-pw" autoComplete="new-password" minLength={kind === "organizer" ? 8 : 6} showLabel={t.show} hideLabel={t.hide} autoFocus />
      <FormMessage state={state} />
      <SubmitButton pending={t.loading}>{t.submit}</SubmitButton>
    </form>
  );
}
