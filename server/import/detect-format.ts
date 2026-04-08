/**
 * detect-format.ts
 * Steg 1: Snabb textbaserad föranalys — ingen AI, ingen kostnad.
 * Returnerar ett format-förslag + confidence baserat på textinnehåll.
 */

import type { PreferredFormat } from "../../shared/types.js";

export interface DetectionResult {
  format: PreferredFormat | null; // null = kan ej avgöra, skicka till AI
  confidence: number;             // 0–1
  signals: string[];              // Vad som triggade beslutet (för debugging)
}

// ─── ChordPro-markörer ────────────────────────────────────────────────────────

const CHORDPRO_DIRECTIVES = [
  /^\{title:/im, /^\{t:/im,
  /^\{subtitle:/im, /^\{st:/im,
  /^\{artist:/im,
  /^\{key:/im,
  /^\{capo:/im,
  /^\{tempo:/im,
  /^\{comment:/im, /^\{c:/im,
  /^\{start_of_verse/im, /^\{sov/im,
  /^\{start_of_chorus/im, /^\{soc/im,
  /^\{define:/im,
];

// Ackord i hakparenteser ovanför text: [Am7] [G] [F#m]
const BRACKET_CHORD_PATTERN = /\[[A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?(?:\d+)?(?:[#b]\d+)?(?:\/[A-G][#b]?)?\]/g;

// ChordPro-sektionsmarkörer
const SECTION_HEADERS = /^\[(Verse|Chorus|Bridge|Intro|Outro|Pre-Chorus|Refräng|Vers|Solo|Tag)\s*\d*\]/im;

// ─── iReal-signaler ───────────────────────────────────────────────────────────

// Typiska iReal-rubriker och navigationsmarkörer
const IREAL_NAVIGATION = /\b(D\.S\.|D\.C\.|al Coda|al Fine|Fine|Coda|Segno|∮|𝄋)\b/i;
const IREAL_REPEAT = /‖:|:‖|%|𝄎|𝄏/;
const IREAL_SECTION_LETTERS = /^[A-Z]\s*$/m; // Ensamstående bokstäver som sektionsnamn

// Ackordrad utan löptext (bara ackord separerade av mellanslag)
const CHORD_ONLY_LINE = /^([A-G][#b]?(?:m|maj|min|dim|aug|sus|add|M)?(?:\d+)?(?:[#b]\d+)?(?:\/[A-G][#b]?)?\s+){2,}$/m;

// ─── Notations-signaler ───────────────────────────────────────────────────────

// Notations-tecken i PDF-text
const NOTATION_CHARS = /[𝄞𝄢𝄡𝄠𝄟𝄝𝄜𝄛𝄚𝄙𝄘♩♪♫♬𝅝𝅗𝅥𝅘𝅥𝅮𝅘𝅥𝅯]/;
const CLEF_WORDS = /\b(treble|bass|alto|tenor|clef|klav|notlin|staff|stave|ledger|nyckel)\b/i;
const MUSIC_NOTATION_TERMS = /\b(pizz\.|arco|legato|staccato|fermata|rit\.|ritard|accel\.|cresc\.|decresc\.|dim\.|mf|pp|ff|mp|sfz)\b/i;

// ─── Huvud-detektionsfunktion ─────────────────────────────────────────────────

export function detectFormat(
  extractedText: string,
  filename: string
): DetectionResult {
  const signals: string[] = [];
  const scores: Record<PreferredFormat, number> = {
    ireal: 0,
    songbook: 0,
    notation: 0,
  };

  const text = extractedText || "";
  const ext = filename.split(".").pop()?.toLowerCase() || "";

  // ── Filändelse (högst confidence) ──────────────────────────────────────────

  if (["pro", "cho", "chopro", "chordpro"].includes(ext)) {
    signals.push("Filändelse .pro/.cho → ChordPro");
    return { format: "songbook", confidence: 0.99, signals };
  }

  if (ext === "mxl" || ext === "xml" || ext === "musicxml" || ext === "mid" || ext === "midi") {
    signals.push(`Filändelse .${ext} → Notation`);
    return { format: "notation", confidence: 0.99, signals };
  }

  // ── ChordPro-direktiv (mycket stark signal) ────────────────────────────────

  const directiveMatches = CHORDPRO_DIRECTIVES.filter((re) => re.test(text));
  if (directiveMatches.length >= 2) {
    signals.push(`${directiveMatches.length} ChordPro-direktiv hittade`);
    scores.songbook += 0.8;
  } else if (directiveMatches.length === 1) {
    signals.push("1 ChordPro-direktiv hittat");
    scores.songbook += 0.4;
  }

  // ── Ackord i hakparenteser [Am7] ──────────────────────────────────────────

  const bracketChords = text.match(BRACKET_CHORD_PATTERN) || [];
  if (bracketChords.length >= 4) {
    signals.push(`${bracketChords.length} ackord i [hakparenteser] → Songbook`);
    scores.songbook += Math.min(bracketChords.length * 0.05, 0.6);
  }

  // ── Sektionsrubriker [Verse] [Chorus] ─────────────────────────────────────

  if (SECTION_HEADERS.test(text)) {
    signals.push("Sektionsrubriker [Verse]/[Chorus] → Songbook");
    scores.songbook += 0.3;
  }

  // ── Löptext (indikerar att det finns sångtext) ────────────────────────────

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const longLines = lines.filter((l) => l.trim().length > 30);
  if (longLines.length > 3) {
    signals.push(`${longLines.length} långa textrader → sannolikt sångtext`);
    scores.songbook += 0.2;
  }

  // ── iReal-navigationsmarkörer ─────────────────────────────────────────────

  if (IREAL_NAVIGATION.test(text)) {
    signals.push("Navigationsmarkörer (D.S., Coda, Fine) → iReal");
    scores.ireal += 0.4;
  }

  if (IREAL_REPEAT.test(text)) {
    signals.push("Repeat-tecken → iReal");
    scores.ireal += 0.3;
  }

  if (IREAL_SECTION_LETTERS.test(text)) {
    signals.push("Ensamstående sektionsbokstäver (A, B, C) → iReal");
    scores.ireal += 0.2;
  }

  if (CHORD_ONLY_LINE.test(text)) {
    signals.push("Rader med enbart ackord → iReal");
    scores.ireal += 0.3;
  }

  // ── Notations-tecken ──────────────────────────────────────────────────────

  if (NOTATION_CHARS.test(text)) {
    signals.push("Musiksymboler (𝄞♩♪) → Notation");
    scores.notation += 0.7;
  }

  if (CLEF_WORDS.test(text)) {
    signals.push("Ord som 'klav', 'notlin', 'staff' → Notation");
    scores.notation += 0.4;
  }

  if (MUSIC_NOTATION_TERMS.test(text)) {
    signals.push("Notationstermer (pizz., fermata, cresc.) → Notation");
    scores.notation += 0.3;
  }

  // ── Bestäm vinnare ────────────────────────────────────────────────────────

  const best = (Object.entries(scores) as [PreferredFormat, number][])
    .sort(([, a], [, b]) => b - a)[0];

  const [format, score] = best;

  // Om ingen signal är tillräckligt stark → skicka till AI-klassificering
  if (score < 0.3) {
    signals.push("För svaga signaler — skickar till AI-klassificering");
    return { format: null, confidence: score, signals };
  }

  return { format, confidence: Math.min(score, 0.95), signals };
}
