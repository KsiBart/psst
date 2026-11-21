export const THEMES = ["frost", "confetti", "aurora"] as const;
export type ThemeId = (typeof THEMES)[number];

/** Swatches for theme pickers (mirrors the CSS variables in globals.css). */
export const THEME_SWATCH: Record<ThemeId, { bg: string; text: string; accent: string; accent2: string }> = {
  frost: { bg: "#0E1A2B", text: "#F4F7FB", accent: "#FF6B73", accent2: "#F6C85F" },
  confetti: { bg: "#FFF6EA", text: "#24170F", accent: "#C92A62", accent2: "#1F8A78" },
  aurora: { bg: "#151229", text: "#F3F0FF", accent: "#8FE3CF", accent2: "#C4A5FF" },
};

export function isTheme(v: unknown): v is ThemeId {
  return typeof v === "string" && (THEMES as readonly string[]).includes(v);
}
