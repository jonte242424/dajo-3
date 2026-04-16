/**
 * DAJO AI Import Pipeline
 *
 * Steg 1: detect-format.ts   — Snabb textbaserad föranalys (gratis)
 * Steg 2: classify-format.ts — Claude Sonnet vision-klassificering (billig)
 * Steg 3: extract-*.ts       — Format-specifik extraktion (optimerad prompt)
 */

import type { Section, TimeSignature, ChordEntry } from "../shared/types.js";
import type { PreferredFormat } from "../shared/types.js";
import { detectFormat } from "./import/detect-format.js";
import { classifyFormat } from "./import/classify-format.js";
import { extractIReal } from "./import/extract-ireal.js";
import { extractSongbook } from "./import/extract-songbook.js";
import { extractNotation } from "./import/extract-notation.js";

export type MediaType =
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/gif"
  | "image/webp"
  | "audio/mpeg"
  | "audio/wav"
  | "audio/ogg"
  | "audio/mp4"
  | "text/plain"
  | "text/x-chordpro"
  | "application/x-chordpro";

export interface ImportedSong {
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature: TimeSignature;
  style: string;
  preferredFormat: PreferredFormat;
  capo?: number;
  sections: Section[];
}

export interface AnalyzeResult {
  songs: ImportedSong[];
  tokensUsed: number;
  model: string;
  detectedFormat: PreferredFormat;
  detectionConfidence: number;
  detectionSignals: string[];
}

// ─── Font normalization ───────────────────────────────────────────────────────

export function normalizeMusicFonts(text: string): string {
  return text
    .replace(/Œ„Š/g, "maj")
    .replace(/©(?![\s,])/g, "#")
    .replace(/‹/g, "m")
    .replace(/©‹/g, "#m")
    .replace(/°7/g, "dim7")
    .replace(/°/g, "dim")
    .replace(/ø/g, "m7b5")
    .replace(/∆/g, "maj7")
    .replace(/Δ/g, "maj7")
    .replace(/♭/g, "b")
    .replace(/♯/g, "#");
}

// ─── Audio file handler with ChordMiniApp integration ────────────────────────

const FLASK_API_URL = process.env.FLASK_API_URL || "http://localhost:5002";

// Talar om för klienten om ljudimport är reellt tillgängligt. I produktion
// på Render kör vi bara Node-backenden — Flask-tjänsten (ChordMiniApp)
// ligger lokalt på dev-maskinen. Då ska vi inte visa ljudknappen för
// användaren utan att ha något fungerande att göra med uppladdningen.
export function isAudioImportAvailable(): boolean {
  // Om AUDIO_IMPORT_ENABLED är uttryckligen satt till "true" litar vi på
  // den (öppen dörr om man kör Flask på samma host). Annars kräver vi en
  // FLASK_API_URL som pekar på något annat än localhost.
  if (process.env.AUDIO_IMPORT_ENABLED === "true") return true;
  if (process.env.AUDIO_IMPORT_ENABLED === "false") return false;
  const url = process.env.FLASK_API_URL;
  if (!url) return false;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(url)) return false;
  return true;
}

interface ChordSegment {
  chord: string;
  start_time: number;
  end_time: number;
  beat_index: number;
}

interface ChordDetectionResponse {
  success: boolean;
  progression: ChordSegment[];
  key: string;
  mode: "major" | "minor";
  tempo: number;
  duration: number;
  beat_count: number;
  chord_count: number;
  metadata: Record<string, unknown>;
  attribution: Record<string, string>;
}

interface LyricsWord {
  start: number;
  end: number;
  text: string;
}

interface LyricsSegment {
  start: number;
  end: number;
  text: string;
  words: LyricsWord[];
}

interface LyricsResponse {
  success: boolean;
  segments: LyricsSegment[];
  language: string;
  language_probability: number;
  duration: number;
  segment_count: number;
  word_count: number;
  method: string;
  attribution: Record<string, string>;
}

async function transcribeLyrics(
  audioBuffer: Buffer,
  filename: string,
  language = "sv"
): Promise<LyricsResponse | null> {
  try {
    const t0 = Date.now();
    console.log(`[Import] Calling lyrics transcription for ${filename} (lang=${language})...`);
    const res = await fetch(
      `${FLASK_API_URL}/transcribe_lyrics?language=${encodeURIComponent(language)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Filename": filename,
        },
        body: audioBuffer,
      }
    );
    if (res.status === 501) {
      console.log("[Import] Lyrics transcription not available on server — skipping");
      return null;
    }
    if (!res.ok) {
      console.warn(`[Import] Lyrics transcription failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = (await res.json()) as LyricsResponse;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[Import] Lyrics complete in ${elapsed}s: ${data.segment_count} segments, ${data.word_count} words (${data.language} ${(data.language_probability * 100).toFixed(0)}%)`
    );
    return data;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Import] Lyrics transcription error: ${msg} — continuing without lyrics`);
    return null;
  }
}

