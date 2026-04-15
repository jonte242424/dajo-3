/**
 * classify-format.ts
 * Steg 2: Claude Sonnet vision-klassificering.
 * Körs bara om detect-format.ts inte kunde avgöra formatet.
 * Billig, snabb call — returnerar BARA ett format, inte extraherat innehåll.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { PreferredFormat } from "../../shared/types.js";
import type { MediaType } from "../ai-import.js";

let _anthropic: Anthropic | null = null;
function getClient() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _anthropic;
}

export interface ClassificationResult {
  format: PreferredFormat;
  confidence: number; // 0–1
  reasoning: string;  // Claude's reasoning (kort)
}

const CLASSIFY_PROMPT = `Titta på strukturen i detta dokument. Välj EXAKT ETT av dessa tre format:

**(A) iReal** — ackordschema/kompskiss:
- Ackord organiserade i ett rutnät av takter
- Ingen löpande sångtext
- Kan ha sektionsbeteckningar (A, B, C eller Intro/Vers/Refräng)
- Kan vara handskriven ELLER tryckt
- Repeat-tecken, volta-brackets, navigationsmarkörer

**(B) Songbook / ChordPro** — text + ackord:
- Sångtext i rader
- Ackord placerade ovanför specifika ord/stavelser
- Kan vara handskriven ELLER tryckt
- Kapo-information vanligt

**(C) Notation** — noter på notlinjer:
- 5 parallella notlinjer (staff/stave)
- Nothuvar på linjerna
- Kan ha ackordnamn ovanför systemet (leadsheet)

Svara med EXAKT detta JSON-format:
{
  "format": "ireal" | "songbook" | "notation",
  "confidence": 0.0–1.0,
  "reasoning": "1-2 meningar på svenska om vad du ser"
}

Returnera BARA JSON, inget annat.`;

export async function classifyFormat(
  base64Data: string,
  mediaType: MediaType,
  extractedText?: string
): Promise<ClassificationResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY saknas");
  }

  const fileBlock: any = mediaType === "application/pdf"
    ? {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: base64Data },
      }
    : {
        type: "image",
        source: { type: "base64", media_type: mediaType, data: base64Data },
      };

  const content: Anthropic.MessageParam["content"] = [fileBlock];

  // Om vi har extraherad text — ge den som extra kontext
  if (extractedText && extractedText.trim().length > 10) {
    content.push({
      type: "text",
      text: `Extraherad text från dokumentet (som extra kontext):\n${extractedText.slice(0, 500)}`,
    });
  }

  content.push({
    type: "text",
    text: CLASSIFY_PROMPT,
  });

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content }],
  });

  const text = response.content[0];
  if (text.type !== "text") {
    throw new Error("Oväntat svar från Claude vid klassificering");
  }

  // Rensa eventuell markdown
  let json = text.text.trim();
  json = json.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  json = json.replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(json);
  } catch {
    const match = json.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
    else throw new Error(`Kunde inte tolka klassificeringssvaret: ${json}`);
  }

  const format = parsed.format as PreferredFormat;
  if (!["ireal", "songbook", "notation"].includes(format)) {
    throw new Error(`Ogiltigt format från klassificering: ${format}`);
  }

  return {
    format,
    confidence: Number(parsed.confidence) || 0.7,
    reasoning: parsed.reasoning || "",
  };
}
