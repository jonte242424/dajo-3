/**
 * extract-ireal.ts
 * Steg 3a: Extrahera ackordschema (iReal-format).
 * Optimerad prompt för rutnät, repeat-tecken, volta, navigation.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Section, Bar, ChordEntry } from "../../shared/types.js";
import type { TimeSignature, PreferredFormat } from "../../shared/types.js";
import type { MediaType, ImportedSong } from "../ai-import.js";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const IREAL_SYSTEM = `Du är expert på att läsa ackordscheman och kompskisser (iReal Pro-format).
Din uppgift är att extrahera ALLA takter och ackord exakt som de står.

## UTDATAFORMAT — returnera ALLTID giltig JSON:

{
  "title": "Låttitel",
  "artist": "Artist",
  "key": "C",
  "tempo": 120,
  "timeSignature": "4/4",
  "style": "Jazz",
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
          "repeat": "none",
          "repeatCount": null,
          "ending": null,
          "navigation": null
        }
      ]
    }
  ]
}

## REGLER FÖR ACKORD:
- Standardnotation: Cmaj7, Am7, D7, Bb7, F#m7b5, Ebmaj7, G7sus4
- "beat" = var i takten (1, 2, 3, 4). Om ett ackord varar hela takten → beat 1
- Vanligast i jazz: två ackord per takt → beat 1 och beat 3
- Slash-bas: "C/E", "G/B"
- Tomma takter: { "chords": [], "lyrics": "", "repeat": "none" }
- Procenttakt (%) = samma ackord som föregående takt → kopiera ackordet

## REGLER FÖR SEKTIONER:
- Bevara originalets sektionsnamn: A, B, C, Intro, Verse, Chorus, Bridge, Outro, Coda, Solo
- Varje sektion är ett eget objekt i sections-arrayen
- Om samma sektionsbokstav upprepas med OLIKA ackord → skapa separata sektioner (A, A2 eller A, A (da capo))

## REGLER FÖR REPEAT OCH NAVIGATION:
- "repeat": "none" | "start" | "end" | "both"
  - "start" = ‖: (repeatstart på denna takt)
  - "end"   = :‖ (repeatslut på denna takt)
  - "both"  = ‖:‖ (start OCH slut, vanlig i korta loopar)
- "repeatCount": antal ggr att spela (t.ex. 4 = spela 4 ggr). null om ej angivet
- "ending": volta-nummer (1, 2, 3). null om ej angivet
- "navigation": "D.S. al Coda" | "D.C. al Fine" | "Fine" | "Coda" | "Segno" | null

## REGLER FÖR TONART:
- Dur: C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B
- Moll: Cm, Dm, Em, Fm, Gm, Am, Bm (+ altererade: F#m, G#m, Bbm etc.)

## REGLER FÖR TAKTART: "4/4" | "3/4" | "6/8" | "2/4" | "5/4" | "7/4" | "12/8"

## REGLER FÖR STIL: Jazz, Bossa Nova, Swing, Blues, Funk, Latin, Pop, Rock, Ballad, Folk

## KRITISKT VIKTIGT:
- Missa INGA takter — räkna igenom hela dokumentet rad för rad
- Om dokumentet har flera låtar → returnera { "songs": [ ...en per låt... ] }
- Returnera BARA JSON — inga förklaringar, ingen markdown`;

const IREAL_USER_PROMPT = (filename: string, extractedText?: string) => `
Analysera detta ackordschema ("${filename}") och extrahera ALLA takter exakt.

${extractedText ? `Extraherad text från dokumentet:\n${extractedText}\n` : ""}

Fokusera på:
1. Varje enskild takt och dess ackord
2. Repeat-tecken och volta-brackets
3. Sektionsgränser
4. Navigationsmarkörer (D.S., Coda, Fine)

Returnera komplett JSON.`.trim();

export async function extractIReal(
  base64Data: string,
  mediaType: MediaType,
  filename: string,
  extractedText?: string
): Promise<ImportedSong[]> {
  // If substantial extracted text is available (e.g., from ChordPro files),
  // use text-only mode
  if (extractedText && extractedText.length > 100) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: IREAL_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: IREAL_USER_PROMPT(filename, extractedText),
            },
          ],
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") throw new Error("Oväntat svar från Claude (iReal)");
    return parseIRealResponse(content.text);
  }

  // Otherwise, use document/image mode
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: IREAL_SYSTEM,
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
            text: IREAL_USER_PROMPT(filename, extractedText),
          },
        ],
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") throw new Error("Oväntat svar från Claude (iReal)");

  return parseIRealResponse(content.text);
}

function parseIRealResponse(raw: string): ImportedSong[] {
  let json = raw.trim()
    .replace(/^```json\s*/i, "").replace(/```\s*$/i, "")
    .replace(/^```\s*/i, "").replace(/```\s*$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    const match = json.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Kunde inte tolka iReal-svaret som JSON");
    parsed = JSON.parse(match[0]);
  }

  // Stöd för både { songs: [] } och ett enstaka låt-objekt
  const rawSongs: any[] = parsed.songs ?? [parsed];

  return rawSongs.map((s: any) => ({
    title: s.title || "Okänd låt",
    artist: s.artist || "",
    key: s.key || "C",
    tempo: Number(s.tempo) || 120,
    timeSignature: (s.timeSignature || "4/4") as TimeSignature,
    style: s.style || "Jazz",
    preferredFormat: "ireal" as PreferredFormat,
    sections: parseSections(s.sections || []),
  }));
}

function parseSections(rawSections: any[]): Section[] {
  return rawSections.map((sec: any, i: number) => ({
    id: crypto.randomUUID(),
    name: sec.name || `Sektion ${i + 1}`,
    type: "bars" as const,
    bars: parseBars(sec.bars || []),
  }));
}

function parseBars(rawBars: any[]): Bar[] {
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
  } satisfies Bar));
}
