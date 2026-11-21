import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const organizers = pgTable(
  "organizers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("organizers_email_idx").on(t.email)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => organizers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    theme: text("theme", { enum: ["frost", "confetti", "aurora"] }).notNull().default("frost"),
    budget: integer("budget"),
    currency: text("currency").notNull().default("PLN"),
    exchangeDate: date("exchange_date"),
    note: text("note"),
    joinCode: text("join_code").notNull(),
    allowEarlyDraw: boolean("allow_early_draw").notNull().default(true),
    /** set when the pairing has been generated; roster is locked while set */
    drawnAt: timestamp("drawn_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("events_join_code_idx").on(t.joinCode), index("events_organizer_idx").on(t.organizerId)],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    email: text("email"),
    /** set when this participant is the organizer themself */
    organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "set null" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    revealedAt: timestamp("revealed_at", { withTimezone: true }),
    giftReady: boolean("gift_ready").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("participants_event_name_idx").on(t.eventId, sql`lower(${t.name})`),
    index("participants_event_idx").on(t.eventId),
  ],
);

/** giver -> receiver, receiver id encrypted with AES-256-GCM (see lib/crypto.ts) */
export const assignments = pgTable("assignments", {
  giverId: uuid("giver_id")
    .primaryKey()
    .references(() => participants.id, { onDelete: "cascade" }),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  receiverSealed: text("receiver_sealed").notNull(),
});

export const exclusions = pgTable(
  "exclusions",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    aId: uuid("a_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    bId: uuid("b_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.aId, t.bId] })],
);

export const wishes = pgTable(
  "wishes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wishes_participant_idx").on(t.participantId)],
);

export const sessions = pgTable("sessions", {
  /** sha256 of the cookie token */
  id: text("id").primaryKey(),
  organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessionParticipants = pgTable(
  "session_participants",
  {
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.participantId] })],
);

export const resetTokens = pgTable("reset_tokens", {
  /** sha256 of the token in the link */
  id: text("id").primaryKey(),
  organizerId: uuid("organizer_id").references(() => organizers.id, { onDelete: "cascade" }),
  participantId: uuid("participant_id").references(() => participants.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});

export type Event = typeof events.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Theme = Event["theme"];
