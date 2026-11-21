"use client";

import { useEffect, useRef, useState } from "react";
import type { ThemeId } from "@/lib/themes";

type P = { x: number; y: number; vx: number; vy: number; s: number; rot: number; vr: number; color: string; phase: number; life?: number };

const PALETTE: Record<ThemeId, string[]> = {
  frost: ["#ffffff", "#e3eefc", "#cfe2ff"],
  confetti: ["#C92A62", "#1F8A78", "#F2A541", "#5B7CFA", "#FF8FB1"],
  aurora: ["#E9E2FF", "#8FE3CF", "#C4A5FF"],
};
const BURST = ["#FF6B73", "#F6C85F", "#8FE3CF", "#5B7CFA", "#C92A62", "#ffffff"];

/** Ambient background animation: snow, confetti or twinkling stars. Also hosts two easter eggs. */
export function Particles({ theme: initial }: { theme: ThemeId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  // live preview from the theme picker overrides the page theme until the page theme changes
  const [preview, setPreview] = useState<{ base: ThemeId; theme: ThemeId } | null>(null);
  const theme = preview && preview.base === initial ? preview.theme : initial;
  const baseRef = useRef(initial);
  useEffect(() => {
    baseRef.current = initial;
  }, [initial]);
  useEffect(() => {
    const onTheme = (e: Event) => setPreview({ base: baseRef.current, theme: (e as CustomEvent<ThemeId>).detail });
    window.addEventListener("psst:theme", onTheme);
    return () => window.removeEventListener("psst:theme", onTheme);
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = PALETTE[theme];
    let w = 0, h = 0, raf = 0, giftsUntil = 0, last = performance.now();
    let parts: P[] = [];
    let burst: P[] = [];

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const make = (initial: boolean): P => {
      const base = { x: rand(0, w), y: initial ? rand(0, h) : rand(-40, -10), rot: rand(0, Math.PI * 2), phase: rand(0, Math.PI * 2), color: colors[Math.floor(rand(0, colors.length))] };
      if (theme === "confetti") return { ...base, vx: rand(-15, 15), vy: rand(35, 75), s: rand(5, 9), vr: rand(-3, 3) };
      if (theme === "aurora") return { ...base, y: rand(0, h), vx: rand(-4, 4), vy: rand(-6, -2), s: rand(1, 2.6), vr: rand(0.6, 1.8) };
      return { ...base, vx: rand(-10, 10), vy: rand(25, 60), s: rand(1.5, 3.8), vr: 0 };
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, (w * h) / (theme === "aurora" ? 9000 : 14000)));
      parts = Array.from({ length: count }, () => make(true));
    };

    const drawGift = (p: P, size: number) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * 0.3);
      ctx.fillStyle = p.color === "#ffffff" ? "#FF6B73" : p.color;
      ctx.fillRect(-size, -size, size * 2, size * 2);
      ctx.fillStyle = "#F6C85F";
      ctx.fillRect(-size * 0.2, -size, size * 0.4, size * 2);
      ctx.fillRect(-size, -size * 0.2, size * 2, size * 0.4);
      ctx.restore();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      const gifts = t < giftsUntil;
      for (const p of parts) {
        if (gifts) { drawGift(p, 6); continue; }
        if (theme === "confetti") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = 0.75;
          ctx.fillRect(-p.s / 2, -p.s, p.s, p.s * 1.8 * Math.abs(Math.cos(p.rot)) + 1);
          ctx.restore();
        } else {
          const alpha = theme === "aurora" ? 0.25 + 0.75 * Math.abs(Math.sin(t / 1000 * p.vr + p.phase)) : 0.8;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      for (const b of burst) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, b.life ?? 0);
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.fillStyle = b.color;
        ctx.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 1.6);
        ctx.restore();
      }
    };

    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      for (const p of parts) {
        p.x += (p.vx + Math.sin(t / 1200 + p.phase) * 12) * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > h + 20 || p.y < -60 || p.x < -30 || p.x > w + 30) Object.assign(p, make(false), theme === "aurora" ? { y: h + 10 } : {});
      }
      burst = burst.filter((b) => (b.life = (b.life ?? 1) - dt * 0.6) > 0);
      for (const b of burst) {
        b.vy += 500 * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.rot += b.vr * dt;
      }
      draw(t);
      raf = requestAnimationFrame(step);
    };

    const onGifts = () => {
      giftsUntil = performance.now() + 12000;
      if (reduce) draw(performance.now());
    };
    const onBurst = (e: Event) => {
      if (reduce) return;
      const d = (e as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
      const x = d.x ?? w / 2, y = d.y ?? h / 2.5;
      for (let i = 0; i < 140; i++) {
        const a = rand(0, Math.PI * 2), v = rand(150, 520);
        burst.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 250, s: rand(5, 9), rot: rand(0, 6), vr: rand(-10, 10), color: BURST[i % BURST.length], phase: 0, life: rand(0.9, 1.4) });
      }
    };
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(step);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("psst:gifts", onGifts);
    window.addEventListener("psst:burst", onBurst);
    document.addEventListener("visibilitychange", onVisibility);
    if (reduce) draw(0);
    else raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("psst:gifts", onGifts);
      window.removeEventListener("psst:burst", onBurst);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [theme]);

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}

export function fire(name: "psst:gifts" | "psst:burst" | "psst:reindeer" | "psst:hohoho" | "psst:theme", detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
