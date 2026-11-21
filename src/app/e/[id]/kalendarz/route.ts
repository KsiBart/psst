import { db, events } from "@/db";
import { getMyParticipant } from "@/lib/session";
import { eq } from "drizzle-orm";

const esc = (s: string) => s.replace(/[\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, "\\n");

/** iCalendar file for the exchange day (all-day event). Only for participants of the event. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await getMyParticipant(id);
  if (!me) return new Response("Not found", { status: 404 });
  const ev = await db.query.events.findFirst({ where: eq(events.id, id) });
  if (!ev?.exchangeDate) return new Response("Not found", { status: 404 });
  const d = ev.exchangeDate.replaceAll("-", "");
  const next = new Date(`${ev.exchangeDate}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  const end = next.toISOString().slice(0, 10).replaceAll("-", "");
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Psst//Gift exchange//PL",
    "BEGIN:VEVENT",
    `UID:${ev.id}@psst`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${esc(`🎁 ${ev.name}`)}`,
    `DESCRIPTION:${esc(ev.note ?? "Psst!")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return new Response(ics, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="psst.ics"', "Cache-Control": "private, no-store" },
  });
}
