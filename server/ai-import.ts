/**
 * DAJO AI Import Pipeline
 * Uses Claude (Anthropic) to analyze PDFs, images, and sheet music
 * and convert them to DAJO's Section → Bar → ChordEntry format.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Section, Bar, ChordEntry, TimeSignature } from "../shared/types.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── Font normalization (common PDF music fonts → standard ASCII) ─────────────

function normalizeMusicFonts(text: string): string {
  return text
    .replace(/Œ„Š/g, "maj")   // DŒ„Š7 → Dmaj7
    .replace(/©(?![\s,])/g, "#")  // F© → F# (but not standalone ©)
    .replace(/‹/g, "m")        // C‹ → Cm
    .replace(/©‹/g, "#m")      // G©‹ → G#m
    .replace(/°7/g, "dim7")    // C°7 → Cdim7
    .replace(/°/g, "dim")      // C° → Cdim
    .replace(/ø/g, "m7b5")     // Cø → Cm7b5
    .replace(/∆/g, "maj7")     // C∆ → Cmaj7
    .replace(/Δ/g, "maj7")     // CΔ → Cmaj7
    .replace(/♭/g, "b")
    .replace(/♯/g, "#");
}

// ─── The system prompt — the brain of the import ─────────────────────────────

const SYSTEM_PROMPT = `Du är en expert på musiknotation och kompskisser. Din uppgift är att analysera noter, lead sheets, ackordscheman och kompskisser och konvertera dem till ett strukturerat JSON-format.

## UTDATAFORMAT (returnera ALLTID giltig JSON, inget annat):

\`\`\`json
{
  "songs": [
    {
      "title": "Låttitel",
      "artist": "Artist/Kompositör",
      "key": "C",
      "tempo": 120,
      "timeSignature": "4/4",
      "style": "Jazz",
      "preferredFormat": "ireal",
      "sections": [
        {
          "name": "A",
          "type": "bars",
          "bars": [
            {
              "chords": [
                { "symbol": "Cmaj7", "beat": 1 },
                { "symbol": "Am7", "beat": 3 }
              ],
              "lyrics": "",
              "repeat": "none"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

## REGLER:

### Ackord:
- Använd standardnotation: Cmaj7, Am7, D7, F#m7b5, Bb7, Ebmaj7
- "beat" är 1, 2, 3 eller 4 — var i takten ackordet spelas
- Om ett ackord varar hela takten: beat 1
- Om två ackord per takt (vanligt i jazz): beat 1 och beat 3
- Slash-ackord: "C/E" (C-ackord med E i basen)

### Sektioner:
- Namnge sektioner korrekt: "Intro", "A", "B", "C", "Vers", "Refräng", "Bridge", "Outro", "Coda", "Solo"
- Om originalet har bokstavsbeteckningar (A, B, C): behåll dem
- Om originalet har svenska/engelska sektionsnamn: behåll dem

### Repeat-tecken:
- "none" = ingen repeat
- "start" = repeatbörjan (‖:)
- "end" = repeatslut (:‖)
- "both" = både start och slut (‖:‖)

### Tonart (key):
- Durtonarter: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B
- Molltonarter: Cm, Dm, Em, Fm, Gm, Am, Bm, Dbm, Ebm, F#m, G#m, Bbm
- Avgör tonart från nyckelns förtecken och ackordens karaktär

### Taktart (timeSignature): "4/4", "3/4", "6/8", "2/4", "5/4"

### Stil (style): "Jazz", "Bossa Nova", "Pop", "Rock", "Blues", "Ballad", "Funk", "Latin", "Swing", "Folk"

### preferredFormat:
- "ireal" om det är ett ackordschema (kompskiss)
- "songbook" om det är text + ackord (låttext med ackord ovanför)
- "notation" om det är noter

### VIKTIGT:
- Om dokumentet innehåller FLERA låtar: returnera dem alla i songs-arrayen
- Missa INGA takter — analysera hela dokumentet
- Om texten är otydlig: gör ditt bästa och förklara ingenting — returnera bara JSON
- Tomma takter: { "chords": [], "lyrics": "", "repeat": "none" }
- Returera BARA JSON — inga förklaringar, ingen markdown runtomkring`;

// ─── Parse Claude's response → Section[] ─────────────────────────────────────

interface ImportedSong {
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature: TimeSignature;
  style: string;
  preferredFormat: "ireal" | "songbook" | "notation";
  sections: Section[];
}

function parseClaudeResponse(content: string): ImportedSong[] {
  // Strip markdown code blocks if present
  let json = content.trim();
  json = json.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  json = json.replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    // Try to extract JSON from the response
    const match = json.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error("Kunde inte tolka AI-svaret som JSON");
  }

  const songs: ImportedSong[] = parsed.songs ?? [parsed];

  return songs.map((song: any) => ({
    title: song.title || "Okänd låt",
    artist: song.artist || "",
    key: song.key || "C",
    tempo: Number(song.tempo) || 120,
    timeSignature: (song.timeSignature || "4/4") as TimeSignature,
    style: song.style || "",
    preferredFormat: song.preferredFormat || "ireal",
    sections: (song.sections || []).map((sec: any, si: number) => ({
      id: crypto.randomUUID(),
      name: sec.name || `Sektion ${si + 1}`,
      type: sec.type || "bars",
      noteText: sec.noteText,
      bars: (sec.bars || []).map((bar: any) => ({
        chords: (bar.chords || [])
          .filter((c: any) => c?.symbol)
          .map((c: any) => ({
            symbol: String(c.symbol).trim(),
            beat: Number(c.beat) || 1,
          } as ChordEntry)),
        lyrics: bar.lyrics || "",
        repeat: bar.repeat || "none",
        repeatCount: bar.repeatCount,
        ending: bar.ending,
        navigation: bar.navigation,
      } as Bar)),
    })),
  }));
}

// ─── Main analysis function ───────────────────────────────────────────────────

export type MediaType = "application/pdf" | "image/jpeg" | "image/png" | "image/gif" | "image/webp";

interface AnalyzeResult {
  songs: ImportedSong[];
  tokensUsed: number;
  model: string;
}

export async function analyzeFile(
  base64Data: string,
  mediaType: MediaType,
  filename: string
): Promise<AnalyzeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY saknas — lägg till den i .env.local");
  }

  // First pass: primary analysis
  const primaryResponse = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document" as any,
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Data,
            },
          } as any,
          {
            type: "text",
            text: `Analysera denna fil ("${filename}") och returnera ALLA låtar som JSON enligt systemprompten. Missa inga takter eller sektioner.`,
          },
        ],
      },
    ],
  });

  const primaryContent = primaryResponse.content[0];
  if (primaryContent.type !== "text") throw new Error("Oväntat svar från Claude");

  let primaryText = normalizeMusicFonts(primaryContent.text);
  const primarySongs = parseClaudeResponse(primaryText);
  const primaryBars = primarySongs.reduce((sum, s) =>
    sum + s.sections.reduce((ss, sec) => ss + sec.bars.length, 0), 0);

  // Completeness check: if result looks thin, run a verification pass
  const totalInputTokens = primaryResponse.usage?.input_tokens || 0;
  const completionTokens = primaryResponse.usage?.output_tokens || 0;
  const needsVerification = completionTokens < 2000 || primaryBars < 4;

  if (needsVerification && primaryBars > 0) {
    try {
      const verifyResponse = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document" as any,
                source: { type: "base64", media_type: mediaType, data: base64Data },
              } as any,
              {
                type: "text",
                text: `Verifiera och komplettera denna analys. Kontrollera specifikt:
1. Missade repeat-tecken (‖: :‖)?
2. Missade volta-brackets (1. 2. 3.)?
3. Sektionsvariationer (samma sektionsnamn men olika ackord)?
4. Navigationsmarkeringar (D.S., D.C., Coda, Fine)?

Nuvarande analys:
${primaryText}

Returnera den kompletta, korrigerade versionen som JSON.`,
              },
            ],
          },
        ],
      });

      const verifyContent = verifyResponse.content[0];
      if (verifyContent.type === "text") {
        const verifiedText = normalizeMusicFonts(verifyContent.text);
        const verifiedSongs = parseClaudeResponse(verifiedText);
        const verifiedBars = verifiedSongs.reduce((sum, s) =>
          sum + s.sections.reduce((ss, sec) => ss + sec.bars.length, 0), 0);

        // Keep the better result (more bars = more complete)
        if (verifiedBars >= primaryBars) {
          return {
            songs: verifiedSongs,
            tokensUsed: totalInputTokens + completionTokens + (verifyResponse.usage?.output_tokens || 0),
            model: "claude-opus-4-6 + claude-sonnet-4-6 (verifierad)",
          };
        }
      }
    } catch {
      // Verification failed — use primary result
    }
  }

  return {
    songs: primarySongs,
    tokensUsed: totalInputTokens + completionTokens,
    model: "claude-opus-4-6",
  };
}

export type { ImportedSong };
