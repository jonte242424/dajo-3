import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db.js";
import { analyzeFile, type MediaType } from "./ai-import.js";
import { generatePdf, generateSetlistPdf, type ExportStyle } from "./pdf-export.js";
import { sendPilotWelcome, notifyAdminOfSignup } from "./email.js";
import type { Section } from "../shared/types.js";

dotenv.config({ path: ".env.local", override: true });

// ─── Auto-migrate databas vid start ──────────────────────────────────────────

let dbReady = false;

async function runMigrations() {
  if (!db) {
    console.log("⚠️ Ingen databaskonfiguration — använder mock-data");
    dbReady = false;
    return;
  }

  try {
    console.log("🔌 Testar databasanslutning...");
    const result = await Promise.race([
      db.query("SELECT NOW()"),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Connection timeout")), 5000)
      )
    ]);

    console.log("✅ Databaskoppling OK");

    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaPath = path.join(__dirname, "schema.sql");
    if (!fs.existsSync(schemaPath)) {
      console.log("⚠️ schema.sql hittades inte — hoppar över migrering");
      dbReady = true;
      return;
    }
    const sql = fs.readFileSync(schemaPath, "utf8");
    await db.query(sql);
    console.log("✅ Databas-schema kört");
    dbReady = true;
  } catch (err) {
    console.error("⚠️ Databaskoppling misslyckades:", err instanceof Error ? err.message : err);
    console.log("📱 Fortsätter i offline-läge — använder mock-data");
    dbReady = false;
  }
}

// Kör migrering asynkront utan att blockera servern
runMigrations().catch(err => console.error("Unexpected migration error:", err));

const app = express();
const isProd = process.env.NODE_ENV === "production";
// Force port 3001 for production, otherwise use env or default to 3001
// Use PORT from environment (Render sets it to 10000), fallback to 3001
const PORT = parseInt(process.env.PORT || "3001", 10);
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";

