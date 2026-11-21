"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, events, organizers, participants } from "@/db";
import { randomCode } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { getT } from "@/lib/i18n";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { consumeResetToken, createResetToken } from "@/lib/reset";
import { getOrganizer, signInOrganizer, signInParticipant, signOutOrganizer } from "@/lib/session";
import { isTheme } from "@/lib/themes";
import { appUrl } from "@/lib/url";
import { email as emailSchema, organizerPassword, participantPassword, personName, str, uniqueNames } from "@/lib/validation";

export type FormState = { error?: string; ok?: boolean; message?: string } | undefined;

export async function createEventAction(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  if (!(await rateLimit(`create:${await clientIp()}`, 20, 3600))) return { error: t.common.tooMany };

  const name = str(fd, "eventName").trim().slice(0, 80);
  if (!name) return { error: t.validation.eventName };
  const theme = str(fd, "theme");
  const budgetRaw = str(fd, "budget").trim();
  const budget = budgetRaw ? Math.max(0, Math.min(1_000_000, Math.round(Number(budgetRaw)))) : null;
  if (budgetRaw && !Number.isFinite(Number(budgetRaw))) return { error: t.common.genericError };
  const date = str(fd, "date");
  const exchangeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  const note = str(fd, "note").trim().slice(0, 300) || null;
  const takePart = fd.get("takePart") === "on";

  let names: string[] = [];
  try {
    const parsed = JSON.parse(str(fd, "names") || "[]");
    if (Array.isArray(parsed)) names = uniqueNames(parsed.filter((x): x is string => typeof x === "string")).slice(0, 100);
  } catch {
    return { error: t.common.genericError };
  }

  // Organizer: existing session, or create / sign in to an account inline.
  let organizer = await getOrganizer();
  const myNameRaw = str(fd, "yourName");
  if (!organizer) {
    const e = emailSchema.safeParse(str(fd, "email"));
    if (!e.success) return { error: t.validation.email };
    const pw = organizerPassword.safeParse(str(fd, "password"));
    if (!pw.success) return { error: t.validation.passwordShortOrg };
    const n = personName.safeParse(myNameRaw);
    if (!n.success) return { error: t.validation.nameRequired };
    const existing = await db.query.organizers.findFirst({ where: eq(organizers.email, e.data) });
    if (existing) {
      if (!(await verifyPassword(existing.passwordHash, pw.data))) return { error: t.login.invalid };
      organizer = { id: existing.id, name: existing.name, email: existing.email };
    } else {
      const [o] = await db
        .insert(organizers)
        .values({ email: e.data, name: n.data, passwordHash: await hashPassword(pw.data) })
        .returning();
      organizer = { id: o.id, name: o.name, email: o.email };
    }
  }

  const myName = personName.safeParse(myNameRaw || organizer.name);
  if (takePart) {
    if (!myName.success) return { error: t.validation.nameRequired };
    names = names.filter((n) => n.toLowerCase() !== myName.data.toLowerCase());
  }
  if (names.length + (takePart ? 1 : 0) < 3) return { error: t.create.minPeople };

  const eventId = await db.transaction(async (tx) => {
    const [ev] = await tx
      .insert(events)
      .values({ organizerId: organizer.id, name, theme: isTheme(theme) ? theme : "frost", budget, exchangeDate, note, joinCode: randomCode(10) })
      .returning({ id: events.id });
    const rows: (typeof participants.$inferInsert)[] = names.map((n) => ({ eventId: ev.id, name: n }));
    if (takePart && myName.success) rows.unshift({ eventId: ev.id, name: myName.data, organizerId: organizer.id, joinedAt: new Date() });
    await tx.insert(participants).values(rows);
    return ev.id;
  });

  await signInOrganizer(organizer.id);
  const base = await appUrl();
  await sendEmail({
    to: organizer.email,
    subject: t.email.welcomeSubject(name),
    heading: t.email.welcomeHeading,
    body: t.email.welcomeBody,
    cta: t.email.welcomeCta,
    url: `${base}/panel/${eventId}`,
  }).catch(() => false);
  redirect(`/panel/${eventId}?nowe=1`);
}

export async function organizerLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const e = emailSchema.safeParse(str(fd, "email"));
  const password = str(fd, "password").slice(0, 200);
  if (!e.success) return { error: t.login.invalid };
  const ip = await clientIp();
  if (!(await rateLimit(`orglogin:ip:${ip}`, 30, 900)) || !(await rateLimit(`orglogin:${e.data}`, 10, 900))) return { error: t.common.tooMany };
  const o = await db.query.organizers.findFirst({ where: eq(organizers.email, e.data) });
  if (!o) {
    await burnPasswordCheck(password);
    return { error: t.login.invalid };
  }
  if (!(await verifyPassword(o.passwordHash, password))) return { error: t.login.invalid };
  await signInOrganizer(o.id);
  const next = str(fd, "next");
  redirect(next.startsWith("/panel") ? next : "/panel");
}

export async function organizerLogoutAction() {
  await signOutOrganizer();
  redirect("/");
}

export async function organizerForgotAction(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const e = emailSchema.safeParse(str(fd, "email"));
  if (!e.success) return { error: t.validation.email };
  if (!(await rateLimit(`forgot:ip:${await clientIp()}`, 10, 3600)) || !(await rateLimit(`forgot:${e.data}`, 3, 3600))) return { error: t.common.tooMany };
  const o = await db.query.organizers.findFirst({ where: eq(organizers.email, e.data) });
  if (o) {
    const token = await createResetToken({ organizerId: o.id }, 2);
    await sendEmail({
      to: o.email,
      subject: t.email.resetSubject,
      heading: t.email.resetHeading,
      body: t.email.resetBody,
      cta: t.email.resetCta,
      url: `${await appUrl()}/haslo/${token}`,
    });
  }
  return { ok: true, message: t.forgot.sent };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  if (!(await rateLimit(`reset:${await clientIp()}`, 20, 900))) return { error: t.common.tooMany };
  const token = str(fd, "token");
  const pw = participantPassword.safeParse(str(fd, "password"));
  if (!pw.success) return { error: t.validation.passwordShort };
  const kindIsOrg = fd.get("kind") === "organizer";
  if (kindIsOrg && !organizerPassword.safeParse(pw.data).success) return { error: t.validation.passwordShortOrg };
  const info = await consumeResetToken(token, pw.data);
  if (!info) return { error: t.reset.invalid };
  if (info.kind === "participant") {
    await signInParticipant(info.participantId);
    redirect(`/e/${info.eventId}`);
  }
  await signInOrganizer(info.organizerId);
  redirect("/panel");
}
