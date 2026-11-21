import "server-only";
import { cookies } from "next/headers";
import { en, pl, type Dict } from "./dict";

export type Lang = "pl" | "en";
export const LANG_COOKIE = "psst_lang";

export async function getLang(): Promise<Lang> {
  return (await cookies()).get(LANG_COOKIE)?.value === "en" ? "en" : "pl";
}

export async function getT(): Promise<Dict> {
  return (await getLang()) === "en" ? en : pl;
}

export function formatDate(iso: string | null, lang: Lang) {
  if (!iso) return null;
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "en" ? "en-GB" : "pl-PL", { day: "numeric", month: "long", timeZone: "UTC" });
}

export function formatMoney(amount: number | null, currency: string, lang: Lang) {
  if (amount == null) return null;
  return new Intl.NumberFormat(lang === "en" ? "en-GB" : "pl-PL", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}