// Debug output after variables are defined
console.log("🚀 DAJO 3.0 Production Server Starting");
console.log(`  NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`  PORT env: ${process.env.PORT}`);
console.log(`  PORT var: ${PORT}`);
if (isProd) {
  console.log("  Environment variables (production):");
  Object.entries(process.env)
    .filter(([key]) => key.includes("PORT") || key.includes("RAILWAY") || key.includes("NODE_"))
    .forEach(([key, val]) => console.log(`    ${key}: ${val?.substring(0, 50)}`));
}

// Verify JWT_SECRET is set for login
if (isProd && !process.env.JWT_SECRET) {
  console.warn("⚠️  JWT_SECRET not set - using default dev secret");
}

// Database diagnostics
if (isProd) {
  const dbUrl = process.env.DATABASE_URL;
  console.log(`📊 Database Status:`);
  console.log(`  - DATABASE_URL set: ${dbUrl ? '✓' : '✗'}`);
  if (dbUrl) {
    const masked = dbUrl.replace(/:[^:/@]*@/, ':***@');
    console.log(`  - Connection string: ${masked}`);
  }
}

app.use(cors({
  origin: isProd ? true : "http://localhost:5173",
  credentials: true,
}));
app.use(express.json({ limit: "100mb" })); // Large limit for base64 file uploads

// ─── Auth middleware ──────────────────────────────────────────────────────────

function requireAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Inte inloggad" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Ogiltig session — logga in igen" });
  }
}

// ─── Admin allowlist ──────────────────────────────────────────────────────────
// Comma-separated list of admin e-mail addresses via PILOT_ADMIN_EMAILS.
// Default to Jonas + David so the admin-vy fungerar direkt under piloten.
const ADMIN_EMAILS = new Set(
  (process.env.PILOT_ADMIN_EMAILS ??
    "hello@dajo.club,jonas@combined.se,david@combined.se,jonas.martensson@combined.se"
  )
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

function isAdminEmail(email?: string): boolean {
  return !!email && ADMIN_EMAILS.has(email.toLowerCase());
}

function requireAdmin(req: any, res: any, next: any) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Inte inloggad" });
  try {
    const user = jwt.verify(token, JWT_SECRET) as any;
    if (!isAdminEmail(user.email)) {
      return res.status(403).json({ error: "Endast administratörer har tillgång" });
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Ogiltig session — logga in igen" });
  }
}

// ─── Mock data (used when DATABASE_URL is not set) ───────────────────────────

const MOCK_SONGS = [
  {
    id: 1,
    userId: "1",
    title: "Autumn Leaves",
    artist: "Joseph Kosma",
    key: "G",
    tempo: 120,
    timeSignature: "4/4",
    style: "Jazz",
    preferredFormat: "ireal",
    isPublic: false,
    notes: "",
    sections: [
      {
        id: "s1",
        name: "A",
        type: "bars",
        bars: [
          { chords: [{ symbol: "Am7", beat: 1 }, { symbol: "D7", beat: 3 }], lyrics: "" },
          { chords: [{ symbol: "Gmaj7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Cmaj7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "F#m7b5", beat: 1 }, { symbol: "B7", beat: 3 }], lyrics: "" },
        ],
      },
      {
        id: "s2",
        name: "B",
        type: "bars",
        bars: [
          { chords: [{ symbol: "Em7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Em7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Am7", beat: 1 }, { symbol: "D7", beat: 3 }], lyrics: "" },
          { chords: [{ symbol: "Gmaj7", beat: 1 }], lyrics: "" },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: "1",
    title: "Blue Bossa",
    artist: "Kenny Dorham",
    key: "Cm",
    tempo: 130,
    timeSignature: "4/4",
    style: "Bossa Nova",
    preferredFormat: "ireal",
    isPublic: false,
    notes: "",
    sections: [
      {
        id: "s1",
        name: "A",
        type: "bars",
        bars: [
          { chords: [{ symbol: "Cm7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Cm7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Fm7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Fm7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Dm7b5", beat: 1 }, { symbol: "G7b9", beat: 3 }], lyrics: "" },
          { chords: [{ symbol: "Cm7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Ebmaj7", beat: 1 }], lyrics: "" },
          { chords: [{ symbol: "Ab7", beat: 1 }], lyrics: "" },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
  },
];

// ─── Health ───────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", db: !!db, mode: db ? "postgres" : "mock" })
);

// ─── Auth: Register ───────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email och lösenord krävs" });
  if (password.length < 6) return res.status(400).json({ error: "Lösenordet måste vara minst 6 tecken" });

  if (!db) {
    const token = jwt.sign({ id: 1, email }, JWT_SECRET, { expiresIn: "7d" });
    return res.json({ token, user: { id: 1, email, name: name || "" } });
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await db.query(
      "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING id, email, name",
      [email.toLowerCase(), name || "", hash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user });
  } catch (err: any) {
    if (err.code === "23505") return res.status(400).json({ error: "E-postadressen används redan" });
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Auth: Login ──────────────────────────────────────────────────────────────

app.post("/api/auth/login", (req, res) => {
  try {
    console.log("📝 Login endpoint called");
    const { email, password } = req.body || {};
    console.log(`  Email: ${email}, Password exists: ${!!password}`);

    if (!email || !password) {
      return res.status(400).json({ error: "Email och lösenord krävs" });
    }

    console.log(`  ✅ Validation passed for ${email}`);

    // Create token
    console.log(`  Creating JWT token...`);
    const token = jwt.sign({ id: 1, email }, JWT_SECRET, { expiresIn: "7d" });
    console.log(`  ✅ Token created: ${token.substring(0, 20)}...`);

    return res.json({
      token,
      user: { id: 1, email, name: "Demo User" }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ LOGIN ERROR:", msg);
    return res.status(500).json({
      error: "Serverfel",
      debug: msg
    });
  }
});

// ─── Pilot signup ─────────────────────────────────────────────────────────────

interface PilotSignup {
  id: number;
  email: string;
  name?: string;
  instrument?: string;
  createdAt: string;
}
const MOCK_PILOT_SIGNUPS: PilotSignup[] = [];
let mockPilotId = 1;

// Admin: öppna/stänga pilotanmälan (flag deklareras här så POST /api/pilot/signup
// kan läsa den)
let PILOT_SIGNUPS_OPEN = true;

app.post("/api/pilot/signup", async (req, res) => {
  if (!PILOT_SIGNUPS_OPEN) {
    return res.status(403).json({ error: "Pilotanmälan är stängd just nu" });
  }
  const { email, name, instrument } = req.body ?? {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Giltig e-post krävs" });
  }
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = typeof name === "string" ? name.trim().slice(0, 100) : undefined;
  const cleanInstrument = typeof instrument === "string" ? instrument.trim().slice(0, 100) : undefined;

  // Fire-and-forget mail-triggers. Vi väntar inte på dem så att
  // anmälaren får ett snabbt 200-svar även om Resend är trögt.
  function fireEmails(isNew: boolean) {
    if (!isNew) return;
    const signup = { email: cleanEmail, name: cleanName, instrument: cleanInstrument };
    sendPilotWelcome(signup).catch((err) =>
      console.error("[pilot] welcome-mail failed:", err),
    );
    const firstAdmin = [...ADMIN_EMAILS][0];
    if (firstAdmin) {
      notifyAdminOfSignup({ adminEmail: firstAdmin, signup }).catch((err) =>
        console.error("[pilot] admin-notif failed:", err),
      );
    }
  }

  if (!db) {
    if (MOCK_PILOT_SIGNUPS.some((s) => s.email === cleanEmail)) {
      return res.json({ ok: true, alreadyRegistered: true });
    }
    MOCK_PILOT_SIGNUPS.push({
      id: mockPilotId++,
      email: cleanEmail,
      name: cleanName,
      instrument: cleanInstrument,
      createdAt: new Date().toISOString(),
    });
    console.log(`📝 Pilot signup (mock): ${cleanEmail}${cleanName ? ` · ${cleanName}` : ""}${cleanInstrument ? ` · ${cleanInstrument}` : ""}`);
    fireEmails(true);
    return res.json({ ok: true });
  }

  try {
    const result = await db.query(
      `INSERT INTO pilot_signups (email, name, instrument)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [cleanEmail, cleanName ?? null, cleanInstrument ?? null]
    );
    const isNewSignup = (result.rowCount ?? 0) > 0;
    fireEmails(isNewSignup);
    res.json({ ok: true, alreadyRegistered: !isNewSignup });
  } catch (err: any) {
    console.error("Pilot signup error:", err);
    res.status(500).json({ error: "Kunde inte spara anmälan" });
  }
});

// Publik avanmälan (för List-Unsubscribe-headern i utskick).
// Funkar både som GET (länk man klickar) och POST (RFC 8058 one-click).
async function handleUnsubscribe(req: any, res: any) {
  const email = (req.query?.email ?? req.body?.email ?? "").toString().trim().toLowerCase();

  // Vi ska aldrig låta endpointen kasta — även tomma anrop ger en vänlig sida.
  try {
    if (email && email.includes("@")) {
      if (db) {
        await db.query("DELETE FROM pilot_signups WHERE email = $1", [email]);
      } else {
        const idx = MOCK_PILOT_SIGNUPS.findIndex((s) => s.email === email);
        if (idx >= 0) MOCK_PILOT_SIGNUPS.splice(idx, 1);
      }
      console.log(`📭 Unsubscribed: ${email}`);
    }
  } catch (err) {
    console.error("Unsubscribe error:", err);
  }

  res
    .status(200)
    .setHeader("Content-Type", "text/html; charset=utf-8")
    .send(`<!doctype html><html lang="sv"><head><meta charset="utf-8">
<title>Avanmäld — DAJO</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;background:#FBF8F3;color:#1F2937;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}
.card{max-width:440px;padding:40px;background:#fff;border:1px solid #F5F0E6;border-radius:24px;text-align:center}
h1{font-family:Georgia,serif;margin:0 0 12px 0;color:#1F2937}
p{margin:0;color:#6B7280;font-size:14px;line-height:1.6}a{color:#3A6391;text-decoration:none;font-weight:600}</style>
</head><body><div class="card">
<h1>Du är avanmäld 👋</h1>
<p>Inga fler mejl från DAJO. Vi är ledsna att se dig gå — men förstår. Om det var ett misstag, <a href="${APP_URL}">anmäl dig igen här</a>.</p>
</div></body></html>`);
}

