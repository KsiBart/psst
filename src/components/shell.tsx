import type { ReactNode } from "react";
import { getLang, getT } from "@/lib/i18n";
import type { ThemeId } from "@/lib/themes";
import { EasterEggs } from "./easter-eggs";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";
import { Particles } from "./particles";

/** Page frame: theme scope, ambient animation, header. Mobile-first, centered column on desktop. */
export async function Shell({ theme = "frost", children, right }: { theme?: ThemeId; children: ReactNode; right?: ReactNode }) {
  const [t, lang] = await Promise.all([getT(), getLang()]);
  return (
    <div data-theme={theme} className="relative min-h-dvh bg-bg text-ink transition-colors">
      <Particles theme={theme} />
      <EasterEggs labels={t.eggs} />
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Logo />
          <div className="flex items-center gap-2">
            {right}
            <LangSwitch current={lang} label={t.lang.label} text={t.lang.switchTo} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-5">{children}</main>
      </div>
    </div>
  );
}
