"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, count, eq, isNotNull, isNull } from "drizzle-orm";
import { assignments, db, events, exclusions, participants, wishes } from "@/db";
import { sealReceiver } from "@/lib/crypto";
import { generateAssignment } from "@/lib/draw";
import { sendEmail } from "@/lib/email";
import { getT } from "@/lib/i18n";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createResetToken } from "@/lib/reset";
import { getMyParticipant, isUuid, revokeParticipantSessions, signInParticipant, signOutParticipant } from "@/lib/session";
import { appUrl } from "@/lib/url";
import { optionalEmail, participantPassword, safeUrl, str } from "@/lib/validation";
import type { FormState } from "./auth";

async function participantInEvent(code: string, participantId: string) {
  if (!isUuid(participantId) || !code || code.length > 40) return null;
  const ev = await db.query.events.findFirst({ where: eq(events.joinCode, code) });
  if (!ev) return null;
  const p = await db.query.participants.findFirst({ where: and(eq(participants.id, participantId), eq(participants.eventId, ev.id)) });
  return p ? { ev, p } : null;
}

/** Join (first time: set password) or log in (returning). */
export async function joinOrLoginAction(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const found = await participantInEvent(str(fd, "code"), str(fd, "participantId"));
  if (!found) return { error: t.join.pickName };
  const { ev, p } = found;
  const ip = await clientIp();
  if (!(await rateLimit(`join:ip:${ip}`, 40, 900)) || !(await rateLimit(`join:p:${p.id}`, 10, 900))) return { error: t.common.tooMany };
  const password = str(fd, "password").slice(0, 200);

  if (!p.passwordHash) {
    if (p.organizerId) return { error: t.join.organizerEntry };
    const pw = participantPassword.safeParse(password);
    if (!pw.success) return { error: t.validation.passwordShort };
    const em = optionalEmail(fd.get("email"));
    if (!em.ok) return { error: t.validation.email };
    const claimed = await db
      .update(participants)
      .set({ passwordHash: await hashPassword(pw.data), email: em.value, joinedAt: new Date() })
      .where(and(eq(participants.id, p.id), isNull(participants.passwordHash)))
      .returning({ id: participants.id });
    if (!claimed.length) return { error: t.join.taken };
  } else if (!(await verifyPassword(p.passwordHash, password))) {
    return { error: t.join.invalid };
  }
  await signInParticipant(p.id);
  redirect(`/e/${ev.id}`);
}

export async function participantForgotAction(_: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const found = await participantInEvent(str(fd, "code"), str(fd, "participantId"));
  if (!(await rateLimit(`pforgot:ip:${await clientIp()}`, 10, 3600))) return { error: t.common.tooMany };
  if (found?.p.email && (await rateLimit(`pforgot:${found.p.id}`, 3, 3600))) {
    const token = await createResetToken({ participantId: found.p.id }, 2);
    await sendEmail({
      to: found.p.email,
      subject: t.email.resetSubject,
      heading: t.email.resetHeading,
      body: t.email.resetBody,
      cta: t.email.resetCta,
      url: `${await appUrl()}/haslo/${token}`,
    });
  } else if (!found) {
    await burnPasswordCheck("x");
  }
  return { ok: true, message: t.join.forgotSent };
}

async function me(eventId: string) {
  const p = await getMyParticipant(eventId);
  if (!p) redirect("/");
  return p;
}

export type DrawResult = { error?: string; ok?: boolean };

export async function drawAction(eventId: string): Promise<DrawResult> {
  const t = await getT();
  const p = await me(eventId);
  if (!(await rateLimit(`draw:${p.id}`, 20, 600))) return { error: t.common.tooMany };

  const result = await db.transaction(async (tx) => {
    const [ev] = await tx.select().from(events).where(eq(events.id, eventId)).for("update");
    if (!ev) return { error: t.common.genericError };
    if (!ev.drawnAt) {
      const people = await tx.select({ id: participants.id, joinedAt: participants.joinedAt }).from(participants).where(eq(participants.eventId, eventId));
      if (people.length < 3) return { error: t.dash.tooFew };
      const joined = people.filter((x) => x.joinedAt).length;
      if (!ev.allowEarlyDraw && joined < people.length) return { error: t.dash.waitAll(joined, people.length) };
      const ex = await tx.select({ a: exclusions.aId, b: exclusions.bId }).from(exclusions).where(eq(exclusions.eventId, eventId));
      const pairing = generateAssignment(people.map((x) => x.id), ex.map((e) => [e.a, e.b]));
      if (!pairing) return { error: t.dash.impossible };
      await tx.delete(assignments).where(eq(assignments.eventId, eventId));
      await tx.insert(assignments).values([...pairing].map(([giverId, receiverId]) => ({ eventId, giverId, receiverSealed: sealReceiver(giverId, receiverId) })));
      await tx.update(events).set({ drawnAt: new Date() }).where(eq(events.id, eventId));
    }
    await tx.update(participants).set({ revealedAt: new Date() }).where(and(eq(participants.id, p.id), isNull(participants.revealedAt)));
    return { ok: true };
  });
  revalidatePath(`/e/${eventId}`);
  return result;
}

export async function setGiftReadyAction(eventId: string, ready: boolean) {
  const p = await me(eventId);
  await db.update(participants).set({ giftReady: ready }).where(and(eq(participants.id, p.id), isNotNull(participants.revealedAt)));
  revalidatePath(`/e/${eventId}`);
}

export async function addWishAction(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const p = await me(eventId);
  const title = str(fd, "title").trim().slice(0, 120);
  if (!title) return { error: t.dash.ideaPh };
  const url = safeUrl(str(fd, "url"));
  if (url === false) return { error: t.dash.badUrl };
  const [{ n }] = await db.select({ n: count() }).from(wishes).where(eq(wishes.participantId, p.id));
  if (n >= 3) return { error: t.common.genericError };
  await db.insert(wishes).values({ participantId: p.id, title, url });
  revalidatePath(`/e/${eventId}`);
  return { ok: true };
}

export async function deleteWishAction(eventId: string, wishId: string) {
  const p = await me(eventId);
  if (!isUuid(wishId)) return;
  await db.delete(wishes).where(and(eq(wishes.id, wishId), eq(wishes.participantId, p.id)));
  revalidatePath(`/e/${eventId}`);
}

export async function updateEmailAction(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const p = await me(eventId);
  const em = optionalEmail(fd.get("email"));
  if (!em.ok) return { error: t.validation.email };
  await db.update(participants).set({ email: em.value }).where(eq(participants.id, p.id));
  revalidatePath(`/e/${eventId}`);
  return { ok: true, message: t.dash.emailSaved };
}

export async function changePasswordAction(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const p = await me(eventId);
  const pw = participantPassword.safeParse(str(fd, "password"));
  if (!pw.success) return { error: t.validation.passwordShort };
  await db.update(participants).set({ passwordHash: await hashPassword(pw.data) }).where(eq(participants.id, p.id));
  await revokeParticipantSessions(p.id);
  await signInParticipant(p.id);
  return { ok: true, message: t.dash.passwordChanged };
}

export async function participantLogoutAction(eventId: string) {
  const p = await getMyParticipant(eventId);
  const ev = isUuid(eventId) ? await db.query.events.findFirst({ where: eq(events.id, eventId) }) : null;
  if (p) await signOutParticipant(p.id);
  redirect(ev ? `/j/${ev.joinCode}` : "/");
}
