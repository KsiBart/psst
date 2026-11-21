# Psst! — losowanie prezentów

Mobile-first gift-exchange app (Secret Santa, birthdays, office swaps). Polish first, English second.

- The organizer creates an event, adds names and sends **one invite link** (share sheet, copy or QR code).
- Each person picks their name and sets a password. **Email is optional.** Next time they pick their name and type the password.
- Everyone draws on their own and sees only their own match and that person's wishlist (up to 3 ideas, optional links).
- **Nobody can see who drew whom, organizer included.** Pairings are encrypted in the database (AES-256-GCM).
- There are 3 themes per event, each with its own background animation: **Szron** (snow), **Konfetti** and **Zorza** (stars).

## Features

| | |
|---|---|
| Participants | join with name + password, optional email for resets, wishlist (3 ideas with optional links), hide/show the match, "I've got the gift" checkbox, add-to-calendar (.ics), PL/EN switch |
| Organizer | budget, date, message, theme, add/remove names, exclusions (e.g. couples), "allow drawing before everyone joins" switch, one-time password reset links for participants, new invite link, reset all draws, delete event, counts only (joined / drawn / have gift) |
| Draw | done on the server in a single transaction. Prefers one big circle (A→B→C→…→A) and falls back to any valid assignment when exclusions require it. Once someone has drawn, the list is locked until the organizer resets the draws. |
| Security | Argon2id passwords, DB-backed httpOnly sessions (rotated on login, revoked on password change), rate limiting on logins, joins and resets, 256-bit reset tokens stored hashed (2 h by email / 72 h from the organizer), unguessable invite codes, http(s)-only wishlist links, Server Actions with origin checks, security headers |

### Easter eggs 🤫
- Tap the logo 5× quickly to make it snow gifts.
- Press and hold the logo (or type the Konami code ↑↑↓↓←→←→BA) to make a sleigh with reindeer fly by.
- Type "hohoho" in a wishlist idea and the gift box sings.
- Shake the phone while your match is visible for a confetti burst.

## Stack

Next.js 16 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · Motion · Drizzle ORM + Postgres · Resend · Vitest.

## Local development

```bash
cp .env.example .env.local          # then fill in DATABASE_URL and ASSIGNMENT_KEY
./scripts/set-resend-key.sh         # optional: saves RESEND_API_KEY (hidden input)
npm install
npm run db:migrate
npm run dev
```

Without `RESEND_API_KEY`, emails are not sent. In development the links are printed to the server console instead.

Tests: `npm test` (draw algorithm, encryption, validation) · `npm run lint` · `npm run typecheck`.

## Deploy to Vercel (no custom domain needed)

1. Import this repository in Vercel (Framework: Next.js).
2. Storage → add **Neon Postgres** from the Marketplace. It sets `DATABASE_URL` for you.
3. Settings → Environment Variables: add `ASSIGNMENT_KEY` (see `.env.example`), `RESEND_API_KEY` and optionally `EMAIL_FROM`.
4. Deploy. The `vercel-build` script runs the database migrations before `next build`. The app runs on `https://<project>.vercel.app`.

> **Resend without a domain:** the `onboarding@resend.dev` sender only delivers to the email address of your Resend account. To email other people (participants or other organizers), verify a domain in Resend and set `EMAIL_FROM`. Until then, organizers can always hand out password reset links themselves from the panel.

## Changing the schema

Edit `src/db/schema.ts` → `npm run db:generate` → commit the new file in `drizzle/`.
