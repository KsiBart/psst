"use client";

import Link from "next/link";
import { useRef } from "react";
import { fire } from "./particles";

/** Brand mark. Secret: tap it 5× quickly for gift snow, press & hold for the sleigh. */
export function Logo({ href = "/" }: { href?: string }) {
  const taps = useRef<number[]>([]);
  const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);

  const onClick = (e: React.MouseEvent) => {
    if (held.current) {
      e.preventDefault();
      held.current = false;
      return;
    }
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 1500), now];
    if (taps.current.length >= 2) e.preventDefault(); // multi-tap = playing, not navigating
    if (taps.current.length >= 5) {
      taps.current = [];
      fire("psst:gifts");
    }
  };
  const start = () => {
    held.current = false;
    hold.current = setTimeout(() => {
      held.current = true;
      fire("psst:reindeer");
    }, 1200);
  };
  const stop = () => hold.current && clearTimeout(hold.current);

  return (
    <Link
      href={href}
      onClick={onClick}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onContextMenu={(e) => e.preventDefault()}
      className="flex select-none items-center gap-2 font-display text-[22px] font-extrabold tracking-tight"
      style={{ WebkitTouchCallout: "none" }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-accent text-lg text-on-accent">?</span>
      Psst!
    </Link>
  );
}
