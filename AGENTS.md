<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Psst! — handoff for agents

Mobile-first gift-exchange web app (Secret Santa, birthdays, office swaps). **Polish first**, English second. The owner talks in English, but the product copy is Polish.

## Status (as of 2026-11-21)

- **Live:** https://psst-bartomiej-ksieks-projects.vercel.app (Vercel project `psst`, team "Bartomiej Ksiek's projects", project id `prj_iKKIZXqqzgcb8IteohyKKai7rNAc`).
- **Repo:** `KsiBart/psst`. The default branch and Vercel production branch are both `main`. **Push only to `main`.** Pushing the same commit to two branches made two production builds race and broke Server Actions (see Gotchas).
- A stale branch `claude/happy-darwin-ffxs70` may still exist on GitHub. The owner will delete it; the cloud session proxy blocks branch deletion (HTTP 403).
- Done: everything in README "Everything it does", the easter eggs, unit tests and the e2e smoke test, Vercel deploy with Neon and Resend.
- The design mock-up (5 phone screens, 3 themes) lives in a private claude.ai artifact the owner has. The code is the source of truth now.

## Architecture

- Next.js 16 App Router, **no Cache Components** (turned off on purpose; every page is per-user dynamic). Mutations are **Server Actions** in `src/app/actions/*`, called from client forms through `useActionState`.
- Postgres through Drizzle (`src/db/schema.ts`). Migrations are SQL in `drizzle/`, applied by `scripts/migrate.mjs`, which runs in `vercel-build`.
- Auth is custom and DB-backed (`src/lib/session.ts`). The cookie `psst_sid` holds a random token; the DB stores its sha256. One session row can carry an organizer **and** several participant identities (`session_participants`), so one phone can be in many events. Sessions rotate on every login (no fixation) and are revoked on password change or reset.
- **Organizer** = email + password account (`organizers`). Can own many events. If they take part, their participant row has `organizer_id` set and **no password**; they reach the participant view through the organizer session.
- **Participant** = a name the organizer added. First visit through `/j/<joinCode>` sets the password (`passwordHash` from NULL to the hash, atomically). Email is optional and only used for resets.
- **Draw** (`drawAction` in `actions/participant.ts`): on the first draw of an event, inside a transaction with `SELECT … FOR UPDATE` on the event, it generates the whole pairing (`src/lib/draw.ts`: a random single cycle, with a backtracking fallback for exclusions) and stores each receiver id **AES-256-GCM sealed** with `ASSIGNMENT_KEY`, giver id as AAD (`src/lib/crypto.ts`). `events.drawn_at` set means the roster is locked; the organizer must "reset all draws" to change people or exclusions. `participants.revealed_at` = this person has drawn.
- **Invariant: never expose assignments** to anyone but the giver, organizer included. Panel queries only return counts.
- Password resets: `reset_tokens` (sha256-hashed, single use). They come by email (2 h, Resend) or as a link the organizer generates in the panel (72 h).
- Rate limiting: a Postgres fixed window (`src/lib/rate-limit.ts`, table `rate_limits`).
- i18n: `src/lib/i18n/dict.ts` holds `pl` and `en: Dict`, so TypeScript forces both languages. The language is in the cookie `psst_lang` and read server-side with `getT()`. Some entries are functions (plurals and interpolation), **so never pass a whole dict section containing functions to a client component.** Pass plain strings or pre-computed maps (see `j/[code]/page.tsx`).
- Themes: `frost | confetti | aurora`. CSS variables in `src/app/globals.css` under `[data-theme=…]`, mapped to Tailwind colors (`bg-surface`, `text-muted`, `bg-accent`…). Swatches for pickers are in `src/lib/themes.ts`. `Shell` (`src/components/shell.tsx`) wraps every page: theme scope, `Particles` canvas, easter eggs, header.
- Easter eggs: window CustomEvents `psst:gifts | psst:burst | psst:reindeer | psst:hohoho | psst:theme`, fired with `fire()` from `components/particles.tsx`.

## Routes

`/` home · `/nowe` create event (also creates the organizer account inline) · `/logowanie` organizer login · `/haslo` forgot password · `/haslo/[token]` reset · `/j/[code]` invite: pick name, join or log in · `/e/[id]` participant dashboard · `/e/[id]/kalendarz` .ics · `/panel` organizer events · `/panel/[id]` manage event.

## Env vars

`DATABASE_URL` (Neon integration on Vercel) · `ASSIGNMENT_KEY` (32 bytes base64; **never rotate**: old draws become unreadable and need a reset) · `RESEND_API_KEY` (set for Production only on Vercel) · `EMAIL_FROM` (default `Psst! <onboarding@resend.dev>`; without a verified domain Resend only delivers to the account owner) · `APP_URL` optional (otherwise `VERCEL_PROJECT_PRODUCTION_URL`).

## Testing

- `npm test`: Vitest unit tests (`src/lib/*.test.ts`).
- `npm run lint` and `npm run typecheck`. The React-hooks lint is strict: no `setState` directly in effects (use derived state, event handlers, or the action wrapper).
- E2E: `BASE_URL=… node e2e/smoke.mjs`. It runs a phone-sized Chromium through create, join ×2, wish, draw, hide, wrong and right password, organizer draw, anonymous 404 and the language switch, then **deletes its event**. Safe to run against production; it leaves one throwaway `e2e+…@example.com` organizer account.
- In a Claude Code cloud session, Playwright and Chromium are preinstalled globally (don't `npm i playwright`). Local Postgres 16 is installed but may be stopped:
  ```bash
  pg_ctlcluster 16 main start
  su postgres -c "psql -c \"CREATE USER psst WITH PASSWORD 'psst' CREATEDB;\" -c \"CREATE DATABASE psst OWNER psst;\""   # first time only
  # .env.local: DATABASE_URL=postgres://psst:psst@localhost:5432/psst, ASSIGNMENT_KEY=<random>, APP_URL=http://localhost:3100
  npm run db:migrate && npm run build && npx next start -p 3100
  ```
  Kill old servers before restarting (`fuser -k 3100/tcp`); a stale `next-server` serving a new build causes confusing Server Action errors.
- Screenshots for the README: `npm run screenshots` (local only, leaves demo data), then `node e2e/banner.mjs`.
- Vercel checks are done through the Vercel MCP: `list_deployments`, `get_runtime_logs`, `get_runtime_errors` with the project id above.

## Gotchas

- **"Failed to find Server Action"**: the page and the server are from different builds. This happens during a deploy swap, or when two branches deploy to production. Skew Protection isn't available on this Vercel plan. Keep one production branch; a user fix is to reload.
- Tailwind 4: shared classes (`btn`, `card`, `input`, `chip`, …) are `@utility` blocks in `globals.css`, not `@layer components`.
- `<input type="url">` blocks bare domains. Wishlist links use `type="text" inputMode="url"`; the server normalizes them with `safeUrl()`.
- Next 16 renamed `middleware` to `proxy`. None is used yet.

## Ideas / backlog (not started)

- Anonymous Q&A between giver and receiver ("what size?") without revealing the giver
- Organizer: delete account, change email; duplicate last year's event
- A reminder email or web push a few days before the exchange
- Verify a Resend domain, then branded `EMAIL_FROM`
- A custom shorter `*.vercel.app` alias
- An "event over" state with a reveal-all party mode (opt-in, after the date)
