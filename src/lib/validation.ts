import { z } from "zod";

export const personName = z.string().trim().min(1).max(40);
export const email = z.string().trim().toLowerCase().max(200).pipe(z.email());
export const participantPassword = z.string().min(6).max(200);
export const organizerPassword = z.string().min(8).max(200);

export function optionalEmail(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return { ok: true as const, value: null };
  const r = email.safeParse(s);
  return r.success ? { ok: true as const, value: r.data } : { ok: false as const, value: null };
}

/** Accepts only http(s) links; returns normalized href or null. */
export function safeUrl(input: string): string | null | false {
  const s = input.trim();
  if (!s) return null;
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (!u.hostname.includes(".")) return false;
    return u.toString().slice(0, 500);
  } catch {
    return false;
  }
}

export function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

export function uniqueNames(names: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of names) {
    const n = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    out.push(n);
  }
  return out;
}
