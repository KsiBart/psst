"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { drawAction, setGiftReadyAction } from "@/app/actions/participant";
import { GiftBox } from "@/components/gift-box";
import { fire } from "@/components/particles";

type Receiver = { name: string; wishes: { id: string; title: string; url: string | null }[] };
type T = Record<"drawTitle" | "drawLead" | "drawBtn" | "drawing" | "giftingFor" | "tapHide" | "tapShow" | "giftReady" | "theirWishlist" | "noWishes", string>;

export function DrawCard({ eventId, receiver, giftReady, waitingMsg, t }: { eventId: string; receiver: Receiver | null; giftReady: boolean; waitingMsg: string | null; t: T }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "shaking" | "open" | "done">(receiver ? "done" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState(false);
  const [, startTransition] = useTransition();
  const boxRef = useRef<HTMLDivElement>(null);

  // A fresh reveal: once the server data arrives while the box is shaking, open it.
  if (receiver && phase === "shaking") setPhase("open");
  useEffect(() => {
    if (phase !== "open") return;
    const r = boxRef.current?.getBoundingClientRect();
    const a = setTimeout(() => fire("psst:burst", r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : undefined), 150);
    const b = setTimeout(() => {
      setShown(true);
      setPhase("done");
    }, 750);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [phase]);

  // Easter egg: shake the phone while your match is visible → confetti.
  useEffect(() => {
    if (!receiver || !shown) return;
    let last = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.accelerationIncludingGravity;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      if (mag > 28 && Date.now() - last > 1500) {
        last = Date.now();
        fire("psst:burst");
      }
    };
    window.addEventListener("devicemotion", onMotion);
    return () => window.removeEventListener("devicemotion", onMotion);
  }, [receiver, shown]);

  const draw = async () => {
    setError(null);
    setPhase("shaking");
    const [res] = await Promise.all([drawAction(eventId), new Promise((r) => setTimeout(r, 1300))]);
    if (res.error) {
      setPhase("idle");
      setError(res.error);
      return;
    }
    startTransition(() => router.refresh());
  };

  if (!receiver || phase === "shaking" || phase === "open") {
    return (
      <section className="card flex flex-col items-center gap-3 !rounded-[28px] !py-6 text-center">
        <div ref={boxRef}>
          <GiftBox phase={phase === "done" ? "idle" : phase} />
        </div>
        <h2 className="font-display text-[22px] font-extrabold">{t.drawTitle}</h2>
        <p className="text-sm leading-relaxed text-muted">{waitingMsg ?? t.drawLead}</p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger">
            {error}
          </p>
        )}
        <button type="button" onClick={draw} disabled={phase === "shaking" || phase === "open" || !!waitingMsg} className="btn-primary h-14 w-full text-lg">
          {phase === "shaking" || phase === "open" ? t.drawing : t.drawBtn}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        aria-expanded={shown}
        className="card flex flex-col items-center gap-2.5 !rounded-[28px] !py-6 text-center"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{t.giftingFor}</span>
        <AnimatePresence mode="wait" initial={false}>
          {shown ? (
            <motion.div
              key="name"
              initial={{ scale: 0.5, opacity: 0, rotate: -6 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14 }}
              className="flex flex-col items-center gap-2.5"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-2 font-display text-4xl font-extrabold text-on-accent-2">{receiver.name.slice(0, 1).toUpperCase()}</span>
              <span className="break-all font-display text-[44px] font-extrabold leading-none tracking-tight">{receiver.name}</span>
            </motion.div>
          ) : (
            <motion.div key="hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-2.5">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-2">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.9 5.1A10 10 0 0112 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.4 8 2.8 10.1 2 12c1 2.5 5 7 10 7 1.8 0 3.4-.5 4.8-1.3" />
                </svg>
              </span>
              <span className="font-display text-[44px] font-extrabold leading-none tracking-[0.2em]">••••</span>
            </motion.div>
          )}
        </AnimatePresence>
        <span className="text-xs text-muted">{shown ? t.tapHide : t.tapShow}</span>
      </button>

      {shown && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-col gap-2.5">
          <h2 className="text-lg font-semibold">{t.theirWishlist}</h2>
          {receiver.wishes.length === 0 && <p className="card !py-4 text-sm text-muted">{t.noWishes}</p>}
          {receiver.wishes.map((w, i) => (
            <div key={w.id} className="card flex items-center gap-3 !rounded-2xl !py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm font-bold">{i + 1}</span>
              <div className="flex min-w-0 flex-col">
                <span className="break-words font-semibold">{w.title}</span>
                {w.url && (
                  <a href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="truncate text-xs font-semibold text-accent-2">
                    {new URL(w.url).hostname.replace(/^www\./, "")} ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      <label className="card flex items-center gap-3 !rounded-2xl !py-3.5 text-[15px] font-semibold">
        <input
          type="checkbox"
          defaultChecked={giftReady}
          onChange={(e) => {
            const v = e.target.checked;
            if (v) fire("psst:burst");
            setGiftReadyAction(eventId, v);
          }}
          className="h-6 w-6 shrink-0 accent-[var(--accent)]"
        />
        {t.giftReady}
      </label>
    </section>
  );
}
