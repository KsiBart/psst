// Regenerates the README screenshots in docs/screens (run against a LOCAL server — it leaves demo data behind).
//   npm run build && APP_URL=http://localhost:3000 npm start
//   BASE_URL=http://localhost:3000 node e2e/screenshots.mjs
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(require.resolve("playwright", { paths: ["/usr/local/lib/node_modules", "/usr/lib/node_modules"] }));
}
const { chromium, devices } = playwright;
const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const OUT = new URL("../docs/screens/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const phone = { ...devices["iPhone 13"], viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 };
const page = async () => (await browser.newContext(phone)).newPage();
const snap = async (p, name) => {
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1600); // let particles + entry animations settle
  await p.screenshot({ path: `${OUT}${name}.png` });
  console.log("saved", name);
};

const org = await page();
let first = true;
async function createEvent({ name, theme, budget, date, note, people, takePart }) {
  await org.goto(BASE + "/nowe");
  await org.fill("input[name=eventName]", name);
  await org.locator("label", { hasText: theme }).click();
  await org.fill("input[name=budget]", String(budget));
  await org.fill("input[name=date]", date);
  if (note) await org.fill("textarea[name=note]", note);
  for (const n of people) {
    await org.fill('input[placeholder^="Wpisz imię"]', n);
    await org.getByRole("button", { name: "Dodaj", exact: true }).click();
  }
  if (!takePart) await org.locator("input[name=takePart]").uncheck();
  else await org.fill("input[name=yourName]", "Kasia");
  if (first) {
    await org.fill("input[name=email]", `demo+${Date.now()}@example.com`);
    await org.fill("#org-pw", "superhaslo123");
    first = false;
  }
  if (name.startsWith("Rodzinne")) await snap(org, "create");
  await org.getByRole("button", { name: "Utwórz i pobierz link" }).click();
  await org.waitForURL("**/panel/**");
  const t = await org.locator(".font-mono").first().innerText();
  return { invite: BASE + t.slice(t.indexOf("/j/")), panel: org.url() }; // display host may differ (APP_URL)
}

async function join(invite, name, wishes = [], { shotJoin } = {}) {
  const p = await page();
  await p.goto(invite);
  await p.getByRole("radio", { name: new RegExp(`^${name}`) }).click();
  await p.fill("#pw", "haslo" + name);
  if (shotJoin) {
    await p.locator("#pw").blur();
    await snap(p, shotJoin);
  }
  await p.getByRole("button", { name: "Dołącz do zabawy" }).click();
  await p.waitForURL("**/e/**");
  for (const [title, url] of wishes) {
    await p.getByRole("button", { name: /Dodaj pomysł/ }).click();
    await p.fill("input[name=title]", title);
    if (url) await p.fill("input[name=url]", url);
    await p.getByRole("button", { name: "Dodaj", exact: true }).click();
    await p.getByText(title).waitFor();
  }
  return p;
}

// Home
const home = await page();
await home.goto(BASE + "/");
await snap(home, "home");

// Event 1 — Frost: dashboard before the draw
const a = await createEvent({ name: "Rodzinne Święta 2026", theme: "Szron", budget: 100, date: "2026-12-24", note: "Wręczamy prezenty po kolacji wigilijnej 🎄", people: ["Anna", "Bartek", "Marek", "Ola", "Piotr"], takePart: true });
await join(a.invite, "Anna");
const marek = await join(a.invite, "Marek", [["„Hobbit” z ilustracjami", "https://example.com/hobbit"], ["Ciepłe wełniane skarpety, dowolny kolor"]]);
await marek.reload();
await snap(marek, "dashboard");

// Event 2 — Confetti: invite screen + reveal
const b = await createEvent({ name: "30. urodziny Oli", theme: "Konfetti", budget: 80, date: "2027-03-14", people: ["Ola", "Anna", "Bartek", "Zosia"], takePart: false });
const wl = {
  Ola: [["Voucher na warsztaty ceramiki", "https://example.com/ceramika"], ["Gorzka czekolada, im ciemniejsza, tym lepiej"], ["Butelka turystyczna 1 l", "https://example.com/butelka"]],
  Anna: [["Roślina w doniczce, najlepiej monstera"], ["Kubek termiczny", "https://example.com/kubek"]],
  Zosia: [["Puzzle 1000 elementów"], ["Książka kucharska", "https://example.com/ksiazka"]],
};
await join(b.invite, "Ola", wl.Ola);
await join(b.invite, "Anna", wl.Anna);
await join(b.invite, "Zosia", wl.Zosia);
const bartek = await join(b.invite, "Bartek", [], { shotJoin: "join" });
await bartek.getByRole("button", { name: "Losuję!" }).click();
await bartek.getByText("Kupujesz prezent dla").waitFor({ timeout: 20000 });
await snap(bartek, "reveal");

// Event 3 — Aurora: organizer panel
const c = await createEvent({ name: "Wiosenna wymiana w biurze", theme: "Zorza", budget: 60, date: "2027-04-02", people: ["Ania", "Bogdan", "Celina", "Darek", "Ewa"], takePart: true });
await join(c.invite, "Ania");
await join(c.invite, "Celina");
await org.goto(c.panel);
await snap(org, "panel");

await browser.close();
