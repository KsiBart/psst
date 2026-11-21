"use client";

import { useFormStatus } from "react-dom";
import { useState, type ReactNode } from "react";
import { THEME_SWATCH, THEMES, type ThemeId } from "@/lib/themes";
import { fire } from "./particles";

export function SubmitButton({ children, pending: pendingLabel, className = "btn-primary w-full" }: { children: ReactNode; pending?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? (pendingLabel ?? "…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state?: { error?: string; message?: string } }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold text-danger">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p role="status" className="rounded-2xl bg-surface px-4 py-3 text-sm font-semibold">
        {state.message}
      </p>
    );
  return null;
}

export function PasswordInput({ id, name = "password", placeholder, autoComplete, minLength, showLabel, hideLabel, autoFocus }: { id: string; name?: string; placeholder?: string; autoComplete: string; minLength?: number; showLabel: string; hideLabel: string; autoFocus?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input id={id} name={name} type={show ? "text" : "password"} required minLength={minLength} maxLength={200} placeholder={placeholder} autoComplete={autoComplete} autoFocus={autoFocus} className="input pr-20" />
      <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-xl px-3 text-sm font-semibold text-muted">
        {show ? hideLabel : showLabel}
      </button>
    </div>
  );
}

/** Theme radio cards; previews the theme live on the page. */
export function ThemePicker({ value, labels, onChange }: { value: ThemeId; labels: Record<string, string>; onChange?: (t: ThemeId) => void }) {
  const [current, setCurrent] = useState<ThemeId>(value);
  const pick = (t: ThemeId) => {
    setCurrent(t);
    onChange?.(t);
    document.querySelector("[data-theme]")?.setAttribute("data-theme", t);
    fire("psst:theme", t);
  };
  return (
    <div role="radiogroup" className="grid grid-cols-3 gap-2">
      {THEMES.map((t) => {
        const sw = THEME_SWATCH[t];
        const sel = t === current;
        return (
          <label
            key={t}
            className="flex cursor-pointer flex-col items-start gap-2 rounded-2xl border-[3px] p-3 transition"
            style={{ background: sw.bg, color: sw.text, borderColor: sel ? "var(--accent-2)" : "transparent" }}
          >
            <input type="radio" name="theme" value={t} checked={sel} onChange={() => pick(t)} className="sr-only" />
            <span className="flex gap-1">
              <span className="h-4 w-4 rounded-full" style={{ background: sw.accent }} />
              <span className="h-4 w-4 rounded-full" style={{ background: sw.accent2 }} />
            </span>
            <span className="text-sm font-bold">{labels[t]}</span>
            <span className="text-[11px] opacity-80">{labels[`${t}Fx`]}</span>
          </label>
        );
      })}
    </div>
  );
}
