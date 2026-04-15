/**
 * Transactional e-mail.
 *
 * Stöder tre lägen — första matchande används:
 *   1. SMTP (Simply, Gmail, m.fl.) — om SMTP_HOST + SMTP_USER + SMTP_PASS finns.
 *   2. Resend HTTP API — om RESEND_API_KEY finns.
 *   3. Mock — loggar till konsolen. Används i dev utan credentials.
 *
 * Ingen request ska kunna kvadda pga mail-fel — alla anrop loggar och sväljer
 * exceptions så att ex. pilot-signup alltid svarar 200.
 */

import { Resend } from "resend";
import nodemailer, { type Transporter } from "nodemailer";

const FROM = process.env.EMAIL_FROM ?? "DAJO <hello@dajo.club>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "hello@dajo.club";
const APP_URL = process.env.APP_URL ?? "https://dajo.club";

/* ─── Backend-val ────────────────────────────────────────────────────────── */

type Backend = "smtp" | "resend" | "mock";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
const SMTP_SECURE = process.env.SMTP_SECURE === "true"; // 465 = true, 587 = false (STARTTLS)
const RESEND_API_KEY = process.env.RESEND_API_KEY;

let transporter: Transporter | null = null;
let resend: Resend | null = null;
let backend: Backend = "mock";

if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  backend = "smtp";
  console.log(`[email] SMTP-backend aktiv (${SMTP_HOST}:${SMTP_PORT})`);
} else if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
  backend = "resend";
  console.log("[email] Resend-backend aktiv");
} else {
  console.log("[email] Mock-läge — inga credentials satta. Mejl loggas bara.");
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Kategori-styrd unsubscribe: vi har ett brev åt gången just nu, men lämnar
// öppet för fler mallar sen.
function unsubscribeMailto(): string {
  return `mailto:${REPLY_TO}?subject=unsubscribe`;
}
function unsubscribeUrl(to: string): string {
  return `${APP_URL}/api/pilot/unsubscribe?email=${encodeURIComponent(to)}`;
}

function generateMessageId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  // Domän från EMAIL_FROM för att matcha DKIM-signering
  const domain = (FROM.match(/@([^>\s]+)/)?.[1] ?? "dajo.club").replace(/>/g, "");
  return `<${ts}.${rand}@${domain}>`;
}