app.get("/api/pilot/unsubscribe", handleUnsubscribe);
app.post("/api/pilot/unsubscribe", handleUnsubscribe);

// Admin: list pilot signups
app.get("/api/pilot/signups", requireAdmin, async (_req: any, res) => {
  if (!db) return res.json(MOCK_PILOT_SIGNUPS.slice().reverse());
  try {
    const result = await db.query(
      "SELECT id, email, name, instrument, created_at FROM pilot_signups ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Pilot list error:", err);
    res.status(500).json({ error: "Kunde inte hämta anmälningar" });
  }
});

// Admin: CSV-export av pilotanmälningar
app.get("/api/pilot/signups.csv", requireAdmin, async (_req: any, res) => {
  function csvEscape(v: any): string {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
  try {
    const rows = db
      ? (await db.query(
          "SELECT id, email, name, instrument, created_at FROM pilot_signups ORDER BY created_at DESC"
        )).rows
      : MOCK_PILOT_SIGNUPS.slice().reverse();

    const header = "id,email,name,instrument,created_at";
    const lines = rows.map((r: any) =>
      [r.id, r.email, r.name, r.instrument, r.created_at].map(csvEscape).join(",")
    );
    const csv = [header, ...lines].join("\n");

    const filename = `dajo-pilot-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csv); // BOM så Excel öppnar UTF-8 korrekt
  } catch (err: any) {
    console.error("Pilot CSV error:", err);
    res.status(500).json({ error: "Kunde inte generera CSV" });
  }
});

app.get("/api/pilot/status", (_req, res) => {
  res.json({ open: PILOT_SIGNUPS_OPEN });
});
app.post("/api/pilot/status", requireAdmin, (req: any, res) => {
  const open = !!req.body?.open;
  PILOT_SIGNUPS_OPEN = open;
  res.json({ open: PILOT_SIGNUPS_OPEN });
});

// ─── Debug: Version ───────────────────────────────────────────────────────────

app.get("/api/debug/version", (req, res) => {
  res.json({
    version: "02cdef8",
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    port: PORT,
    uptime: Math.floor(process.uptime())
  });
});

// ─── Auth: Me ─────────────────────────────────────────────────────────────────

app.get("/api/auth/me", requireAuth, (req: any, res) => {
  res.json({
    user: {
      ...req.user,
      isAdmin: isAdminEmail(req.user?.email),
    },
  });
});

// ─── Songs: List ─────────────────────────────────────────────────────────────

app.get("/api/songs", requireAuth, async (req: any, res) => {
  if (!db) return res.json(MOCK_SONGS);
  try {
    const result = await db.query(
      `SELECT id, user_id, title, artist, key, tempo, time_signature, style,
              preferred_format, is_public, notes,
              jsonb_array_length(sections) as section_count,
              created_at, updated_at
       FROM songs WHERE user_id = $1 ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Kunde inte hämta låtar" });
  }
});

// ─── Songs: Create ───────────────────────────────────────────────────────────

app.post("/api/songs", requireAuth, async (req: any, res) => {
  const {
    title, artist = "", key = "C", tempo = 120,
    timeSignature = "4/4", style = "", sections = [],
    notes = "", preferredFormat = "ireal",
  } = req.body;

  if (!title) return res.status(400).json({ error: "Titel krävs" });

  if (!db) {
    const song = {
      id: Date.now(), userId: String(req.user.id), title, artist, key, tempo,
      timeSignature, style, sections, notes, preferredFormat,
      isPublic: false, createdAt: new Date().toISOString(),
    };
    MOCK_SONGS.push(song as any);
    return res.status(201).json(song);
  }

  try {
    const result = await db.query(
      `INSERT INTO songs (user_id, title, artist, key, tempo, time_signature, style,
                          sections, notes, preferred_format)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, title, artist, key, tempo, timeSignature, style,
       JSON.stringify(sections), notes, preferredFormat]
    );
    res.status(201).json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Kunde inte skapa låt" });
  }
});

// ─── Songs: Get one ──────────────────────────────────────────────────────────

app.get("/api/songs/:id", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  if (!db) {
    const song = MOCK_SONGS.find((s) => s.id === id);
    return song ? res.json(song) : res.status(404).json({ error: "Låt hittades inte" });
  }
  try {
    const result = await db.query(
      "SELECT * FROM songs WHERE id=$1 AND user_id=$2",
      [id, req.user.id]
    );
    const song = result.rows[0];
    if (!song) return res.status(404).json({ error: "Låt hittades inte" });
    // Map snake_case DB columns to camelCase for frontend
    if (song.original_file_data) {
      song.originalFileData = song.original_file_data;
      song.originalFileType = song.original_file_type;
    }
    res.json(song);
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Songs: Update ───────────────────────────────────────────────────────────

app.put("/api/songs/:id", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  const {
    title, artist, key, tempo, timeSignature, style,
    sections, notes, preferredFormat,
  } = req.body;

  if (!db) {
    const song = MOCK_SONGS.find((s) => s.id === id);
    if (!song) return res.status(404).json({ error: "Låt hittades inte" });
    Object.assign(song, { title, artist, key, tempo, timeSignature, style, sections, notes, preferredFormat });
    return res.json(song);
  }

  try {
    const result = await db.query(
      `UPDATE songs SET
         title=$1, artist=$2, key=$3, tempo=$4, time_signature=$5,
         style=$6, sections=$7, notes=$8, preferred_format=$9
       WHERE id=$10 AND user_id=$11 RETURNING *`,
      [title, artist, key, tempo, timeSignature, style,
       JSON.stringify(sections), notes, preferredFormat, id, req.user.id]
    );
    const song = result.rows[0];
    if (!song) return res.status(404).json({ error: "Låt hittades inte" });
    res.json(song);
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Songs: Transpose ────────────────────────────────────────────────────────

app.put("/api/songs/:id/transpose", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  const { semitones } = req.body;
  if (typeof semitones !== "number") return res.status(400).json({ error: "semitones krävs" });

  // Import dynamically so server can run without building client
  const { transposeSections, transposeChord } = await import("../shared/chord-utils.js");

  if (!db) {
    const song = MOCK_SONGS.find((s) => s.id === id);
    if (!song) return res.status(404).json({ error: "Låt hittades inte" });
    song.sections = transposeSections(song.sections as Section[], semitones) as any;
    song.key = transposeChord(song.key, semitones);
    return res.json(song);
  }

  try {
    const result = await db.query("SELECT * FROM songs WHERE id=$1 AND user_id=$2", [id, req.user.id]);
    const song = result.rows[0];
    if (!song) return res.status(404).json({ error: "Låt hittades inte" });

    const newSections = transposeSections(song.sections as Section[], semitones);
    const newKey = transposeChord(song.key, semitones);

    const updated = await db.query(
      "UPDATE songs SET sections=$1, key=$2 WHERE id=$3 AND user_id=$4 RETURNING *",
      [JSON.stringify(newSections), newKey, id, req.user.id]
    );
    res.json(updated.rows[0]);
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Songs: Delete ───────────────────────────────────────────────────────────

app.delete("/api/songs/:id", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  if (!db) {
    const i = MOCK_SONGS.findIndex((s) => s.id === id);
    if (i === -1) return res.status(404).json({ error: "Låt hittades inte" });
    MOCK_SONGS.splice(i, 1);
    return res.json({ ok: true });
  }
  try {
    await db.query("DELETE FROM songs WHERE id=$1 AND user_id=$2", [id, req.user.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Chord suggestions endpoint (for frontend autocomplete) ──────────────────

app.get("/api/chords/suggest", requireAuth, (req, res) => {
  const { partial = "" } = req.query as { partial: string };
  // Dynamic import — chord-utils uses tonal which is ESM
  import("../shared/chord-utils.js").then(({ getChordSuggestions }) => {
    res.json(getChordSuggestions(partial, 12));
  });
});

// ─── Key info endpoint ────────────────────────────────────────────────────────

app.get("/api/music/key/:key", requireAuth, (req, res) => {
  import("../shared/chord-utils.js").then(({ getKeyInfo }) => {
    const info = getKeyInfo(req.params.key);
    if (!info) return res.status(400).json({ error: "Ogiltig tonart" });
    res.json(info);
  });
});

// ─── Mock setlists (used when DATABASE_URL is not set) ────────────────────────

interface MockSetlist {
  id: number;
  userId: string;
  name: string;
  description: string;
  songs: Array<{ id: number; title: string; artist: string; key: string; tempo: number; position: number }>;
  createdAt: string;
}
const MOCK_SETLISTS: MockSetlist[] = [];

// ─── Setlists: List ───────────────────────────────────────────────────────────

app.get("/api/setlists", requireAuth, async (req: any, res) => {
  if (!db) {
    const mine = MOCK_SETLISTS.filter((s) => s.userId === String(req.user.id));
    return res.json(mine.map((s) => ({ ...s, songCount: s.songs.length })));
  }
  try {
    const result = await db.query(
      `SELECT s.id, s.name, s.description, s.created_at,
              COUNT(ss.song_id) as song_count
       FROM setlists s
       LEFT JOIN setlist_songs ss ON ss.setlist_id = s.id
       WHERE s.user_id = $1
       GROUP BY s.id ORDER BY s.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Setlists: Create ─────────────────────────────────────────────────────────

app.post("/api/setlists", requireAuth, async (req: any, res) => {
  const { name, description = "" } = req.body;
  if (!name) return res.status(400).json({ error: "Namn krävs" });

  if (!db) {
    const sl: MockSetlist = {
      id: Date.now(), userId: String(req.user.id),
      name, description, songs: [], createdAt: new Date().toISOString(),
    };
    MOCK_SETLISTS.push(sl);
    return res.status(201).json({ ...sl, songCount: 0 });
  }
  try {
    const result = await db.query(
      "INSERT INTO setlists (user_id, name, description) VALUES ($1,$2,$3) RETURNING *",
      [req.user.id, name, description]
    );
    res.status(201).json({ ...result.rows[0], songCount: 0 });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Setlists: Get one ────────────────────────────────────────────────────────

app.get("/api/setlists/:id", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  if (!db) {
    const sl = MOCK_SETLISTS.find((s) => s.id === id && s.userId === String(req.user.id));
    if (!sl) return res.status(404).json({ error: "Hittades inte" });
    return res.json(sl);
  }
  try {
    const sl = await db.query("SELECT * FROM setlists WHERE id=$1 AND user_id=$2", [id, req.user.id]);
    if (!sl.rows[0]) return res.status(404).json({ error: "Hittades inte" });
    const songs = await db.query(
      `SELECT s.id, s.title, s.artist, s.key, s.tempo, ss.position
       FROM setlist_songs ss JOIN songs s ON s.id = ss.song_id
       WHERE ss.setlist_id = $1 ORDER BY ss.position`,
      [id]
    );
    res.json({ ...sl.rows[0], songs: songs.rows });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Setlists: Delete ─────────────────────────────────────────────────────────

app.delete("/api/setlists/:id", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  if (!db) {
    const i = MOCK_SETLISTS.findIndex((s) => s.id === id && s.userId === String(req.user.id));
    if (i === -1) return res.status(404).json({ error: "Hittades inte" });
    MOCK_SETLISTS.splice(i, 1);
    return res.json({ ok: true });
  }
  try {
    await db.query("DELETE FROM setlists WHERE id=$1 AND user_id=$2", [id, req.user.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Setlists: Add song ───────────────────────────────────────────────────────

app.post("/api/setlists/:id/songs", requireAuth, async (req: any, res) => {
  const slId = Number(req.params.id);
  const { songId } = req.body;
  if (!songId) return res.status(400).json({ error: "songId krävs" });

  if (!db) {
    const sl = MOCK_SETLISTS.find((s) => s.id === slId && s.userId === String(req.user.id));
    if (!sl) return res.status(404).json({ error: "Hittades inte" });
    const song = MOCK_SONGS.find((s) => s.id === songId);
    if (!song) return res.status(404).json({ error: "Låt hittades inte" });
    if (!sl.songs.find((s) => s.id === songId)) {
      sl.songs.push({ id: song.id, title: song.title, artist: song.artist, key: song.key, tempo: song.tempo, position: sl.songs.length });
    }
    return res.json({ ok: true });
  }
  try {
    const maxPos = await db.query(
      "SELECT COALESCE(MAX(position),0) as max FROM setlist_songs WHERE setlist_id=$1", [slId]
    );
    await db.query(
      "INSERT INTO setlist_songs (setlist_id, song_id, position) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING",
      [slId, songId, maxPos.rows[0].max + 1]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Setlists: Remove song ────────────────────────────────────────────────────

app.delete("/api/setlists/:id/songs/:songId", requireAuth, async (req: any, res) => {
  const slId = Number(req.params.id);
  const songId = Number(req.params.songId);
  if (!db) {
    const sl = MOCK_SETLISTS.find((s) => s.id === slId && s.userId === String(req.user.id));
    if (sl) sl.songs = sl.songs.filter((s) => s.id !== songId);
    return res.json({ ok: true });
  }
  try {
    await db.query("DELETE FROM setlist_songs WHERE setlist_id=$1 AND song_id=$2", [slId, songId]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Setlists: Reorder ────────────────────────────────────────────────────────

app.put("/api/setlists/:id/reorder", requireAuth, async (req: any, res) => {
  const slId = Number(req.params.id);
  const { songIds } = req.body;
  if (!Array.isArray(songIds)) return res.status(400).json({ error: "songIds krävs" });

  if (!db) {
    const sl = MOCK_SETLISTS.find((s) => s.id === slId && s.userId === String(req.user.id));
    if (sl) {
      sl.songs = songIds.map((id: number, pos: number) => {
        const existing = sl.songs.find((s) => s.id === id);
        return existing ? { ...existing, position: pos } : null;
      }).filter(Boolean) as any[];
    }
    return res.json({ ok: true });
  }
  try {
    for (let i = 0; i < songIds.length; i++) {
      await db.query(
        "UPDATE setlist_songs SET position=$1 WHERE setlist_id=$2 AND song_id=$3",
        [i, slId, songIds[i]]
      );
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Songs: Toggle public / share ────────────────────────────────────────────

app.put("/api/songs/:id/share", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  const { isPublic } = req.body;

  if (!db) {
    const song = MOCK_SONGS.find((s) => s.id === id);
    if (!song) return res.status(404).json({ error: "Hittades inte" });
    (song as any).isPublic = isPublic;
    return res.json({ shareUrl: isPublic ? `/share/${id}` : null });
  }
  try {
    await db.query("UPDATE songs SET is_public=$1 WHERE id=$2 AND user_id=$3", [isPublic, id, req.user.id]);
    res.json({ shareUrl: isPublic ? `/share/${id}` : null });
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Songs: Public view (no auth) ────────────────────────────────────────────

app.get("/api/songs/public/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!db) {
    const song = MOCK_SONGS.find((s) => s.id === id && (s as any).isPublic);
    if (!song) return res.status(404).json({ error: "Låten hittades inte eller är inte offentlig" });
    return res.json(song);
  }
  try {
    const result = await db.query("SELECT * FROM songs WHERE id=$1 AND is_public=true", [id]);
    if (!result.rows[0]) return res.status(404).json({ error: "Låten hittades inte eller är inte offentlig" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Export: Generate PDF ─────────────────────────────────────────────────────

app.get("/api/songs/:id/export", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  const style = (req.query.style || "ireal") as ExportStyle;

  if (!["ireal", "songbook", "notation"].includes(style)) {
    return res.status(400).json({ error: "Ogiltig stil. Välj: ireal, songbook eller notation" });
  }

  let song: any;
  if (!db) {
    song = MOCK_SONGS.find((s) => s.id === id);
  } else {
    try {
      const result = await db.query(
        "SELECT * FROM songs WHERE id=$1 AND user_id=$2",
        [id, req.user.id]
      );
      song = result.rows[0];
    } catch {
      return res.status(500).json({ error: "Serverfel" });
    }
  }

  if (!song) return res.status(404).json({ error: "Låt hittades inte" });

  try {
    const pdfBuffer = await generatePdf(
      {
        title: song.title,
        artist: song.artist,
        key: song.key,
        tempo: song.tempo,
        timeSignature: song.time_signature ?? song.timeSignature,
        style: song.style,
        notes: song.notes,
        sections: song.sections,
      },
      style
    );

    const safeName = song.title.replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, "").trim().replace(/\s+/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_${style}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("PDF export error:", err);
    res.status(500).json({ error: "Kunde inte generera PDF" });
  }
});

// ─── Setlist: Export as PDF ───────────────────────────────────────────────────

app.get("/api/setlists/:id/export", requireAuth, async (req: any, res) => {
  const id = Number(req.params.id);
  const style = (req.query.style || "ireal") as ExportStyle;

  if (!["ireal", "songbook", "notation"].includes(style)) {
    return res.status(400).json({ error: "Ogiltig stil. Välj: ireal, songbook eller notation" });
  }

  // No-DB fallback: use MOCK_SETLISTS and MOCK_SONGS
  if (!db) {
    try {
      const sl = MOCK_SETLISTS.find((s) => s.id === id && s.userId === String(req.user.id));
      if (!sl) return res.status(404).json({ error: "Spellista hittades inte" });
      if (sl.songs.length === 0) return res.status(400).json({ error: "Spellistan är tom" });

      const songs = sl.songs
        .sort((a, b) => a.position - b.position)
        .map((entry) => {
          const full = MOCK_SONGS.find((s) => s.id === entry.id) as any;
          if (!full) return null;
          return {
            title: full.title,
            artist: full.artist || "",
            key: full.key || "C",
            tempo: full.tempo || 120,
            timeSignature: full.timeSignature || "4/4",
            style: full.style || "",
            notes: full.notes || "",
            sections: full.sections || [],
          };
        })
        .filter(Boolean) as any[];

      if (songs.length === 0) return res.status(400).json({ error: "Inga giltiga låtar i spellistan" });

      const pdfBuffer = await generateSetlistPdf(
        { name: sl.name, description: sl.description || "", songs },
        style
      );
      const safeName = sl.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, "").trim().replace(/\s+/g, "_");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}_${style}.pdf"`);
      return res.send(pdfBuffer);
    } catch (err: any) {
      console.error("Setlist PDF export error (no-db):", err);
      return res.status(500).json({ error: "Kunde inte generera spellista-PDF", detail: err?.message });
    }
  }

  try {
    // Fetch setlist with songs
    const setlistResult = await db.query(
      `SELECT s.id, s.name, s.description, s.user_id, array_agg(
         json_build_object(
           'songId', ss.song_id, 'position', ss.position
         ) ORDER BY ss.position
       ) as song_positions
       FROM setlists s
       LEFT JOIN setlist_songs ss ON ss.setlist_id = s.id
       WHERE s.id = $1 AND s.user_id = $2
       GROUP BY s.id, s.name, s.description, s.user_id`,
      [id, req.user.id]
    );

    const setlistRow = setlistResult.rows[0];
    if (!setlistRow) return res.status(404).json({ error: "Spellista hittades inte" });

    // Fetch all songs in setlist
    const songIds = (setlistRow.song_positions || [])
      .filter((pos: any) => pos.songId)
      .map((pos: any) => pos.songId);

    if (songIds.length === 0) {
      return res.status(400).json({ error: "Spellistan är tom" });
    }

    const songsResult = await db.query(
      `SELECT id, title, artist, key, tempo, time_signature, style, notes, sections
       FROM songs WHERE id = ANY($1::int[])`,
      [songIds]
    );

    const songMap = new Map(songsResult.rows.map(s => [s.id, s]));
    const songs = songIds
      .map((songId: number) => songMap.get(songId))
      .filter(Boolean)
      .map((s: any) => ({
        title: s.title,
        artist: s.artist || "",
        key: s.key || "C",
        tempo: s.tempo || 120,
        timeSignature: (s.time_signature as string) || "4/4",
        style: s.style || "",
        notes: s.notes || "",
        sections: s.sections || [],
      }));

    // Generate setlist PDF
    const pdfBuffer = await generateSetlistPdf(
      {
        name: setlistRow.name,
        description: setlistRow.description || "",
        songs,
      },
      style
    );

    const safeName = setlistRow.name.replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, "").trim().replace(/\s+/g, "_");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}_${style}.pdf"`);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error("Setlist PDF export error:", err);
    res.status(500).json({ error: "Kunde inte generera spellista-PDF" });
  }
});

// ─── AI Import: Analyze file (PDF or image) ──────────────────────────────────

app.post("/api/import/analyze", requireAuth, async (req: any, res) => {
  const { base64, mediaType, filename, transcribeLyrics } = req.body;

  if (!base64 || !mediaType || !filename) {
    return res.status(400).json({ error: "base64, mediaType och filename krävs" });
  }

  // Allowed media types - includes ChordPro text formats
  const allowed: MediaType[] = [
    "application/pdf",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
    "text/plain", "text/x-chordpro", "application/x-chordpro",
  ];
  // Also check file extension for .pro files (often come as text/plain)
  const ext = filename.split('.').pop()?.toLowerCase();
  const isProFile = ['pro', 'cho', 'chopro', 'chordpro'].includes(ext || '');

  if (!allowed.includes(mediaType) && !isProFile) {
    return res.status(400).json({ error: `Filtypen stöds inte: ${mediaType}` });
  }

  // Rough size check (~100MB base64 limit)
  if (base64.length > 130_000_000) {
    return res.status(400).json({ error: "Filen är för stor (max ~100MB)" });
  }

  try {
    const result = await analyzeFile(base64, mediaType, filename, undefined, {
      transcribeLyrics: Boolean(transcribeLyrics),
    });
    res.json(result);
  } catch (err: any) {
    console.error("AI import error:", err);
    res.status(500).json({ error: err.message || "AI-analysen misslyckades" });
  }
});

// ─── AI Import: Save analyzed songs to DB ────────────────────────────────────

app.post("/api/import/save", requireAuth, async (req: any, res) => {
  const { songs } = req.body;
  if (!Array.isArray(songs) || songs.length === 0) {
    return res.status(400).json({ error: "Inga låtar att spara" });
  }

  const { originalFileData, originalFileType } = req.body;

  const saved = [];
  for (const song of songs.slice(0, 20)) { // max 20 songs per import
    if (!db) {
      const s = {
        id: Date.now() + Math.random(), userId: String(req.user.id), ...song,
        isPublic: false, createdAt: new Date().toISOString(),
        originalFileData: originalFileData || undefined,
        originalFileType: originalFileType || undefined,
      };
      MOCK_SONGS.push(s as any);
      saved.push(s);
      continue;
    }
    try {
      const result = await db.query(
        `INSERT INTO songs (user_id, title, artist, key, tempo, time_signature, style,
                            sections, notes, preferred_format, original_file_data, original_file_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id, title`,
        [req.user.id, song.title, song.artist || "", song.key || "C",
         song.tempo || 120, song.timeSignature || "4/4", song.style || "",
         JSON.stringify(song.sections || []), song.notes || "",
         song.preferredFormat || "ireal",
         originalFileData || null, originalFileType || null]
      );
      saved.push(result.rows[0]);
    } catch (err) {
      console.error("Save song error:", err);
    }
  }

  res.status(201).json({ saved });
});

// ═══════════════════════════════════════════════════════════════════════════
// BANDSPACES (groups) + share tokens
// ═══════════════════════════════════════════════════════════════════════════

// In-memory mock state for groups/invitations/shares when db is not available
const MOCK_GROUPS: { id: number; name: string; createdBy: number; memberIds: number[] }[] = [];
const MOCK_INVITATIONS: { id: number; groupId: number; token: string; used: boolean }[] = [];
const MOCK_SHARES: { token: string; resourceType: "song" | "setlist"; resourceId: number }[] = [];
let mockGroupId = 1;
let mockInvId = 1;

function randomToken(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

// ─── Groups: list (where I'm member) ─────────────────────────────────────────

app.get("/api/groups", requireAuth, async (req: any, res) => {
  if (!db) {
    const mine = MOCK_GROUPS.filter((g) => g.memberIds.includes(Number(req.user.id)));
    return res.json(mine.map((g) => ({ id: g.id, name: g.name, memberCount: g.memberIds.length })));
  }
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.created_by,
              (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = g.id) AS member_count
       FROM groups g
       JOIN group_members m ON m.group_id = g.id
       WHERE m.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("Groups list error:", err);
    res.status(500).json({ error: "Kunde inte hämta bandspaces" });
  }
});

// ─── Groups: create ──────────────────────────────────────────────────────────

app.post("/api/groups", requireAuth, async (req: any, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") return res.status(400).json({ error: "Namn krävs" });

  if (!db) {
    const g = { id: mockGroupId++, name, createdBy: Number(req.user.id), memberIds: [Number(req.user.id)] };
    MOCK_GROUPS.push(g);
    return res.json({ id: g.id, name: g.name, memberCount: 1 });
  }

  try {
    const result = await db.query(
      `WITH new_group AS (
         INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id, name
       )
       INSERT INTO group_members (group_id, user_id)
       SELECT id, $2 FROM new_group
       RETURNING group_id`,
      [name, req.user.id]
    );
    const groupId = result.rows[0].group_id;
    const g = await db.query("SELECT id, name FROM groups WHERE id=$1", [groupId]);
    res.json({ ...g.rows[0], memberCount: 1 });
  } catch (err: any) {
    console.error("Group create error:", err);
    res.status(500).json({ error: "Kunde inte skapa bandspace" });
  }
});

// ─── Groups: create invitation link ──────────────────────────────────────────

app.post("/api/groups/:id/invite", requireAuth, async (req: any, res) => {
  const groupId = Number(req.params.id);
  const token = randomToken();

  if (!db) {
    const g = MOCK_GROUPS.find((x) => x.id === groupId);
    if (!g || !g.memberIds.includes(Number(req.user.id))) {
      return res.status(403).json({ error: "Du är inte medlem i denna bandspace" });
    }
    MOCK_INVITATIONS.push({ id: mockInvId++, groupId, token, used: false });
    return res.json({ token, url: `/join/${token}` });
  }

  try {
    // Check membership
    const member = await db.query(
      "SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2",
      [groupId, req.user.id]
    );
    if (!member.rows[0]) return res.status(403).json({ error: "Du är inte medlem i denna bandspace" });

    await db.query(
      "INSERT INTO invitations (group_id, token, created_by) VALUES ($1, $2, $3)",
      [groupId, token, req.user.id]
    );
    res.json({ token, url: `/join/${token}` });
  } catch (err: any) {
    console.error("Invite create error:", err);
    res.status(500).json({ error: "Kunde inte skapa inbjudan" });
  }
});

// ─── Groups: accept invitation (join) ────────────────────────────────────────

app.post("/api/groups/join/:token", requireAuth, async (req: any, res) => {
  const token = req.params.token;

  if (!db) {
    const inv = MOCK_INVITATIONS.find((i) => i.token === token && !i.used);
    if (!inv) return res.status(404).json({ error: "Ogiltig eller använd inbjudningslänk" });
    const g = MOCK_GROUPS.find((x) => x.id === inv.groupId);
    if (!g) return res.status(404).json({ error: "Bandspace finns inte" });
    if (!g.memberIds.includes(Number(req.user.id))) g.memberIds.push(Number(req.user.id));
    inv.used = true;
    return res.json({ id: g.id, name: g.name });
  }

  try {
    const invRes = await db.query(
      "SELECT id, group_id FROM invitations WHERE token=$1 AND used=false",
      [token]
    );
    if (!invRes.rows[0]) return res.status(404).json({ error: "Ogiltig eller använd inbjudningslänk" });
    const { id: invId, group_id: groupId } = invRes.rows[0];

    await db.query(
      "INSERT INTO group_members (group_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [groupId, req.user.id]
    );
    await db.query("UPDATE invitations SET used=true WHERE id=$1", [invId]);
    const g = await db.query("SELECT id, name FROM groups WHERE id=$1", [groupId]);
    res.json(g.rows[0]);
  } catch (err: any) {
    console.error("Join group error:", err);
    res.status(500).json({ error: "Kunde inte gå med" });
  }
});

// ─── Groups: members ─────────────────────────────────────────────────────────

app.get("/api/groups/:id/members", requireAuth, async (req: any, res) => {
  const groupId = Number(req.params.id);
  if (!db) {
    const g = MOCK_GROUPS.find((x) => x.id === groupId);
    if (!g || !g.memberIds.includes(Number(req.user.id))) {
      return res.status(403).json({ error: "Inte medlem" });
    }
    return res.json(g.memberIds.map((id) => ({ id, email: `user${id}@mock.local`, name: `User ${id}` })));
  }
  try {
    const member = await db.query(
      "SELECT 1 FROM group_members WHERE group_id=$1 AND user_id=$2",
      [groupId, req.user.id]
    );
    if (!member.rows[0]) return res.status(403).json({ error: "Inte medlem" });

    const result = await db.query(
      `SELECT u.id, u.email, u.name FROM users u
       JOIN group_members gm ON gm.user_id = u.id
       WHERE gm.group_id = $1 ORDER BY u.id`,
      [groupId]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Share tokens: create token for setlist/song ─────────────────────────────

app.post("/api/shares", requireAuth, async (req: any, res) => {
  const { resourceType, resourceId } = req.body;
  if (!["song", "setlist"].includes(resourceType)) {
    return res.status(400).json({ error: "resourceType måste vara 'song' eller 'setlist'" });
  }
  const id = Number(resourceId);
  if (!id) return res.status(400).json({ error: "resourceId krävs" });

  const token = randomToken();

  if (!db) {
    MOCK_SHARES.push({ token, resourceType, resourceId: id });
    return res.json({ token, url: `/s/${token}` });
  }

  try {
    await db.query(
      "INSERT INTO shares (token, resource_type, resource_id, created_by) VALUES ($1, $2, $3, $4)",
      [token, resourceType, id, req.user.id]
    );
    res.json({ token, url: `/s/${token}` });
  } catch (err: any) {
    console.error("Share create error:", err);
    res.status(500).json({ error: "Kunde inte skapa delningslänk" });
  }
});

// ─── Share tokens: resolve token → resource (no auth) ────────────────────────

app.get("/api/s/:token", async (req, res) => {
  const token = req.params.token;

  if (!db) {
    const share = MOCK_SHARES.find((s) => s.token === token);
    if (!share) return res.status(404).json({ error: "Delningslänken finns inte" });
    if (share.resourceType === "song") {
      const song = MOCK_SONGS.find((s) => s.id === share.resourceId);
      if (!song) return res.status(404).json({ error: "Låten finns inte längre" });
      return res.json({ type: "song", data: song });
    } else {
      const setlist = MOCK_SETLISTS.find((s) => s.id === share.resourceId);
      if (!setlist) return res.status(404).json({ error: "Spellistan finns inte längre" });
      // setlist.songs already contains denormalized song data (id, title, artist, key, tempo)
      return res.json({ type: "setlist", data: setlist });
    }
  }

  try {
    const shareRes = await db.query(
      "SELECT resource_type, resource_id FROM shares WHERE token=$1",
      [token]
    );
    if (!shareRes.rows[0]) return res.status(404).json({ error: "Delningslänken finns inte" });
    const { resource_type, resource_id } = shareRes.rows[0];

    if (resource_type === "song") {
      const r = await db.query("SELECT * FROM songs WHERE id=$1", [resource_id]);
      if (!r.rows[0]) return res.status(404).json({ error: "Låten finns inte längre" });
      return res.json({ type: "song", data: r.rows[0] });
    } else if (resource_type === "setlist") {
      const sl = await db.query("SELECT * FROM setlists WHERE id=$1", [resource_id]);
      if (!sl.rows[0]) return res.status(404).json({ error: "Spellistan finns inte längre" });
      const songs = await db.query(
        `SELECT s.* FROM songs s
         JOIN setlist_songs ss ON ss.song_id = s.id
         WHERE ss.setlist_id = $1 ORDER BY ss.position`,
        [resource_id]
      );
      return res.json({ type: "setlist", data: { ...sl.rows[0], songs: songs.rows } });
    }
    res.status(404).json({ error: "Okänd resurstyp" });
  } catch (err: any) {
    console.error("Share resolve error:", err);
    res.status(500).json({ error: "Serverfel" });
  }
});

// ─── Serve frontend in production ────────────────────────────────────────────

if (isProd) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const distPath = path.join(__dirname, "../dist");
  console.log("📁 Serving React app from:", distPath);
  app.use(express.static(distPath));
  // Fallback to index.html for SPA routing
  app.get("*", (_req, res) => {
    try {
      res.sendFile(path.join(distPath, "index.html"));
    } catch (err) {
      console.error("Error serving index.html:", err);
      res.status(500).send("Error loading application");
    }
  });
} else {
  console.log("⚠ DEV mode - React app must be served from http://localhost:5173");
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () =>
  console.log(`✓ DAJO Server :${PORT} [${isProd ? "prod" : "dev"}] [${db ? "PostgreSQL" : "mock"}]`)
);

export default app;
