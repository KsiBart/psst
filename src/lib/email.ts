import "server-only";
import { Resend } from "resend";

const FROM = process.env.EMAIL_FROM || "Psst! <onboarding@resend.dev>";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export async function sendEmail(opts: { to: string; subject: string; heading: string; body: string; cta: string; url: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.info(`[email:dev] to=${opts.to} ${opts.subject}: ${opts.url}`);
    else console.warn("RESEND_API_KEY is not set — email not sent");
    return false;
  }
  const html = `<!doctype html><html><body style="margin:0;background:#0E1A2B;font-family:Inter,Arial,sans-serif;color:#F4F7FB">
<div style="max-width:480px;margin:0 auto;padding:32px 20px">
<div style="font-size:24px;font-weight:800;margin-bottom:24px">Psst!</div>
<div style="background:#17263B;border-radius:20px;padding:24px">
<h1 style="margin:0 0 12px;font-size:22px">${escapeHtml(opts.heading)}</h1>
<p style="margin:0 0 20px;color:#C9D4E3;line-height:1.5">${escapeHtml(opts.body)}</p>
<a href="${escapeHtml(opts.url)}" style="display:inline-block;background:#FF6B73;color:#1A0A0C;font-weight:700;text-decoration:none;padding:14px 22px;border-radius:14px">${escapeHtml(opts.cta)}</a>
</div></div></body></html>`;
  const { error } = await new Resend(key).emails.send({ from: FROM, to: opts.to, subject: opts.subject, html, text: `${opts.body}\n\n${opts.url}` });
  if (error) {
    console.error("Resend error", error.name, error.message);
    return false;
  }
  return true;
}