async function send({ to, subject, html, text }: SendArgs): Promise<void> {
  if (backend === "mock") {
    console.log(`[email:mock] → ${to}  "${subject}"`);
    console.log(text);
    return;
  }

  // Headers som förbättrar deliverability:
  //  • List-Unsubscribe (RFC 2369) + List-Unsubscribe-Post (RFC 8058)
  //  • Egen Message-ID på vår domän så den signeras av DKIM och inte ser autogenererad ut
  const headers: Record<string, string> = {
    "List-Unsubscribe": `<${unsubscribeMailto()}>, <${unsubscribeUrl(to)}>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    "X-Entity-Ref-ID": generateMessageId().replace(/[<>]/g, ""),
  };
  const messageId = generateMessageId();

  try {
    if (backend === "smtp" && transporter) {
      await transporter.sendMail({
        from: FROM,
        to,
        replyTo: REPLY_TO,
        subject,
        html,
        text,
        messageId,
        headers,
      });
      console.log(`[email:smtp] ✓ skickat → ${to}  "${subject}"`);
      return;
    }
    if (backend === "resend" && resend) {
      const { error } = await resend.emails.send({
        from: FROM,
        to,
        replyTo: REPLY_TO,
        subject,
        html,
        text,
        headers,
      });
      if (error) {
        console.error(`[email:resend] Fel för ${to}:`, error);
      } else {
        console.log(`[email:resend] ✓ skickat → ${to}  "${subject}"`);
      }
    }
  } catch (err) {
    console.error(`[email] Oväntat fel för ${to}:`, err);
  }
}

/* ─── Brand-wrapper (cream/amber) ────────────────────────────────────────── */

function layout(bodyHtml: string, preheader: string): string {
  return `<!doctype html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>DAJO</title>
  </head>
  <body style="margin:0;padding:0;background:#FBF8F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2937;">
    <div style="display:none;max-height:0;overflow:hidden;">${preheader}</div>
    <div style="display:none;max-height:0;overflow:hidden;">&#847;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FBF8F3;padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #F5F0E6;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:32px 36px 8px 36px;">
                <div style="font-family:Georgia,serif;font-size:22px;font-weight:800;color:#1F2937;letter-spacing:-0.01em;">
                  DAJO <span style="color:#E89B4A;">♪</span>
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 36px 32px 36px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 36px;background:#F5F0E6;color:#6B7280;font-size:12px;line-height:1.6;">
                Byggt i Sverige · Ingen annonsspårning · Data stannar i EU<br/>
                <a href="${APP_URL}" style="color:#3A6391;text-decoration:none;">${APP_URL.replace(/^https?:\/\//, "")}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/* ─── Pilot-welcome ──────────────────────────────────────────────────────── */

export async function sendPilotWelcome(args: {
  email: string;
  name?: string | null;
  instrument?: string | null;
}): Promise<void> {
  const hi = args.name ? `Hej ${args.name}!` : "Hej!";
  const instrumentLine = args.instrument
    ? `<p style="margin:0 0 16px 0;color:#6B7280;font-size:14px;">Du skrev <strong style="color:#1F2937;">${escapeHtml(args.instrument)}</strong> — perfekt, det hjälper oss att matcha testsessionerna.</p>`
    : "";

  const body = `
    <h1 style="margin:16px 0 12px 0;font-family:Georgia,serif;font-size:26px;font-weight:800;color:#1F2937;line-height:1.2;">
      ${escapeHtml(hi)} Välkommen till DAJO-piloten ✨
    </h1>
    <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1F2937;">
      Tack för att du anmält dig! Vi bygger DAJO för musiker som är trötta på
      sönderskrivna PDF:er och krångliga iReal-filer. Du är nu på listan.
    </p>
    ${instrumentLine}
    <p style="margin:0 0 20px 0;font-size:15px;line-height:1.6;color:#1F2937;">
      <strong>Vad händer nu?</strong><br/>
      Vi hör av oss så snart din inbjudan är klar — oftast inom någon vecka.
      Då får du ett inlogg och kan börja mata in dina första låtar.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 20px 0;">
      <tr>
        <td style="border-radius:12px;background:#3A6391;">
          <a href="${APP_URL}" style="display:inline-block;padding:12px 20px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
            Läs mer om DAJO →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:16px 0 0 0;font-size:13px;line-height:1.6;color:#9CA3AF;">
      Frågor? Svara bara på det här mejlet så landar det hos oss på
      hello@dajo.club.
    </p>
  `;

  const text = [
    hi,
    "",
    "Välkommen till DAJO-piloten!",
    "",
    "Tack för att du anmält dig. Vi hör av oss så snart din inbjudan är klar — oftast inom någon vecka.",
    args.instrument ? `Instrument: ${args.instrument}` : "",
    "",
    `Läs mer: ${APP_URL}`,
    "",
    "Frågor? Svara på mejlet så landar det hos oss.",
    "— DAJO-teamet",
  ]
    .filter(Boolean)
    .join("\n");

  await send({
    to: args.email,
    subject: "Välkommen till DAJO-piloten ✨",
    html: layout(body, "Tack för din anmälan — vi hör av oss snart!"),
    text,
  });
}

/* ─── Admin-notifiering när någon anmäler sig ───────────────────────────── */

export async function notifyAdminOfSignup(args: {
  adminEmail: string;
  signup: { email: string; name?: string | null; instrument?: string | null };
  totalCount?: number;
}): Promise<void> {
  const { signup, adminEmail, totalCount } = args;

  const body = `
    <h1 style="margin:16px 0 12px 0;font-family:Georgia,serif;font-size:22px;font-weight:800;color:#1F2937;">
      Ny pilotanmälan 🎉
    </h1>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0;border:1px solid #F5F0E6;border-radius:12px;overflow:hidden;">
      <tr>
        <td style="padding:12px 16px;background:#FBF8F3;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;">E-post</td>
        <td style="padding:12px 16px;font-size:14px;color:#1F2937;font-weight:600;">${escapeHtml(signup.email)}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#FBF8F3;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-top:1px solid #F5F0E6;">Namn</td>
        <td style="padding:12px 16px;font-size:14px;color:#1F2937;border-top:1px solid #F5F0E6;">${escapeHtml(signup.name ?? "—")}</td>
      </tr>
      <tr>
        <td style="padding:12px 16px;background:#FBF8F3;font-size:12px;color:#6B7280;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;border-top:1px solid #F5F0E6;">Instrument</td>
        <td style="padding:12px 16px;font-size:14px;color:#1F2937;border-top:1px solid #F5F0E6;">${escapeHtml(signup.instrument ?? "—")}</td>
      </tr>
    </table>
    ${typeof totalCount === "number" ? `<p style="margin:8px 0 0 0;font-size:13px;color:#6B7280;">Totalt antal anmälningar: <strong style="color:#1F2937;">${totalCount}</strong></p>` : ""}
    <p style="margin:16px 0 0 0;font-size:13px;color:#6B7280;">
      <a href="${APP_URL}/admin/pilot" style="color:#3A6391;font-weight:600;text-decoration:none;">Öppna admin-vyn →</a>
    </p>
  `;

  const text = [
    "Ny pilotanmälan:",
    `  E-post: ${signup.email}`,
    `  Namn: ${signup.name ?? "—"}`,
    `  Instrument: ${signup.instrument ?? "—"}`,
    typeof totalCount === "number" ? `  Totalt: ${totalCount}` : "",
    "",
    `${APP_URL}/admin/pilot`,
  ]
    .filter(Boolean)
    .join("\n");

  await send({
    to: adminEmail,
    subject: `Ny DAJO-pilotanmälan: ${signup.email}`,
    html: layout(body, `${signup.email} anmälde sig just till piloten.`),
    text,
  });
}

/* ─── Utils ──────────────────────────────────────────────────────────────── */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
