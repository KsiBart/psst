import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, inArray, lt } from "drizzle-orm";
import { cache } from "react";
import { db, events, organizers, participants, sessionParticipants, sessions } from "@/db";
import { randomToken, sha256 } from "./crypto";

const COOKIE = "psst_sid";
const MAX_AGE_DAYS = 90;

type SessionInfo = { id: string; organizerId: string | null; participantIds: string[] };

export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const id = sha256(token);
  const row = await db.query.sessions.findFirst({
    where: and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())),
  });
  if (!row) return null;
  const links = await db
    .select({ pid: sessionParticipants.participantId })
    .from(sessionParticipants)
    .where(eq(sessionParticipants.sessionId, id));
  return { id, organizerId: row.organizerId, participantIds: links.map((l) => l.pid) };
});

/**
 * Starts a fresh session (new token = no session fixation), carrying over what the
 * current one already had. Only callable from Server Actions / Route Handlers.
 */
async function rotate(change: { organizerId?: string | null; addParticipant?: string }) {
  const current = await getSession();
  const token = randomToken();
  const id = sha256(token);
  const expiresAt = new Date(Date.now() + MAX_AGE_DAYS * 864e5);
  const organizerId = change.organizerId !== undefined ? change.organizerId : (current?.organizerId ?? null);
  const pids = new Set(current?.participantIds ?? []);
  if (change.addParticipant) pids.add(change.addParticipant);

  await db.transaction(async (tx) => {
    await tx.insert(sessions).values({ id, organizerId, expiresAt });
    if (pids.size) await tx.insert(sessionParticipants).values([...pids].map((participantId) => ({ sessionId: id, participantId })));
    if (current) await tx.delete(sessions).where(eq(sessions.id, current.id));
  });
  // opportunistic cleanup
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 86400,
  });
}

export const signInParticipant = (participantId: string) => rotate({ addParticipant: participantId });
export const signInOrganizer = (organizerId: string) => rotate({ organizerId });

export async function signOutOrganizer() {
  const s = await getSession();
  if (s) await db.update(sessions).set({ organizerId: null }).where(eq(sessions.id, s.id));
}

export async function signOutParticipant(participantId: string) {
  const s = await getSession();
  if (s)
    await db
      .delete(sessionParticipants)
      .where(and(eq(sessionParticipants.sessionId, s.id), eq(sessionParticipants.participantId, participantId)));
}

/** Revoke every session of a participant (after a password change/reset). */
export async function revokeParticipantSessions(participantId: string) {
  await db.delete(sessionParticipants).where(eq(sessionParticipants.participantId, participantId));
}

export async function revokeOrganizerSessions(organizerId: string) {
  await db.update(sessions).set({ organizerId: null }).where(eq(sessions.organizerId, organizerId));
}

export const getOrganizer = cache(async () => {
  const s = await getSession();
  if (!s?.organizerId) return null;
  const o = await db.query.organizers.findFirst({ where: eq(organizers.id, s.organizerId) });
  return o ? { id: o.id, name: o.name, email: o.email } : null;
});

export async function requireOrganizer() {
  const o = await getOrganizer();
  if (!o) redirect("/logowanie");
  return o;
}

/** Event owned by the signed-in organizer, or 404-style null. */
export async function getOwnedEvent(eventId: string) {
  const o = await getOrganizer();
  if (!o || !isUuid(eventId)) return null;
  const ev = await db.query.events.findFirst({ where: and(eq(events.id, eventId), eq(events.organizerId, o.id)) });
  return ev ?? null;
}

/**
 * The participant the current visitor is in this event: either a participant they signed
 * in as, or the organizer's own participant entry.
 */
export async function getMyParticipant(eventId: string) {
  if (!isUuid(eventId)) return null;
  const s = await getSession();
  if (!s) return null;
  if (s.participantIds.length) {
    const p = await db.query.participants.findFirst({
      where: and(eq(participants.eventId, eventId), inArray(participants.id, s.participantIds)),
    });
    if (p) return p;
  }
  if (s.organizerId) {
    const p = await db.query.participants.findFirst({
      where: and(eq(participants.eventId, eventId), eq(participants.organizerId, s.organizerId)),
    });
    if (p) return p;
  }
  return null;
}

export function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
