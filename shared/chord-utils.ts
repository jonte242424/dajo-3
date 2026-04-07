/**
 * DAJO Chord Utilities
 * Powered by Tonal.js — complete music theory engine
 *
 * Handles: parsing, normalization, transposition, validation,
 * autocomplete, key analysis, and chord-scale relationships.
 */

import {
  Chord,
  Note,
  Key,
  Scale,
  Interval,
  Progression,
  ChordType,
  Mode,
} from "tonal";

// ─── Aliases: common jazz/pop notation → tonal names ─────────────────────────
// Note: minor aliases must come before major to avoid wrong regex matches

const SYMBOL_ALIASES: [RegExp, string][] = [
  // Minor variants (must be before major!)
  [/[-−](\d)/g, "m$1"],        // -7 → m7, -9 → m9
  [/[-−]$/g, "m"],             // C- → Cm
  [/‹/g, "m"],                 // C‹ → Cm (Finale font)

  // Major / diminished / augmented
  [/[Δ∆]/g, "maj7"],           // CΔ → Cmaj7
  [/Œ„Š/g, "maj"],             // Replit/PDF font artifact
  [/°7/g, "dim7"],             // C°7 → Cdim7 (must be before °)
  [/°/g, "dim"],               // C° → Cdim
  [/ø7/g, "m7b5"],             // Cø7 → Cm7b5
  [/ø/g, "m7b5"],              // Cø → Cm7b5
  [/\+/g, "aug"],              // C+ → Caug
  [/©/g, "#"],                 // PDF font artifact: © → #
  [/♭/g, "b"],                 // Unicode flat
  [/♯/g, "#"],                 // Unicode sharp

  // Common text variants
  [/[Mm]aj(?!7)/g, "maj"],     // maj without 7
  [/[Mm][Aa][Jj]7/g, "maj7"], // MAJ7 → maj7
  [/[Mm][Ii][Nn]/g, "m"],     // min → m
  [/[Ss][Uu][Ss]2/g, "sus2"],
  [/[Ss][Uu][Ss]4?/g, "sus4"],
  [/[Aa][Dd][Dd]9/g, "add9"],
  [/[Aa][Uu][Gg]/g, "aug"],
  [/[Dd][Ii][Mm]/g, "dim"],
];

// ─── Normalize: clean up raw input to tonal-compatible format ─────────────────

export function normalizeChord(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  let s = raw.trim();

  for (const [pattern, replacement] of SYMBOL_ALIASES) {
    s = s.replace(pattern, replacement);
  }

  // Handle slash chords: "C/E", "Dm7/F"
  const slashIdx = s.lastIndexOf("/");
  if (slashIdx > 0) {
    const root = s.slice(0, slashIdx);
    const bass = s.slice(slashIdx + 1);
    return `${normalizeChord(root)}/${normalizeChord(bass)}`;
  }

  return s;
}

// ─── Parse: extract root + quality + bass from chord symbol ──────────────────

export interface ParsedChord {
  root: string;       // "C", "F#", "Bb"
  quality: string;    // "maj7", "m7", "7", "dim", etc.
  bass?: string;      // slash bass note: "E" in "C/E"
  symbol: string;     // full normalized symbol
  aliases: string[];  // all known aliases
  notes: string[];    // notes in the chord
}

export function parseChord(input: string): ParsedChord | null {
  if (!input) return null;
  const normalized = normalizeChord(input);

  // Handle slash chord
  const slashIdx = normalized.lastIndexOf("/");
  const chordPart = slashIdx > 0 ? normalized.slice(0, slashIdx) : normalized;
  const bass = slashIdx > 0 ? normalized.slice(slashIdx + 1) : undefined;

  const chord = Chord.get(chordPart);
  if (!chord.tonic) return null;

  return {
    root: chord.tonic,
    quality: chord.quality,
    bass,
    symbol: normalized,
    aliases: chord.aliases,
    notes: chord.notes,
  };
}

// ─── Validate ─────────────────────────────────────────────────────────────────

export function isValidChord(input: string): boolean {
  if (!input || input.trim() === "") return false;
  // Allow "/" and "|" as bar delimiters
  if (["/", "|", "%"].includes(input.trim())) return true;
  const parsed = parseChord(input);
  return parsed !== null;
}

