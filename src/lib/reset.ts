import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, organizers, participants, resetTokens } from "@/db";
import { randomToken, sha256 } from "./crypto";
import { hashPassword } from "./password";
import { revokeOrganizerSessions, revokeParticipantSessions } from "./session";

export async function createResetToken(target: { participantId?: string; organizerId?: string }, hours: number) {
  const token = randomToken();
  await db.insert(resetTokens).values({
    id: sha256(token),
    participantId: target.participantId ?? null,
    organizerId: target.organizerId ?? null,
    expiresAt: new Date(Date.now() + hours * 3600e3),
  });
  return token;
}

export async function peekResetToken(token: string) {
  if (!token || token.length > 100) return null;
  const row = await db.query.resetTokens.findFirst({
    where: and(eq(resetTokens.id, sha256(token)), isNull(resetTokens.usedAt), gt(resetTokens.expiresAt, new Date())),
  });
  if (!row) return null;
  if (row.participantId) {
    const p = await db.query.participants.findFirst({ where: eq(participants.id, row.participantId) });
    return p ? { kind: "participant" as const, name: p.name, participantId: p.id, eventId: p.eventId } : null;
  }
  if (row.organizerId) {
    const o = await db.query.organizers.findFirst({ where: eq(organizers.id, row.organizerId) });
    return o ? { kind: "organizer" as const, name: o.email, organizerId: o.id } : null;
  }
  return null;
}

/** Marks the token used and sets the new password atomically. */
export async function consumeResetToken(token: string, password: string) {
  const info = await peekResetToken(token);
  if (!info) return null;
  const passwordHash = await hashPassword(password);
  const used = await db
    .update(resetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(resetTokens.id, sha256(token)), isNull(resetTokens.usedAt)))
    .returning({ id: resetTokens.id });
  if (!used.length) return null;
  if (info.kind === "participant") {
    await db.update(participants).set({ passwordHash }).where(eq(participants.id, info.participantId));
    await revokeParticipantSessions(info.participantId);
    await db.update(participants).set({ joinedAt: new Date() }).where(and(eq(participants.id, info.participantId), isNull(participants.joinedAt)));
  } else {
    await db.update(organizers).set({ passwordHash }).where(eq(organizers.id, info.organizerId));
    await revokeOrganizerSessions(info.organizerId);
  }
  return info;
}
