// ─── Core music types ────────────────────────────────────────────────────────

export type TimeSignature = "4/4" | "3/4" | "6/8" | "2/4" | "5/4" | "7/4" | "12/8";
export type PreferredFormat = "ireal" | "songbook" | "notation";
export type NoteColor = "default" | "yellow" | "blue" | "green" | "red" | "purple" | "orange";
export type SectionType = "bars" | "note" | "staff";
export type RepeatType = "none" | "start" | "end" | "both";
export type NoteDuration = "w" | "h" | "q" | "8" | "16";
export type Articulation = "staccato" | "accent" | "tenuto" | "fermata" | "marcato";
export type Dynamic = "pp" | "p" | "mp" | "mf" | "f" | "ff";

// ─── Chord within a bar ──────────────────────────────────────────────────────

export interface ChordEntry {
  symbol: string; // e.g. "Cmaj7", "F#m7b5", "Bb7"
  beat: 1 | 2 | 3 | 4; // beat position within the bar
}

// ─── Melody note (for notation editor) ───────────────────────────────────────

export interface MelodyNote {
  pitch: string;          // "C", "D", "Eb", "F#"
  duration: NoteDuration; // "w", "h", "q", "8", "16"
  octave: number;         // 3–6
  dotted?: boolean;
  tied?: boolean;
  rest?: boolean;
  articulation?: Articulation;
  dynamic?: Dynamic;
}

// ─── Bar (takt) ───────────────────────────────────────────────────────────────

export interface Bar {
  chords: ChordEntry[];           // Multiple chords per bar with beat positions
  lyrics?: string;                // Text under the bar
  melodyNotes?: MelodyNote[];     // For notation format
  repeat?: RepeatType;            // Repeat markers
  repeatCount?: number;           // How many times (e.g. 4 = play 4 times)
  ending?: number;                // Volta bracket number (1, 2, 3...)
  navigation?: string;            // "D.S. al Coda", "Fine", "Coda", "Segno"
  timeSignature?: TimeSignature;  // Time signature change mid-song
}

// ─── Section (part of song) ───────────────────────────────────────────────────

export interface Section {
  id: string;            // Unique ID (crypto.randomUUID or nanoid)
  name: string;          // "Intro", "Vers 1", "Refräng", "Bridge", "Outro"
  type: SectionType;     // "bars" (default), "note" (free text), "staff" (notation)
  bars: Bar[];           // Array of bars (for bars/staff type)
  noteText?: string;     // Free text (for type = "note")
  noteColor?: NoteColor; // Sticky note color (for type = "note")
}

// ─── Song ────────────────────────────────────────────────────────────────────

export interface Song {
  id: number;
  userId: string;
  title: string;
  artist: string;
  key: string;              // "C", "F#", "Bb", "Gm" etc.
  tempo: number;            // BPM
  timeSignature: TimeSignature;
  style?: string;           // "Jazz", "Pop", "Funk", "Bossa Nova" etc.
  sections: Section[];
  notes?: string;           // Free-text notes for the song
  preferredFormat: PreferredFormat;
  isPublic: boolean;
  originalFileData?: string; // Base64 of uploaded file
  originalFileType?: "pdf" | "image";
  createdAt: string;
  updatedAt?: string;
}

// ─── Setlist ─────────────────────────────────────────────────────────────────

export interface SetlistSong {
  songId: number;
  position: number;
  song?: Song;
}

export interface Setlist {
  id: number;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  songs: SetlistSong[];
  createdAt: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  name?: string;
  isAdmin: boolean;
  createdAt: string;
}

// ─── API helpers ─────────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
}

export type ApiResult<T> = T | ApiError;