/**
 * Build bars from a time-based chord progression.
 *
 * Each bar represents (beats_per_bar) beats. We walk the progression and for each bar
 * collect the chords whose time range overlaps with the bar's time range. Up to 2 chords
 * per bar (beats 1 and 3 in 4/4).
 *
 * If `lyrics` is provided, words whose start time falls in a bar's range are concatenated
 * into that bar's `lyrics` field (space-separated).
 */
function buildBarsFromProgression(
  progression: ChordSegment[],
  tempo: number,
  beatsPerBar: number,
  duration: number,
  lyrics?: LyricsSegment[] | null
): { chords: ChordEntry[]; lyrics: string }[] {
  if (progression.length === 0) return [];

  const secondsPerBeat = 60.0 / tempo;
  const secondsPerBar = secondsPerBeat * beatsPerBar;
  const barCount = Math.max(1, Math.ceil(duration / secondsPerBar));

  // Flatten all words with their timestamps (fallback to segment text if no words)
  const allWords: { start: number; text: string }[] = [];
  if (lyrics && lyrics.length > 0) {
    for (const seg of lyrics) {
      if (seg.words && seg.words.length > 0) {
        for (const w of seg.words) {
          if (w.text) allWords.push({ start: w.start, text: w.text });
        }
      } else if (seg.text) {
        // Segment has no word-level timestamps — distribute text across segment range
        allWords.push({ start: seg.start, text: seg.text });
      }
    }
  }

  const bars: { chords: ChordEntry[]; lyrics: string }[] = [];

  for (let b = 0; b < barCount; b++) {
    const barStart = b * secondsPerBar;
    const barEnd = barStart + secondsPerBar;
    const halfPoint = barStart + secondsPerBar / 2;

    // Find chord active at bar start and at half point
    const chordAt = (t: number): string | null => {
      for (const seg of progression) {
        if (t >= seg.start_time && t < seg.end_time && seg.chord !== "N") {
          return seg.chord;
        }
      }
      return null;
    };

    const firstChord = chordAt(barStart + 0.01);
    const secondChord = chordAt(halfPoint);

    const chords: ChordEntry[] = [];
    if (firstChord) chords.push({ symbol: firstChord, beat: 1 });
    if (secondChord && secondChord !== firstChord) {
      // For 4/4 this yields beat 3; cast because beat type is 1|2|3|4
      const midBeat = (Math.ceil(beatsPerBar / 2) + 1) as 1 | 2 | 3 | 4;
      chords.push({ symbol: secondChord, beat: midBeat });
    }

    // Collect words whose start falls in this bar
    const barWords = allWords
      .filter((w) => w.start >= barStart && w.start < barEnd)
      .map((w) => w.text);
    const barLyrics = barWords.join(" ").replace(/\s+/g, " ").trim();

    bars.push({ chords, lyrics: barLyrics });
  }

  return bars;
}

/**
 * Split bars into sections by detecting long runs of identical chord patterns.
 * For MVP: group into 8-bar sections.
 */
function splitIntoSections(
  bars: { chords: ChordEntry[]; lyrics: string }[]
): { name: string; bars: typeof bars }[] {
  if (bars.length === 0) return [];

  const SECTION_SIZE = 8;
  const sections: { name: string; bars: typeof bars }[] = [];
  const sectionNames = ["A", "B", "C", "D", "E", "F", "G", "H"];

  for (let i = 0; i < bars.length; i += SECTION_SIZE) {
    const slice = bars.slice(i, i + SECTION_SIZE);
    const name = sectionNames[Math.floor(i / SECTION_SIZE)] ?? `Sektion ${Math.floor(i / SECTION_SIZE) + 1}`;
    sections.push({ name, bars: slice });
  }

  return sections;
}

