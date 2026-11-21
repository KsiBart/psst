"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

/** Wrapped present drawn with CSS. `phase` drives the shake / lid-off animation. */
export function GiftBox({ phase = "idle", size = 112 }: { phase?: "idle" | "shaking" | "open"; size?: number }) {
  const [singing, setSinging] = useState(false);
  useEffect(() => {
    const on = () => {
      setSinging(true);
      setTimeout(() => setSinging(false), 2200);
    };
    window.addEventListener("psst:hohoho", on);
    return () => window.removeEventListener("psst:hohoho", on);
  }, []);
  const s = size / 112;
  return (
    <motion.div
      aria-hidden="true"
      className={phase === "idle" && !singing ? "animate-wiggle" : ""}
      style={{ width: 112 * s, height: 104 * s, position: "relative" }}
      animate={
        phase === "shaking"
          ? { rotate: [0, -10, 9, -8, 7, -5, 4, 0], transition: { duration: 0.9, repeat: Infinity } }
          : singing
            ? { y: [0, -18, 0, -12, 0, -6, 0], transition: { duration: 1.4 } }
            : { rotate: 0, y: 0 }
      }
    >
      <div className="absolute bottom-0 rounded-[10px] bg-accent" style={{ left: 6 * s, right: 6 * s, height: 66 * s }} />
      <div className="absolute bg-accent-2" style={{ left: 47 * s, width: 18 * s, top: 38 * s, bottom: 0 }} />
      <motion.div
        className="absolute"
        style={{ left: 0, right: 0, top: 0, height: 44 * s }}
        animate={phase === "open" ? { y: -90 * s, rotate: -24, opacity: 0 } : { y: 0, rotate: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 120, damping: 12 }}
      >
        <div className="absolute rounded-lg bg-accent brightness-110" style={{ left: 0, right: 0, top: 22 * s, height: 22 * s }} />
        <div className="absolute bg-accent-2" style={{ left: 47 * s, width: 18 * s, top: 22 * s, height: 22 * s }} />
        <div className="absolute box-border border-accent-2" style={{ left: 30 * s, top: 2 * s, width: 24 * s, height: 22 * s, borderWidth: 6 * s, borderRadius: "50% 50% 0 50%" }} />
        <div className="absolute box-border border-accent-2" style={{ left: 58 * s, top: 2 * s, width: 24 * s, height: 22 * s, borderWidth: 6 * s, borderRadius: "50% 50% 50% 0" }} />
      </motion.div>
    </motion.div>
  );
}
