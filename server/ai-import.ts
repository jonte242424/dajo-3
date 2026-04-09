/**
 * DAJO AI Import Pipeline
 *
 * Steg 1: detect-format.ts   — Snabb textbaserad föranalys (gratis)
 * Steg 2: classify-format.ts — Claude Sonnet vision-klassificering (billig)
 * Steg 3: extract-*.ts       — Format-specifik extraktion (optimerad prompt)
 */

import type { Section, TimeSignature } from "../shared/types.js";
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
  | "audio/mp4";

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

async function analyzeAudioFile(
  base64Data: string,
  mediaType: MediaType,
  filename: string
): Promise<AnalyzeResult> {
  const title = filename
    .replace(/\.(mp3|wav|ogg|m4a)$/i, "")
    .replace(/[_-]/g, " ")
    .trim();

  try {
    // Convert base64 back to buffer for Flask upload
    const audioBuffer = Buffer.from(base64Data, "base64");

    // Call Flask chord detection API
    console.log(`[Import] Calling Flask chord detection API for ${filename}...`);
    const flaskResponse = await fetch("http://localhost:5002/detect_chords", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Filename": filename,
      },
      body: audioBuffer,
    });

    if (!flaskResponse.ok) {
      throw new Error(`Flask API error: ${flaskResponse.status} ${flaskResponse.statusText}`);
    }

    const chordData = await flaskResponse.json();
    console.log(`[Import] Flask response:`, chordData);

    // Extract chord information from response
    const detectedChord = chordData.detected_chord || "C";
    const tempo = chordData.metadata?.tempo || 120;
    const duration = chordData.metadata?.duration || 0;

    // Build song structure with detected chord
    const song: ImportedSong = {
      title: title || "Okänd låt",
      artist: "",
      key: detectedChord.replace(/maj\d?|m|dim|sus|add|b\d|#\d/g, "").trim() || "C",
      tempo: Math.round(tempo),
      timeSignature: "4/4",
      style: "",
      preferredFormat: "songbook",
      sections: [
        {
          id: crypto.randomUUID(),
          name: "Vers",
          type: "bars",
          // Create 8 bars with the detected chord
          bars: Array.from({ length: 8 }, () => ({
            chords: [{ root: detectedChord, beat: 0 }],
            lyrics: "",
          })),
        },
      ],
    };

    return {
      songs: [song],
      tokensUsed: 0,
      model: `ChordMiniApp (${chordData.status}) + librosa`,
      detectedFormat: "songbook",
      detectionConfidence: 0.7, // Moderate confidence for auto-detected chords
      detectionSignals: [
        `audio-detected: ${detectedChord}`,
        `tempo: ${Math.round(tempo)} bpm`,
        `duration: ${duration.toFixed(1)}s`,
        `attribution: ChordMiniApp (https://github.com/ptnghia-j/ChordMiniApp)`,
        chordData.status === "MVP" ? "note: MVP uses chroma-based detection" : "",
      ].filter(Boolean),
    };
  } catch (err) {
    console.error("[Import] Chord detection failed:", err);

    // Fallback: return empty structure without chord detection
    const fallbackSong: ImportedSong = {
      title: title || "Okänd låt",
      artist: "",
      key: "C",
      tempo: 120,
      timeSignature: "4/4",
      style: "",
      preferredFormat: "songbook",
      sections: [
        {
          id: crypto.randomUUID(),
          name: "Vers",
          type: "bars",
          bars: Array.from({ length: 8 }, () => ({ chords: [], lyrics: "" })),
        },
      ],
    };

    return {
      songs: [fallbackSong],
      tokensUsed: 0,
      model: "manual-audio (chord detection unavailable)",
      detectedFormat: "songbook",
      detectionConfidence: 0,
      detectionSignals: [`audio-file: chord-detection-failed (${err instanceof Error ? err.message : "unknown error"})`],
    };
  }
}

// ─── Huvud-analysfunktion ─────────────────────────────────────────────────────

export async function analyzeFile(
  base64Data: string,
  mediaType: MediaType,
  filename: string,
  extractedText?: string
): Promise<AnalyzeResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY saknas — lägg till den i miljövariablerna");
  }

  // Handle audio files separately with Flask chord detection
  if (mediaType.startsWith("audio/")) {
    console.log(`[Import] Audioformat: ${mediaType} — ${filename}`);
    return analyzeAudioFile(base64Data, mediaType, filename);
  }

  const normalizedText = extractedText ? normalizeMusicFonts(extractedText) : "";

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
        songs = await extractSongbook(base64Data, mediaType, filename, normalizedText);
        extractionModel = "claude-sonnet-4-6 (songbook)";
        break;
      case "notation":
        songs = await extractNotation(base64Data, mediaType, filename, normalizedText);
        extractionModel = "claude-sonnet-4-6 (notation)";
        break;
      case "ireal":
      default:
        songs = await extractIReal(base64Data, mediaType, filename, normalizedText);
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
