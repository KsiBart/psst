"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

/** Plays a short bell melody with WebAudio (no audio files). */
function jingle() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ac = new AC();
    // E E E, E E E, E G C D E (public-domain tune)
    const notes = [659, 659, 659, 0, 659, 659, 659, 0, 659, 784, 523, 587, 659];
    notes.forEach((f, i) => {
      if (!f) return;
      const t = ac.currentTime + i * 0.16;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + 0.32);
    });
    setTimeout(() => ac.close(), 3000);
  } catch {
    /* audio not available */
  }
}

function Reindeer({ nose }: { nose?: boolean }) {
  return (
    <svg width="74" height="60" viewBox="0 0 74 60" aria-hidden="true">
      <g fill="#8B5A3C" stroke="#5E3A26" strokeWidth="1.5">
        <ellipse cx="34" cy="34" rx="22" ry="10" />
        <rect x="14" y="40" width="4" height="16" rx="2" />
        <rect x="22" y="40" width="4" height="16" rx="2" />
        <rect x="42" y="40" width="4" height="16" rx="2" />
        <rect x="50" y="40" width="4" height="16" rx="2" />
        <path d="M52 30 L60 16 L66 18 L60 32 Z" />
        <ellipse cx="65" cy="16" rx="7" ry="5" />
      </g>
      <g stroke="#C9A27E" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M62 11 L58 2 M60 6 L55 5" />
        <path d="M67 11 L70 2 M69 6 L73 4" />
      </g>
      <circle cx="72" cy="17" r="3" fill={nose ? "#FF3B3B" : "#3A2418"} />
      <circle cx="65" cy="14" r="1.2" fill="#1a0f0a" />
      <path d="M12 32 q-6 -2 -8 2" stroke="#5E3A26" strokeWidth="2" fill="none" />
    </svg>
  );
}

function Sleigh() {
  return (
    <svg width="90" height="60" viewBox="0 0 90 60" aria-hidden="true">
      <path d="M8 20 H62 Q80 20 80 38 H20 Q8 38 8 26 Z" fill="#C92A62" stroke="#7A1238" strokeWidth="2" />
      <path d="M4 50 H74 Q86 50 86 42" stroke="#F6C85F" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M22 38 V50 M66 38 V50" stroke="#F6C85F" strokeWidth="3" />
      <rect x="20" y="6" width="16" height="14" fill="#1F8A78" />
      <rect x="40" y="2" width="14" height="18" fill="#5B7CFA" />
      <rect x="26" y="6" width="4" height="14" fill="#F6C85F" />
      <rect x="45" y="2" width="4" height="18" fill="#F6C85F" />
    </svg>
  );
}

/** Global easter eggs: Konami code (or long-press on the logo) → a sleigh flies by; "hohoho" → jingle + toast. */
export function EasterEggs({ labels }: { labels: { hohoho: string; gifts: string; reindeer: string } }) {
  const [flying, setFlying] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let pos = 0;
    let toastTimer: ReturnType<typeof setTimeout>;
    const say = (m: string) => {
      setToast(m);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(null), 2200);
    };
    const fly = () => {
      setFlying(true);
      say(labels.reindeer);
      setTimeout(() => setFlying(false), 5200);
    };
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = key === KONAMI[pos] ? pos + 1 : key === KONAMI[0] ? 1 : 0;
      if (pos === KONAMI.length) {
        pos = 0;
        fly();
      }
    };
    const onHo = () => {
      jingle();
      say(labels.hohoho);
    };
    const onGifts = () => say(labels.gifts);
    window.addEventListener("keydown", onKey);
    window.addEventListener("psst:reindeer", fly);
    window.addEventListener("psst:hohoho", onHo);
    window.addEventListener("psst:gifts", onGifts);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("psst:reindeer", fly);
      window.removeEventListener("psst:hohoho", onHo);
      window.removeEventListener("psst:gifts", onGifts);
      clearTimeout(toastTimer);
    };
  }, [labels]);

  return (
    <>
      <AnimatePresence>
        {flying && (
          <motion.div
            className="pointer-events-none fixed top-24 z-50 flex items-end gap-1"
            initial={{ x: "-110%", left: 0 }}
            animate={{ x: "110vw", y: [0, -30, 10, -20, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 5, ease: "linear" }}
            style={{ width: "max-content" }}
          >
            <Sleigh />
            <Reindeer />
            <Reindeer />
            <Reindeer nose />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            className="fixed bottom-6 left-1/2 z-50 rounded-full bg-accent-2 px-5 py-3 font-bold text-on-accent-2 shadow-lg"
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