// ─── Transpose ────────────────────────────────────────────────────────────────

export function transposeChord(symbol: string, semitones: number): string {
  if (!symbol || semitones === 0) return symbol;

  const normalized = normalizeChord(symbol);
  const slashIdx = normalized.lastIndexOf("/");
  const chordPart = slashIdx > 0 ? normalized.slice(0, slashIdx) : normalized;
  const bass = slashIdx > 0 ? normalized.slice(slashIdx + 1) : null;

  const chord = Chord.get(chordPart);
  if (!chord.tonic) return symbol;

  const interval = Interval.fromSemitones(semitones);
  const newRoot = Note.transpose(chord.tonic, interval);
  const newRootSimplified = Note.simplify(newRoot) || newRoot;

  // Preserve the quality suffix exactly
  const qualitySuffix = chordPart.slice(chord.tonic.length);
  const transposedChord = `${newRootSimplified}${qualitySuffix}`;

  if (bass) {
    const newBass = Note.simplify(Note.transpose(bass, interval)) || bass;
    return `${transposedChord}/${newBass}`;
  }

  return transposedChord;
}

// ─── Transpose entire song sections ──────────────────────────────────────────

export function transposeSections(
  sections: import("./types.js").Section[],
  semitones: number
): import("./types.js").Section[] {
  if (semitones === 0) return sections;
  return sections.map((section) => ({
    ...section,
    bars: section.bars.map((bar) => ({
      ...bar,
      chords: bar.chords.map((entry) => ({
        ...entry,
        symbol: transposeChord(entry.symbol, semitones),
      })),
    })),
  }));
}

// ─── Autocomplete suggestions ─────────────────────────────────────────────────

const COMMON_QUALITIES = [
  "", "m", "7", "maj7", "m7", "m7b5", "dim", "dim7", "aug",
  "9", "maj9", "m9", "11", "13", "maj13",
  "sus2", "sus4", "7sus4",
  "6", "m6", "6/9", "m6/9",
  "add9", "madd9",
  "7b9", "7#9", "7b5", "7#5",
  "m7b5", "7alt",
];

const ALL_ROOTS = [
  "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
];

export function getChordSuggestions(partial: string, limit = 12): string[] {
  if (!partial) return COMMON_QUALITIES.slice(0, 8).map((q) => `C${q}`);

  const normalized = normalizeChord(partial);

  // Try to parse the root
  const note = Note.get(normalized.slice(0, 2));
  const hasRoot = note.name !== "" || normalized.startsWith("A") || normalized.startsWith("E");

  if (!hasRoot) {
    // Show roots that match
    return ALL_ROOTS.filter((r) =>
      r.toLowerCase().startsWith(normalized.toLowerCase())
    ).slice(0, limit);
  }

  // Detect root length (1 or 2 chars: "C", "F#", "Bb")
  const rootLen = ["Db","Eb","F#","Gb","Ab","Bb","C#","D#","G#","A#"].some(
    (r) => normalized.startsWith(r)
  ) ? 2 : 1;

  const root = normalized.slice(0, rootLen);
  const qualityPrefix = normalized.slice(rootLen).toLowerCase();

  const matchingQualities = COMMON_QUALITIES.filter((q) =>
    q.toLowerCase().startsWith(qualityPrefix)
  );

  return matchingQualities.slice(0, limit).map((q) => `${root}${q}`);
}

// ─── Key intelligence ─────────────────────────────────────────────────────────

export interface KeyInfo {
  tonic: string;
  mode: "major" | "minor";
  scale: string[];          // All 7 notes
  diatonicChords: string[]; // The 7 diatonic chords
  relativeKey: string;      // C major ↔ A minor
  parallelKey: string;      // C major ↔ C minor
  commonProgressions: { name: string; chords: string[] }[];
}

