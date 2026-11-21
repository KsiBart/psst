import "server-only";
import { and, asc, eq, inArray } from "drizzle-orm";
import { assignments, db, events, exclusions, participants, wishes, type Participant } from "@/db";
import { openReceiver } from "./crypto";

export async function getEventForJoin(code: string) {
  if (!code || code.length > 40) return null;
  const ev = await db.query.events.findFirst({ where: eq(events.joinCode, code) });
  if (!ev) return null;
  const people = await db
    .select({ id: participants.id, name: participants.name, joined: participants.passwordHash, organizerId: participants.organizerId })
    .from(participants)
    .where(eq(participants.eventId, ev.id))
    .orderBy(asc(participants.name));
  const organizer = await db.query.organizers.findFirst({ where: (o, { eq }) => eq(o.id, ev.organizerId) });
  return {
    event: ev,
    organizerName: organizer?.name ?? "",
    people: people.map((p) => ({ id: p.id, name: p.name, joined: !!p.joined || !!p.organizerId, isOrganizer: !!p.organizerId })),
  };
}

export async function getDashboard(me: Participant) {
  const ev = (await db.query.events.findFirst({ where: eq(events.id, me.eventId) }))!;
  const people = await db
    .select({ id: participants.id, name: participants.name, joinedAt: participants.joinedAt, revealedAt: participants.revealedAt })
    .from(participants)
    .where(eq(participants.eventId, ev.id));
  const myWishes = await db.select().from(wishes).where(eq(wishes.participantId, me.id)).orderBy(asc(wishes.createdAt));

  let receiver: { name: string; wishes: { id: string; title: string; url: string | null }[] } | null = null;
  if (me.revealedAt && ev.drawnAt) {
    const a = await db.query.assignments.findFirst({ where: eq(assignments.giverId, me.id) });
    if (a) {
      const rid = openReceiver(me.id, a.receiverSealed);
      const r = people.find((p) => p.id === rid);
      if (r) {
        const rw = await db.select({ id: wishes.id, title: wishes.title, url: wishes.url }).from(wishes).where(eq(wishes.participantId, rid)).orderBy(asc(wishes.createdAt));
        receiver = { name: r.name, wishes: rw };
      }
    }
  }
  return {
    event: ev,
    total: people.length,
    joined: people.filter((p) => p.joinedAt).length,
    drawn: people.filter((p) => p.revealedAt).length,
    initials: people.filter((p) => p.joinedAt).slice(0, 6).map((p) => p.name.slice(0, 1).toUpperCase()),
    myWishes: myWishes.map((w) => ({ id: w.id, title: w.title, url: w.url })),
    receiver,
  };
}

export async function getPanel(eventId: string) {
  const people = await db.select().from(participants).where(eq(participants.eventId, eventId)).orderBy(asc(participants.createdAt));
  const ex = await db.select().from(exclusions).where(eq(exclusions.eventId, eventId));
  const byId = new Map(people.map((p) => [p.id, p.name]));
  return {
    people: people.map((p) => ({ id: p.id, name: p.name, joined: !!p.joinedAt, isOrganizer: !!p.organizerId, hasEmail: !!p.email })),
    exclusions: ex.map((e) => ({ a: e.aId, b: e.bId, label: `${byId.get(e.aId)} ↔ ${byId.get(e.bId)}` })),
    stats: {
      total: people.length,
      joined: people.filter((p) => p.joinedAt).length,
      drawn: people.filter((p) => p.revealedAt).length,
      ready: people.filter((p) => p.giftReady).length,
    },
  };
}

export async function getOrganizerEvents(organizerId: string) {
  const evs = await db.select().from(events).where(eq(events.organizerId, organizerId)).orderBy(asc(events.createdAt));
  return evs;
}

export async function getEventsForParticipants(ids: string[]) {
  if (!ids.length) return [];
  const rows = await db
    .select({ eventId: events.id, name: events.name, theme: events.theme, me: participants.name })
    .from(participants)
    .innerJoin(events, eq(events.id, participants.eventId))
    .where(and(inArray(participants.id, ids)));
  return rows;
}
