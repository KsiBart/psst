"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { assignments, db, events, exclusions, participants } from "@/db";
import { randomCode } from "@/lib/crypto";
import { generateAssignment } from "@/lib/draw";
import { sendEmail } from "@/lib/email";
import { getT } from "@/lib/i18n";
import { createResetToken } from "@/lib/reset";
import { getOwnedEvent, isUuid, revokeParticipantSessions } from "@/lib/session";
import { isTheme } from "@/lib/themes";
import { appUrl } from "@/lib/url";
import { personName, str } from "@/lib/validation";
import type { FormState } from "./auth";

async function owned(eventId: string) {
  const ev = await getOwnedEvent(eventId);
  if (!ev) redirect("/panel");
  return ev;
}

async function ownedParticipant(eventId: string, participantId: string) {
  if (!isUuid(participantId)) return null;
  return (await db.query.participants.findFirst({ where: and(eq(participants.id, participantId), eq(participants.eventId, eventId)) })) ?? null;
}

const done = (eventId: string) => {
  revalidatePath(`/panel/${eventId}`);
  revalidatePath(`/e/${eventId}`);
};

export async function updateSettingsAction(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  await owned(eventId);
  const name = str(fd, "eventName").trim().slice(0, 80);
  if (!name) return { error: t.validation.eventName };
  const budgetRaw = str(fd, "budget").trim();
  const budgetNum = Number(budgetRaw);
  if (budgetRaw && !Number.isFinite(budgetNum)) return { error: t.common.genericError };
  const date = str(fd, "date");
  const theme = str(fd, "theme");
  await db
    .update(events)
    .set({
      name,
      theme: isTheme(theme) ? theme : "frost",
      budget: budgetRaw ? Math.max(0, Math.min(1_000_000, Math.round(budgetNum))) : null,
      exchangeDate: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
      note: str(fd, "note").trim().slice(0, 300) || null,
      allowEarlyDraw: fd.get("allowEarlyDraw") === "on",
    })
    .where(eq(events.id, eventId));
  done(eventId);
  return { ok: true, message: t.common.saved };
}

export async function addParticipantAction(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const ev = await owned(eventId);
  if (ev.drawnAt) return { error: t.panel.locked };
  const n = personName.safeParse(str(fd, "name").replace(/\s+/g, " "));
  if (!n.success) return { error: t.validation.nameRequired };
  const all = await db.select({ name: participants.name }).from(participants).where(eq(participants.eventId, eventId));
  if (all.some((p) => p.name.toLowerCase() === n.data.toLowerCase())) return { error: t.validation.duplicateName };
  if (all.length >= 100) return { error: t.common.genericError };
  await db.insert(participants).values({ eventId, name: n.data });
  done(eventId);
  return { ok: true };
}

export async function removeParticipantAction(eventId: string, participantId: string): Promise<FormState> {
  const t = await getT();
  const ev = await owned(eventId);
  if (ev.drawnAt) return { error: t.panel.locked };
  const p = await ownedParticipant(eventId, participantId);
  if (!p) return { error: t.common.genericError };
  await db.delete(participants).where(eq(participants.id, p.id));
  done(eventId);
  return { ok: true };
}

/** One-time link the organizer can pass to a participant who forgot their password. */
export async function createResetLinkAction(eventId: string, participantId: string): Promise<{ url?: string; hasEmail?: boolean; error?: string }> {
  await owned(eventId);
  const p = await ownedParticipant(eventId, participantId);
  if (!p || p.organizerId) return { error: "invalid" };
  const token = await createResetToken({ participantId: p.id }, 72);
  return { url: `${await appUrl()}/haslo/${token}`, hasEmail: !!p.email };
}

export async function emailResetLinkAction(eventId: string, participantId: string): Promise<{ ok: boolean }> {
  const t = await getT();
  await owned(eventId);
  const p = await ownedParticipant(eventId, participantId);
  if (!p?.email) return { ok: false };
  const token = await createResetToken({ participantId: p.id }, 72);
  const ok = await sendEmail({ to: p.email, subject: t.email.resetSubject, heading: t.email.resetHeading, body: t.email.resetBody, cta: t.email.resetCta, url: `${await appUrl()}/haslo/${token}` });
  return { ok };
}

export async function addExclusionAction(eventId: string, _: FormState, fd: FormData): Promise<FormState> {
  const t = await getT();
  const ev = await owned(eventId);
  if (ev.drawnAt) return { error: t.panel.locked };
  const a = await ownedParticipant(eventId, str(fd, "a"));
  const b = await ownedParticipant(eventId, str(fd, "b"));
  if (!a || !b || a.id === b.id) return { error: t.common.genericError };
  const [x, y] = [a.id, b.id].sort();
  const people = await db.select({ id: participants.id }).from(participants).where(eq(participants.eventId, eventId));
  const existing = await db.select({ a: exclusions.aId, b: exclusions.bId }).from(exclusions).where(eq(exclusions.eventId, eventId));
  const pairs: [string, string][] = [...existing.map((e) => [e.a, e.b] as [string, string]), [x, y]];
  if (people.length >= 3 && !generateAssignment(people.map((p) => p.id), pairs)) return { error: t.dash.impossible };
  await db.insert(exclusions).values({ eventId, aId: x, bId: y }).onConflictDoNothing();
  done(eventId);
  return { ok: true };
}

export async function removeExclusionAction(eventId: string, aId: string, bId: string) {
  const ev = await owned(eventId);
  if (ev.drawnAt || !isUuid(aId) || !isUuid(bId)) return;
  await db.delete(exclusions).where(and(eq(exclusions.eventId, eventId), eq(exclusions.aId, aId), eq(exclusions.bId, bId)));
  done(eventId);
}

export async function resetDrawsAction(eventId: string) {
  await owned(eventId);
  await db.transaction(async (tx) => {
    await tx.delete(assignments).where(eq(assignments.eventId, eventId));
    await tx.update(participants).set({ revealedAt: null, giftReady: false }).where(eq(participants.eventId, eventId));
    await tx.update(events).set({ drawnAt: null }).where(eq(events.id, eventId));
  });
  done(eventId);
}

export async function newJoinCodeAction(eventId: string) {
  await owned(eventId);
  await db.update(events).set({ joinCode: randomCode(10) }).where(eq(events.id, eventId));
  done(eventId);
}

export async function deleteEventAction(eventId: string) {
  await owned(eventId);
  const ps = await db.select({ id: participants.id }).from(participants).where(eq(participants.eventId, eventId));
  for (const p of ps) await revokeParticipantSessions(p.id);
  await db.delete(events).where(eq(events.id, eventId));
  redirect("/panel");
}

