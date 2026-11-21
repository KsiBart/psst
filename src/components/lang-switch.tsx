"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLang } from "@/app/actions/lang";

export function LangSwitch({ current, label, text }: { current: "pl" | "en"; label: string; text: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={label}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setLang(current === "pl" ? "en" : "pl");
          router.refresh();
        })
      }
      className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-surface px-3 text-sm font-bold text-muted"
    >
      {text}
    </button>
  );
}
