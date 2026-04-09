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
import type { Section } from "../shared/types.js";

dotenv.config({ path: ".env.local" });

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
runMigrations().catch(err => console.error("Unexpected migration error:", err));

const app = express();
// Railway defaults to 8080 if PORT not set, so we need to be explicit
const PORT = parseInt(process.env.PORT || "3001", 10);
const isProd = process.env.NODE_ENV === "production";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-prod";

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

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`📝 Login request: ${JSON.stringify({ email, hasPassword: !!password })}`);

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return res.status(400).json({ error: "Email och lösenord krävs" });
    }

    console.log(`✅ Login attempt: ${email}`);
    console.log(`🔑 JWT_SECRET exists: ${!!JWT_SECRET}, length: ${JWT_SECRET?.length || 0}`);

    // Demo mode - accept any credentials and return JWT
    const payload = { id: 1, email };
    console.log(`📦 Creating token with payload:`, payload);

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
    console.log(`✅ Token created successfully`);

    return res.json({
      token,
      user: { id: 1, email, name: "Demo User" }
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : "";
    console.error("❌ Login error - Message:", errorMsg);
    console.error("❌ Login error - Stack:", errorStack);
    console.error("❌ Full error object:", err);
    return res.status(500).json({ error: "Serverfel" });
  }
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
  res.json({ user: req.user });
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
  const { base64, mediaType, filename } = req.body;

  if (!base64 || !mediaType || !filename) {
    return res.status(400).json({ error: "base64, mediaType och filename krävs" });
  }

  const allowed: MediaType[] = [
    "application/pdf",
    "image/jpeg", "image/png", "image/gif", "image/webp",
    "audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4",
  ];
  if (!allowed.includes(mediaType)) {
    return res.status(400).json({ error: `Filtypen stöds inte: ${mediaType}` });
  }

  // Rough size check (~100MB base64 limit)
  if (base64.length > 130_000_000) {
    return res.status(400).json({ error: "Filen är för stor (max ~100MB)" });
  }

  try {
    const result = await analyzeFile(base64, mediaType, filename);
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

  const saved = [];
  for (const song of songs.slice(0, 20)) { // max 20 songs per import
    if (!db) {
      const s = { id: Date.now() + Math.random(), userId: String(req.user.id), ...song, isPublic: false, createdAt: new Date().toISOString() };
      MOCK_SONGS.push(s as any);
      saved.push(s);
      continue;
    }
    try {
      const result = await db.query(
        `INSERT INTO songs (user_id, title, artist, key, tempo, time_signature, style,
                            sections, notes, preferred_format)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, title`,
        [req.user.id, song.title, song.artist || "", song.key || "C",
         song.tempo || 120, song.timeSignature || "4/4", song.style || "",
         JSON.stringify(song.sections || []), song.notes || "",
         song.preferredFormat || "ireal"]
      );
      saved.push(result.rows[0]);
    } catch (err) {
      console.error("Save song error:", err);
    }
  }

  res.status(201).json({ saved });
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
