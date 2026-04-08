/**
 * extract-notation.ts
 * Steg 3c: Extrahera noter från notationssystem (leadsheet-format).
 * Optimerad prompt för noter, ackord ovanför system, artikulationer.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Section, Bar, ChordEntry, MelodyNote } from "../../shared/types.js";
import type { TimeSignature, PreferredFormat, NoteDuration, Articulation, Dynamic } from "../../shared/types.js";
import type { MediaType, ImportedSong } from "../ai-import.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const NOTATION_SYSTEM = `Du är expert på att läsa musikalisk notation och leadsheets.
Din uppgift är att extrahera noter, ackord och struktur från notationsdokument.

## UTDATAFORMAT — returnera ALLTID giltig JSON:

{
  "title": "Låttitel",
  "artist": "Artist/Kompositör",
  "key": "C",
  "tempo": 120,
  "timeSignature": "4/4",
  "style": "Jazz",
  "sections": [
    {
      "name": "A",
      "type": "staff",
      "bars": [
        {
          "chords": [{ "symbol": "Cmaj7", "beat": 1 }],
          "lyrics": "",
          "repeat": "none",
          "melodyNotes": [
            {
              "pitch": "E",
              "duration": "q",
              "octave": 4,
              "dotted": false,
              "tied": false,
              "rest": false,
              "articulation": null,
              "dynamic": null
            }
          ]
        }
      ]
    }
  ]
}

## REGLER FÖR MELODINOT (melodyNotes):
- "pitch": "C" | "D" | "E" | "F" | "G" | "A" | "B" + "b" eller "#" för förtecken
  Exempel: "C", "F#", "Bb", "Eb", "G#"
- "duration": notvärde
  - "w" = helnot
  - "h" = halvnot
  - "q" = fjärdedelsnot
  - "8" = åttondelsnot
  - "16" = sextondedelsnot
- "octave": 3, 4, 5 eller 6 (mitten-C = C4)
- "dotted": true om prickad not
- "tied": true om bunden till nästa not
- "rest": true om det är en paus (sätt pitch till "C" och octave till 4)
- "articulation": null | "staccato" | "accent" | "tenuto" | "fermata" | "marcato"
- "dynamic": null | "pp" | "p" | "mp" | "mf" | "f" | "ff"

## REGLER FÖR ACKORD (chords ovanför notlinjen):
- Samma som för iReal: { "symbol": "Cmaj7", "beat": 1 }
- Ackord ovanför notlinjen (leadsheet-style) → extrahera dem
- Om inga ackord finns ovanför → chords: []

## REGLER FÖR SEKTIONER:
- type: "staff" (ALLTID för notationssektioner)
- Namnge sektioner: A, B, C, Intro, Verse, Chorus, Bridge, Coda, Solo
- Om originalet har upprepningstecken → använd repeat-fältet

## REGLER FÖR REPEAT:
- "none" | "start" | "end" | "both"
- Volta-brackets: "ending": 1 | 2 | 3

## REGLER FÖR TONART:
- Dur: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B
- Moll: Cm, Dm, Em, Fm, Gm, Am, Bm (Läs av nyckelns förtecken!)

## REGLER FÖR TAKTART: "4/4" | "3/4" | "6/8" | "2/4" | "5/4" | "7/4" | "12/8"

## PRIORITERINGSORDNING:
1. Melodin (melodyNotes) — extrahera varje not
2. Ackord ovanför systemet
3. Artikulationer och dynamik
4. Upprepningstecken

## KRITISKT VIKTIGT:
- Extrahera VARJE not i ordningsföljd inom varje takt
- Oktavläge är viktigt — mitten-C är oktav 4
- Pauser är viktiga — inkludera dem som "rest": true
- Om dokumentet har flera stämmor → ta melodistämman (överst)
- Om dokumentet har flera låtar → { "songs": [ ...en per låt... ] }
- Returnera BARA JSON — inga förklaringar, ingen markdown`;

const NOTATION_USER_PROMPT = (filename: string, extractedText?: string) => `
Analysera detta notationsdokument ("${filename}") och extrahera alla noter och ackord.

${extractedText ? `Extraherad text:\n${extractedText}\n` : ""}

Fokusera på:
1. Varje not med korrekt tonhöjd, oktavläge och notvärde
2. Pauser
3. Ackord ovanför systemet (leadsheet-style)
4. Upprepningstecken och sektionsgränser
5. Artikulationer och dynamik om de finns

Returnera komplett JSON.`.trim();

export async function extractNotation(
  base64Data: string,
  mediaType: MediaType,
  filename: string,
  extractedText?: string
): Promise<ImportedSong[]> {
  // Notation är komplex — använd Opus för bästa noggrannhet
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: NOTATION_SYSTEM,
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
            text: NOTATION_USER_PROMPT(filename, extractedText),
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Oväntat svar från Claude (Notation)");

  return parseNotationResponse(content.text);
}

function parseNotationResponse(raw: string): ImportedSong[] {
  let json = raw.trim()
    .replace(/^```json\s*/i, "").replace(/```\s*$/i, "")
    .replace(/^```\s*/i, "").replace(/```\s*$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    const match = json.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Kunde inte tolka Notation-svaret som JSON");
    parsed = JSON.parse(match[0]);
  }

  const rawSongs: any[] = parsed.songs ?? [parsed];

  return rawSongs.map((s: any) => ({
    title: s.title || "Okänd låt",
    artist: s.artist || "",
    key: s.key || "C",
    tempo: Number(s.tempo) || 120,
    timeSignature: (s.timeSignature || "4/4") as TimeSignature,
    style: s.style || "Jazz",
    preferredFormat: "notation" as PreferredFormat,
    sections: parseNotationSections(s.sections || []),
  }));
}

const VALID_DURATIONS: NoteDuration[] = ["w", "h", "q", "8", "16"];
const VALID_ARTICULATIONS: Articulation[] = ["staccato", "accent", "tenuto", "fermata", "marcato"];
const VALID_DYNAMICS: Dynamic[] = ["pp", "p", "mp", "mf", "f", "ff"];

function parseNotationSections(rawSections: any[]): Section[] {
  return rawSections.map((sec: any, i: number) => ({
    id: crypto.randomUUID(),
    name: sec.name || `Sektion ${i + 1}`,
    type: "staff" as const,
    bars: parseNotationBars(sec.bars || []),
  }));
}

function parseNotationBars(rawBars: any[]): Bar[] {
  return rawBars.map((bar: any) => ({
    chords: (bar.chords || [])
      .filter((c: any) => c?.symbol)
      .map((c: any) => ({
        symbol: String(c.symbol).trim(),
        beat: (Number(c.beat) || 1) as 1 | 2 | 3 | 4,
      } satisfies ChordEntry)),
    lyrics: bar.lyrics || "",
    repeat: bar.repeat || "none",
    repeatCount: bar.repeatCount ?? undefined,
    ending: bar.ending ?? undefined,
    navigation: bar.navigation ?? undefined,
    melodyNotes: parseMelodyNotes(bar.melodyNotes || []),
  } satisfies Bar));
}

function parseMelodyNotes(rawNotes: any[]): MelodyNote[] {
  return rawNotes
    .filter((n: any) => n?.pitch || n?.rest)
    .map((n: any) => {
      const duration = VALID_DURATIONS.includes(n.duration) ? n.duration as NoteDuration : "q";
      const articulation = VALID_ARTICULATIONS.includes(n.articulation) ? n.articulation as Articulation : undefined;
      const dynamic = VALID_DYNAMICS.includes(n.dynamic) ? n.dynamic as Dynamic : undefined;
      const octave = Math.max(3, Math.min(6, Number(n.octave) || 4));

      return {
        pitch: n.rest ? "C" : String(n.pitch || "C").trim(),
        duration,
        octave,
        dotted: Boolean(n.dotted),
        tied: Boolean(n.tied),
        rest: Boolean(n.rest),
        ...(articulation && { articulation }),
        ...(dynamic && { dynamic }),
      } satisfies MelodyNote;
    });
}