export function getKeyInfo(keyString: string): KeyInfo | null {
  if (!keyString) return null;

  const isMinor = keyString.endsWith("m") && keyString.length > 1;
  const tonic = isMinor ? keyString.slice(0, -1) : keyString;
  const mode = isMinor ? "minor" : "major";

  try {
    if (mode === "major") {
      const k = Key.majorKey(tonic);
      const relTonic = k.minorRelative;

      return {
        tonic,
        mode: "major",
        scale: Scale.get(`${tonic} major`).notes,
        diatonicChords: k.chords,
        relativeKey: `${relTonic}m`,
        parallelKey: `${tonic}m`,
        commonProgressions: [
          { name: "I–V–vi–IV", chords: Progression.fromRomanNumerals(tonic, ["I", "V", "vi", "IV"]) },
          { name: "ii–V–I", chords: Progression.fromRomanNumerals(tonic, ["ii7", "V7", "Imaj7"]) },
          { name: "I–IV–V", chords: Progression.fromRomanNumerals(tonic, ["I", "IV", "V"]) },
          { name: "vi–IV–I–V", chords: Progression.fromRomanNumerals(tonic, ["vi", "IV", "I", "V"]) },
          { name: "I–vi–IV–V", chords: Progression.fromRomanNumerals(tonic, ["I", "vi", "IV", "V"]) },
        ],
      };
    } else {
      const k = Key.minorKey(tonic);
      return {
        tonic,
        mode: "minor",
        scale: Scale.get(`${tonic} minor`).notes,
        diatonicChords: k.natural.chords,
        relativeKey: k.relativeMajor,
        parallelKey: tonic,
        commonProgressions: [
          { name: "i–iv–v", chords: Progression.fromRomanNumerals(tonic, ["i", "iv", "v"]) },
          { name: "i–VI–III–VII", chords: Progression.fromRomanNumerals(tonic, ["i", "VI", "III", "VII"]) },
          { name: "ii°–V–i", chords: Progression.fromRomanNumerals(tonic, ["ii°", "V7", "i"]) },
          { name: "i–VII–VI–VII", chords: Progression.fromRomanNumerals(tonic, ["i", "VII", "VI", "VII"]) },
        ],
      };
    }
  } catch {
    return null;
  }
}

// ─── Analyze chord function in a key (Roman numeral) ─────────────────────────

export function analyzeChordInKey(
  chordSymbol: string,
  keyString: string
): { numeral: string; function: string; diatonic: boolean } | null {
  try {
    const parsed = parseChord(chordSymbol);
    if (!parsed) return null;

    const isMinor = keyString.endsWith("m");
    const tonic = isMinor ? keyString.slice(0, -1) : keyString;

    const keyData = isMinor ? Key.minorKey(tonic) : Key.majorKey(tonic);
    const chords = isMinor
      ? (keyData as any).natural.chords
      : (keyData as any).chords;

    const idx = chords.findIndex(
      (c: string) => Chord.get(c).tonic === parsed.root
    );

    if (idx === -1) return { numeral: "?", function: "Non-diatonic", diatonic: false };

    const numerals = isMinor
      ? ["i", "ii°", "III", "iv", "v", "VI", "VII"]
      : ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

    const functions = isMinor
      ? ["Tonic", "Supertonic", "Mediant", "Subdominant", "Dominant", "Submediant", "Subtonic"]
      : ["Tonic", "Supertonic", "Mediant", "Subdominant", "Dominant", "Submediant", "Leading Tone"];

    return {
      numeral: numerals[idx],
      function: functions[idx],
      diatonic: true,
    };
  } catch {
    return null;
  }
}

// ─── Suggest chords that fit a scale/key ─────────────────────────────────────

export function suggestChordsForKey(keyString: string): string[] {
  const info = getKeyInfo(keyString);
  if (!info) return [];
  return info.diatonicChords;
}

// ─── Scale information ────────────────────────────────────────────────────────

export function getScaleInfo(root: string, scaleName: string) {
  const scale = Scale.get(`${root} ${scaleName}`);
  if (!scale.tonic) return null;
  return {
    name: scale.name,
    notes: scale.notes,
    intervals: scale.intervals,
  };
}

// ─── Common chord qualities (for UI dropdowns) ────────────────────────────────

export const CHORD_QUALITIES = COMMON_QUALITIES;
export const ALL_KEYS = [
  "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
  "Cm", "Dm", "Em", "Fm", "Gm", "Am", "Bm",
  "C#m", "Ebm", "F#m", "G#m", "Bbm",
];
