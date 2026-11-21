// End-to-end smoke test of the main flows in a phone-sized browser.
// Usage:
//   BASE_URL=http://localhost:3000 node e2e/smoke.mjs      (local: `npm run build && npm start` first)
//   BASE_URL=https://psst-bartomiej-ksieks-projects.vercel.app node e2e/smoke.mjs   (production)
// It creates one test event (organizer e2e+<timestamp>@example.com) and DELETES the event at the end.
// The throwaway organizer account itself stays in the DB (harmless; no UI to delete accounts yet).
// Needs Playwright with Chromium: `npm i -D playwright && npx playwright install chromium`
// (in Claude Code cloud sessions Playwright + Chromium are preinstalled globally).
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(require.resolve("playwright", { paths: ["/usr/local/lib/node_modules", "/usr/lib/node_modules"] }));
}
const { chromium, devices } = playwright;

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SHOTS = process.env.SHOTS_DIR; // optional: save screenshots here
const ok = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("ok -", m);
};

const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"], deviceScaleFactor: 1 };
const errors = [];
const page = async () => {
  const p = await (await browser.newContext(phone)).newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  return p;
};
const shot = async (p, name) => SHOTS && p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const bigName = (p) => p.locator("span.font-display.text-\\[44px\\]").innerText();

let org;
try {
  // 1. Organizer creates an event (Polish UI is the default)
  org = await page();
  await org.goto(BASE + "/nowe");
  await org.fill("input[name=eventName]", "E2E " + new Date().toISOString());
  await org.locator("label", { hasText: "Konfetti" }).click();
  await org.fill("input[name=budget]", "100");
  await org.fill("input[name=date]", "2026-12-24");
  for (const n of ["Anna", "Bartek", "Marek"]) {
    await org.fill('input[placeholder^="Wpisz imię"]', n);
    await org.getByRole("button", { name: "Dodaj", exact: true }).click();
  }
  await org.fill("input[name=yourName]", "Kasia");
  await org.fill("input[name=email]", `e2e+${Date.now()}@example.com`);
  await org.fill("#org-pw", "superhaslo123");
  await org.getByRole("button", { name: "Utwórz i pobierz link" }).click();
  await org.waitForURL("**/panel/**", { timeout: 30000 });
  const inviteText = await org.locator(".font-mono").first().innerText();
  const invite = BASE + inviteText.slice(inviteText.indexOf("/j/"));
  ok(inviteText.includes("/j/"), "event created, invite link " + invite);
  await shot(org, "panel");

  // 2. Two participants join, one adds a wish, both draw
  const got = {};
  for (const name of ["Anna", "Bartek"]) {
    const p = await page();
    await p.goto(invite);
    await p.getByRole("radio", { name: new RegExp(name) }).click();
    await p.fill("#pw", "haslo" + name);
    await p.getByRole("button", { name: "Dołącz do zabawy" }).click();
    await p.waitForURL("**/e/**");
    if (name === "Anna") {
      await p.getByRole("button", { name: /Dodaj pomysł/ }).click();
      await p.fill("input[name=title]", "Książka o górach");
      await p.fill("input[name=url]", "example.com/ksiazka");
      await p.getByRole("button", { name: "Dodaj", exact: true }).click();
      await p.getByText("Książka o górach").waitFor();
      ok(true, "wish added");
    }
    await p.getByRole("button", { name: "Losuję!" }).click();
    await p.getByText("Kupujesz prezent dla").waitFor({ timeout: 20000 });
    await p.waitForTimeout(1200);
    got[name] = await bigName(p);
    ok(got[name] && got[name] !== name, `${name} drew ${got[name]}`);
    await shot(p, "reveal-" + name);
    await p.getByRole("button", { name: /Kupujesz prezent dla/ }).click();
    await p.getByText("Dotknij, by odkryć").waitFor();
  }
  ok(got.Anna !== got.Bartek, "different receivers");

  // 3. Returning login: wrong then right password; match hidden by default
  const back = await page();
  await back.goto(invite);
  await back.getByRole("radio", { name: /Anna/ }).click();
  await back.fill("#pw", "zlehaslo");
  await back.getByRole("button", { name: "Zaloguj się" }).click();
  await back.getByText("Nieprawidłowe hasło.").waitFor();
  ok(true, "wrong password rejected");
  await back.fill("#pw", "hasloAnna");
  await back.getByRole("button", { name: "Zaloguj się" }).click();
  await back.waitForURL("**/e/**");
  await back.getByText("Dotknij, by odkryć").waitFor();
  ok(true, "returning login works");

  // 4. Organizer draws too; anonymous visitors can't see a dashboard
  await org.reload();
  await org.getByRole("link", { name: "Moje losowanie" }).click();
  await org.waitForURL("**/e/**");
  const dashUrl = org.url();
  await org.getByRole("button", { name: "Losuję!" }).click();
  await org.getByText("Kupujesz prezent dla").waitFor({ timeout: 20000 });
  await org.waitForTimeout(1200);
  ok((await bigName(org)) !== "Kasia", "organizer drew someone else");
  const anon = await page();
  ok((await anon.goto(dashUrl)).status() === 404, "anonymous dashboard → 404");

  // 5. Language switch
  await back.getByRole("button", { name: "Switch to English" }).click();
  await back.getByText("Tap to reveal").waitFor();
  ok(true, "English switch works");
  await back.getByRole("button", { name: "Przełącz na polski" }).click();
} finally {
  // Cleanup: delete the test event
  if (org && /\/(panel|e)\//.test(org.url())) {
    const id = org.url().match(/\/(?:panel|e)\/([0-9a-f-]{36})/)?.[1];
    if (id) {
      await org.goto(`${BASE}/panel/${id}`);
      org.once("dialog", (d) => d.accept());
      await org.getByRole("button", { name: "Usuń wydarzenie" }).click();
      await org.waitForURL(/\/panel$/, { timeout: 20000 }).then(() => console.log("ok - test event deleted"), () => console.log("WARN - could not confirm event deletion"));
    }
  }
  console.log("page errors:", errors.length ? errors : "none");
  await browser.close();
}
