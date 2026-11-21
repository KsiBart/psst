// Builds docs/screens/banner.png (README hero) from the phone screenshots. Run after e2e/screenshots.mjs.
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  playwright = require(require.resolve("playwright", { paths: ["/usr/local/lib/node_modules", "/usr/lib/node_modules"] }));
}
const dir = new URL("../docs/screens/", import.meta.url).pathname;
const img = (n) => `data:image/png;base64,${readFileSync(dir + n + ".png").toString("base64")}`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Inter:wght@500;600&display=swap" rel="stylesheet">
<style>
  body{margin:0;width:1600px;height:860px;background:#0b1422;font-family:Inter,sans-serif;color:#f4f7fb;overflow:hidden;position:relative}
  .dots span{position:absolute;border-radius:50%;background:#fff;opacity:.5}
  .copy{position:absolute;left:96px;top:150px;width:560px}
  .logo{display:flex;align-items:center;gap:16px;font:800 64px 'Bricolage Grotesque';letter-spacing:-1.5px}
  .logo i{width:72px;height:72px;border-radius:22px;background:#ff6b73;color:#1a0a0c;display:flex;align-items:center;justify-content:center;font-style:normal;font-size:46px}
  h1{font:800 58px/1.04 'Bricolage Grotesque';letter-spacing:-1.5px;margin:40px 0 22px}
  p{font-size:22px;line-height:1.5;color:#a9b8cc;margin:0}
  .pills{display:flex;gap:10px;margin-top:34px;flex-wrap:wrap}
  .pills b{font-weight:600;font-size:17px;padding:10px 16px;border-radius:999px}
  .phone{position:absolute;width:300px;height:649px;border-radius:44px;padding:10px;background:#1c2738;box-shadow:0 40px 80px rgba(0,0,0,.5),inset 0 0 0 2px #2b3a52}
  .phone img{width:100%;height:100%;border-radius:36px;display:block}
</style></head><body>
<div class="dots">${Array.from({ length: 70 }, (_, i) => {
  const r = (n) => { const x = Math.sin((i + 1) * 12.9898 + n * 78.233) * 43758.5453; return x - Math.floor(x); };
  const s = 2 + r(1) * 4;
  return `<span style="left:${(r(2) * 100).toFixed(1)}%;top:${(r(3) * 100).toFixed(1)}%;width:${s}px;height:${s}px;opacity:${(0.2 + r(4) * 0.6).toFixed(2)}"></span>`;
}).join("")}</div>
<div class="copy">
  <div class="logo"><i>?</i>Psst!</div>
  <h1>Kto komu kupuje prezent?<br>Tylko Ty wiesz.</h1>
  <p>Losowanie prezentów na Mikołajki, urodziny i wymianę w biurze. Jeden link, zero e-maili, zero spojlerów.</p>
  <div class="pills">
    <b style="background:#24385a">❄ Szron</b><b style="background:#f7e3cf;color:#24170f">✦ Konfetti</b><b style="background:#332b5c">✧ Zorza</b>
  </div>
</div>
<div class="phone" style="left:700px;top:150px;transform:rotate(-5deg)"><img src="${img("dashboard")}"></div>
<div class="phone" style="left:960px;top:95px;z-index:2"><img src="${img("reveal")}"></div>
<div class="phone" style="left:1220px;top:150px;transform:rotate(5deg)"><img src="${img("panel")}"></div>
</body></html>`;

const b = await playwright.chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 860 }, deviceScaleFactor: 1.5 });
await p.setContent(html, { waitUntil: "networkidle" });
await p.screenshot({ path: dir + "banner.png" });
await b.close();
console.log("saved banner");