async function analyzeAudioFile(
  base64Data: string,
  mediaType: MediaType,
  filename: string,
  opts: { transcribeLyrics: boolean } = { transcribeLyrics: false }
): Promise<AnalyzeResult> {
  const title = filename
    .replace(/\.(mp3|wav|ogg|m4a)$/i, "")
    .replace(/[_-]/g, " ")
    .trim();

  try {
    const audioBuffer = Buffer.from(base64Data, "base64");

    console.log(
      `[Import] Audio analysis start for ${filename} (${audioBuffer.length} bytes) — chords${opts.transcribeLyrics ? " + lyrics in parallel" : " only"}`
    );
    const t0 = Date.now();

    // Always run chord detection. Lyrics only if user opted in — it's slow (Demucs + Whisper).
    const chordPromise = fetch(`${FLASK_API_URL}/detect_chords`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": filename,
      },
      body: audioBuffer,
    });
    const lyricsPromise = opts.transcribeLyrics
      ? transcribeLyrics(audioBuffer, filename, "sv")
      : Promise.resolve(null);

    const [chordRes, lyricsRes] = await Promise.all([chordPromise, lyricsPromise]);

    if (!chordRes.ok) {
      throw new Error(`Flask /detect_chords error: ${chordRes.status} ${chordRes.statusText}`);
    }

    const data = (await chordRes.json()) as ChordDetectionResponse;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[Import] Audio analysis complete in ${elapsed}s: ${data.chord_count} chords, key ${data.key}, tempo ${data.tempo.toFixed(0)} bpm, lyrics: ${lyricsRes ? lyricsRes.word_count + " words" : "none"}`
    );

    const hasLyrics = !!(lyricsRes && lyricsRes.word_count > 0);

    // Build bar structure — pass lyrics so words land in the right bars
    const bars = buildBarsFromProgression(
      data.progression,
      data.tempo,
      4,
      data.duration,
      lyricsRes?.segments ?? null
    );
    const sections = splitIntoSections(bars).map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      type: "bars" as const,
      bars: s.bars,
    }));

    // If no bars built (e.g. silent audio), create a fallback
    if (sections.length === 0) {
      sections.push({
        id: crypto.randomUUID(),
        name: "A",
        type: "bars" as const,
        bars: Array.from({ length: 8 }, () => ({ chords: [], lyrics: "" })),
      });
    }

    // When lyrics are present, songbook is the more useful editor (chords + text).
    const preferredFormat: PreferredFormat = hasLyrics ? "songbook" : "ireal";

    const song: ImportedSong = {
      title: title || "Okänd låt",
      artist: "",
      key: data.key || "C",
      tempo: Math.round(data.tempo),
      timeSignature: "4/4",
      style: "",
      preferredFormat,
      sections,
    };

    const uniqueChords = new Set(data.progression.map((s) => s.chord).filter((c) => c !== "N"));

    const signals = [
      `audio-detected: ${data.chord_count} chord segments`,
      `unique chords: ${uniqueChords.size}`,
      `key: ${data.key} ${data.mode}`,
      `tempo: ${Math.round(data.tempo)} bpm`,
      `duration: ${data.duration.toFixed(1)}s`,
      `bars: ${bars.length}`,
    ];
    if (hasLyrics) {
      signals.push(
        `lyrics: ${lyricsRes!.word_count} words in ${lyricsRes!.segment_count} segments (${lyricsRes!.language})`
      );
      signals.push(
        `separation: Demucs htdemucs + ${lyricsRes!.method.includes("medium") ? "Whisper medium" : "Whisper"}`
      );
    } else {
      signals.push(`lyrics: not transcribed (service unavailable or no vocals)`);
    }
    signals.push(`attribution: ChordMiniApp + Demucs + faster-whisper (MIT)`);

    const model = hasLyrics
      ? `ChordMiniApp v2.0 + Demucs htdemucs + ${lyricsRes!.method.replace("demucs-htdemucs + ", "")}`
      : `ChordMiniApp v2.0 (librosa template-match)`;

    return {
      songs: [song],
      tokensUsed: 0,
      model,
      detectedFormat: preferredFormat,
      detectionConfidence: 0.75,
      detectionSignals: signals,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown error";
    const isConnectError = errMsg.includes("fetch failed") || errMsg.includes("ECONNREFUSED");
    console.error("[Import] Chord detection failed:", errMsg);

    const fallbackSong: ImportedSong = {
      title: title || "Okänd låt",
      artist: "",
      key: "C",
      tempo: 120,
      timeSignature: "4/4",
      style: "",
      preferredFormat: "ireal",
      sections: [
        {
          id: crypto.randomUUID(),
          name: "A",
          type: "bars",
          bars: Array.from({ length: 8 }, () => ({ chords: [], lyrics: "" })),
        },
      ],
    };

    return {
      songs: [fallbackSong],
      tokensUsed: 0,
      model: "manual-audio (chord detection unavailable)",
      detectedFormat: "ireal",
      detectionConfidence: 0,
      detectionSignals: isConnectError
        ? [
            `warning: chord detection service inte igång`,
            `lösning: kör "cd chord-api && ./start.sh" i terminalen`,
            `tomt schema skapat — fyll i ackorden manuellt`,
          ]
        : [`warning: chord-detection-failed (${errMsg})`],
    };
  }
}

// ─── Huvud-analysfunktion ─────────────────────────────────────────────────────

export async function analyzeFile(
  base64Data: string,
  mediaType: MediaType,
  filename: string,
  extractedText?: string,
  opts?: { transcribeLyrics: boolean }
): Promise<AnalyzeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY saknas — lägg till den i miljövariablerna");
  }

  // Handle audio files separately with Flask chord detection
  if (mediaType.startsWith("audio/")) {
    console.log(`[Import] Audioformat: ${mediaType} — ${filename}${opts?.transcribeLyrics ? " (med sångtext)" : ""}`);
    return analyzeAudioFile(base64Data, mediaType, filename, opts ?? { transcribeLyrics: false });
  }

  // Handle ChordPro and text files - decode base64 directly to text
  let normalizedText = extractedText ? normalizeMusicFonts(extractedText) : "";
  let isTextFile = false;

  if (!extractedText && (mediaType === "text/plain" || mediaType === "text/x-chordpro" || mediaType === "application/x-chordpro")) {
    // For text files (including .pro), decode base64 directly
    try {
      const decoded = Buffer.from(base64Data, "base64").toString("utf-8");
      normalizedText = normalizeMusicFonts(decoded);
      extractedText = decoded; // Pass decoded text to extraction functions
      isTextFile = true;
      console.log(`[Import] ChordPro/text fil: ${filename} (${normalizedText.length} chars)`);
    } catch (err) {
      console.error("[Import] Kunde inte avkoda textfil:", err);
    }
  }

  // ── Steg 1: Snabb textbaserad föranalys ──────────────────────────────────

  const detection = detectFormat(normalizedText, filename);
  console.log(`[Import] Steg 1 detect: ${detection.format ?? "okänt"} (confidence: ${detection.confidence.toFixed(2)})`);
  console.log(`[Import] Signaler: ${detection.signals.join(", ")}`);

  let format: PreferredFormat;
  let classificationModel = "detect-format (textanalys)";

  if (detection.format && detection.confidence >= 0.5) {
    // Tillräcklig confidence från textanalys — hoppa över AI-klassificering
    format = detection.format;
    console.log(`[Import] Steg 2 hoppas över — tillräcklig confidence från textanalys`);
  } else {
    // ── Steg 2: Claude Sonnet vision-klassificering ────────────────────────
    console.log(`[Import] Steg 2: Skickar till Claude Sonnet för klassificering...`);
    try {
      const classification = await classifyFormat(base64Data, mediaType, normalizedText);
      format = classification.format;
      classificationModel = `claude-sonnet-4-6 (klassificering: ${classification.reasoning})`;
      console.log(`[Import] Steg 2 resultat: ${format} (confidence: ${classification.confidence.toFixed(2)}) — ${classification.reasoning}`);
    } catch (err) {
      // Fallback: om klassificering misslyckas, gissa iReal (vanligaste)
      console.error("[Import] Klassificering misslyckades, fallback till iReal:", err);
      format = detection.format ?? "ireal";
      classificationModel = "fallback (iReal)";
    }
  }

  // ── Steg 3: Format-specifik extraktion ───────────────────────────────────

  console.log(`[Import] Steg 3: Extraherar som ${format}...`);

  let songs: ImportedSong[];
  let extractionModel: string;

  try {
    switch (format) {
      case "songbook":
        songs = await extractSongbook(base64Data, mediaType, filename, extractedText || normalizedText);
        extractionModel = "claude-sonnet-4-6 (songbook)";
        break;
      case "notation":
        songs = await extractNotation(base64Data, mediaType, filename, extractedText || normalizedText);
        extractionModel = "claude-sonnet-4-6 (notation)";
        break;
      case "ireal":
      default:
        songs = await extractIReal(base64Data, mediaType, filename, extractedText || normalizedText);
        extractionModel = "claude-sonnet-4-6 (ireal)";
        break;
    }
  } catch (err) {
    console.error(`[Import] Extraktion som ${format} misslyckades:`, err);
    throw new Error(`Kunde inte extrahera låt som ${format}: ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!songs.length) {
    throw new Error("Inga låtar hittades i dokumentet");
  }

  console.log(`[Import] Klar: ${songs.length} låt(ar) extraherade`);

  return {
    songs,
    tokensUsed: 0, // TODO: summera tokens från alla anrop
    model: `${classificationModel} → ${extractionModel}`,
    detectedFormat: format,
    detectionConfidence: detection.confidence,
    detectionSignals: detection.signals,
  };
}
