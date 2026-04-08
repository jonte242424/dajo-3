/**
 * extract-songbook.ts
 * Steg 3b: Extrahera sångtext + ackord (ChordPro/Songbook-format).
 * Optimerad prompt för korrekt ackordpositionering ovanför text.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Section, Bar, ChordEntry } from "../../shared/types.js";
import type { TimeSignature, PreferredFormat } from "../../shared/types.js";
import type { MediaType, ImportedSong } from "../ai-import.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SONGBOOK_SYSTEM = `Du är expert på att läsa låttexter med ackord (ChordPro/Songbook-format).
Din uppgift är att extrahera texten och placeringen av ackorden EXAKT som de framgår av dokumentet.

## UTDATAFORMAT — returnera ALLTID giltig JSON:

{
  "title": "Låttitel",
  "artist": "Artist",
  "key": "C",
  "tempo": 120,
  "timeSignature": "4/4",
  "style": "Pop",
  "capo": null,
  "sections": [
    {
      "name": "Vers 1",
      "type": "bars",
      "bars": [
        {
          "chords": [{ "symbol": "Am", "beat": 1 }],
          "lyrics": "När vi går ge-nom sta-den",
          "repeat": "none"
        }
      ]
    }
  ]
}

## GRUNDREGEL FÖR SONGBOOK-FORMAT:
Varje "bar" i Songbook-formatet = EN RAD text med tillhörande ackord.
- "lyrics" = den fullständiga textraden
- "chords" = ackorden som hör till den raden, med ungefärlig beat-position
- Om en rad saknar ackord → chords: []

## REGLER FÖR ACKORD:
- Standardnotation: Am, G, F, C, Dm, Em7, F#m, Bb, Ebmaj7
- "beat" indikerar ungefärlig position i raden (1=början, 2=kvartsväg, 3=halvväg, 4=trekvart)
- Om ackord sitter ovanför specifikt ord → beat som speglar ordets position
- Kapo-ackord: skriv de klingande ackorden (inte capo-ackorden) SÅVIDA inte originalet explicit visar capo

## REGLER FÖR SEKTIONER:
Namnge efter originalets sektionsnamn:
- Svenska: Intro, Vers 1, Vers 2, Refräng, Bridge, Outro, Pre-refräng, Solo
- Engelska: Intro, Verse 1, Chorus, Bridge, Outro, Pre-Chorus, Solo
- Bevara numrering (Vers 1, Vers 2 etc.) om originalet har det

## CAPO:
- Om dokumentet anger kapo: sätt "capo": <siffra> (t.ex. 2 för capo 2)
- null om inget kapo anges

## REGLER FÖR TONART: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B (dur), Cm, Dm etc. (moll)

## REGLER FÖR TAKTART: "4/4" | "3/4" | "6/8" | "2/4"

## REGLER FÖR STIL: Pop, Rock, Folk, Ballad, Country, Soul, R&B, Gospel, Indie

## KRITISKT VIKTIGT:
- Missa INTE textrader — gå igenom hela dokumentet vers för vers
- Bevara EXAKT radindelning från originalet
- Om dokumentet har flera låtar → { "songs": [ ...en per låt... ] }
- Returnera BARA JSON — inga förklaringar, ingen markdown`;

const SONGBOOK_USER_PROMPT = (filename: string, extractedText?: string) => `
Analysera detta dokument ("${filename}") och extrahera sångtext med ackord.

${extractedText ? `Extraherad text (använd som grund — bilden kan ha fler detaljer):\n${extractedText}\n` : ""}

Fokusera på:
1. Korrekt rad-för-rad-extraktion av texten
2. Ackorden ovanför varje textrad
3. Sektionsindelning (Vers, Refräng, Bridge etc.)
4. Kapo-information om det finns

Returnera komplett JSON.`.trim();

export async function extractSongbook(
  base64Data: string,
  mediaType: MediaType,
  filename: string,
  extractedText?: string
): Promise<ImportedSong[]> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: SONGBOOK_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          mediaType === "application/pdf"
            ? {
                type: "document" as any,
                source: { type: "base64", media_type: mediaType, data: base64Data },
              } as any
            : {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              } as any,
          {
            type: "text",
            text: SONGBOOK_USER_PROMPT(filename, extractedText),
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Oväntat svar från Claude (Songbook)");

  return parseSongbookResponse(content.text);
}

function parseSongbookResponse(raw: string): ImportedSong[] {
  let json = raw.trim()
    .replace(/^```json\s*/i, "").replace(/```\s*$/i, "")
    .replace(/^```\s*/i, "").replace(/```\s*$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    const match = json.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Kunde inte tolka Songbook-svaret som JSON");
    parsed = JSON.parse(match[0]);
  }

  const rawSongs: any[] = parsed.songs ?? [parsed];

  return rawSongs.map((s: any) => ({
    title: s.title || "Okänd låt",
    artist: s.artist || "",
    key: s.key || "C",
    tempo: Number(s.tempo) || 120,
    timeSignature: (s.timeSignature || "4/4") as TimeSignature,
    style: s.style || "Pop",
    preferredFormat: "songbook" as PreferredFormat,
    capo: s.capo ?? undefined,
    sections: parseSongbookSections(s.sections || []),
  }));
}

function parseSongbookSections(rawSections: any[]): Section[] {
  return rawSections.map((sec: any, i: number) => ({
    id: crypto.randomUUID(),
    name: sec.name || `Sektion ${i + 1}`,
    type: "bars" as const,
    bars: parseSongbookBars(sec.bars || []),
  }));
}

function parseSongbookBars(rawBars: any[]): Bar[] {
  return rawBars.map((bar: any) => ({
    chords: (bar.chords || [])
      .filter((c: any) => c?.symbol)
      .map((c: any) => ({
        symbol: String(c.symbol).trim(),
        beat: (Number(c.beat) || 1) as 1 | 2 | 3 | 4,
      } satisfies ChordEntry)),
    lyrics: bar.lyrics || "",
    repeat: bar.repeat || "none",
  } satisfies Bar));
}
