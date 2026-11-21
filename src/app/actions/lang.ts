"use server";

import { cookies } from "next/headers";
import { LANG_COOKIE } from "@/lib/i18n";

export async function setLang(lang: "pl" | "en") {
  (await cookies()).set(LANG_COOKIE, lang === "en" ? "en" : "pl", { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
