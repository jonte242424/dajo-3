/**
 * DAJO 3.0 — PDF Export (Improved)
 * Tre stilar: ireal (ackordschema-grid), songbook (ChordPro-standard), notation (leadsheet)
 *
 * Standards:
 * - iReal Pro: https://www.irealpro.com/ireal-pro-custom-chord-chart-protocol
 * - ChordPro: https://www.chordpro.org/chordpro/
 * - Leadsheet: Staff-based notation with chord symbols
 */

// @ts-ignore - pdfkit is CommonJS but we're in ESM
import PDFDocument from "pdfkit";
import type { Section, Bar, ChordEntry } from "../shared/types.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportStyle = "ireal" | "songbook" | "notation";

export interface SongForExport {
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
  style?: string;
  notes?: string;
  sections: Section[];
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  black:     "#000000",
  darkGray:  "#333333",
  midGray:   "#666666",
  lightGray: "#999999",
  border:    "#CCCCCC",
  divider:   "#DDDDDD",
  barBg:     "#FFFFFF",
  sectionBg: "#1F3A66",
  sectionFg: "#FFFFFF",
  accent:    "#2563EB",
  staffLine: "#444444",
};

const PAGE = { w: 595.28, h: 841.89 }; // A4
const MARGIN = 40;
const INNER_W = PAGE.w - MARGIN * 2;

// ─── Helper: split chord symbol into root + quality ──────────────────────────
// "Cmaj7" → { root: "C", quality: "maj7" }
// "F#m7b5" → { root: "F#", quality: "m7b5" }

function splitChord(symbol: string): { root: string; quality: string } {
  if (!symbol || symbol === "%") return { root: symbol, quality: "" };
  let i = 0;
  let root = symbol[i++]; // First char is always root
  if (i < symbol.length && (symbol[i] === "#" || symbol[i] === "b")) root += symbol[i++];
  return { root, quality: symbol.slice(i) };
}

function barChords(bar: Bar): ChordEntry[] {
  return bar.chords ?? [];
}

function barsOf(section: Section): Bar[] {
  if (section.type !== "bars") return [];
  return section.bars ?? [];
}

// ─── Main export function ─────────────────────────────────────────────────────

export function generatePdf(
  song: SongForExport,
  exportStyle: ExportStyle
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      info: {
        Title: song.title,
        Author: song.artist ?? "DAJO",
        Creator: "DAJO 3.0",
      },
    });

    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    switch (exportStyle) {
      case "ireal":
        renderIreal(doc, song);
        break;
      case "songbook":
        renderSongbook(doc, song);
        break;
      case "notation":
        renderNotation(doc, song);
        break;
    }

    doc.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// STIL 1: iReal Grid (iReal Pro format inspired)
// ═══════════════════════════════════════════════════════════════════════════════

function renderIreal(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(28).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W, align: "center" });
  y += 36;

  if (song.artist) {
    doc.fontSize(12).fillColor(C.midGray).font("Helvetica")
       .text(song.artist, MARGIN, y, { width: INNER_W, align: "center" });
    y += 18;
  }

  // ── Meta line ────────────────────────────────────────────────────────────────
  const metaParts: string[] = [];
  if (song.key) metaParts.push(`Tonart: ${song.key}`);
  if (song.tempo) metaParts.push(`♩ = ${song.tempo}`);
  if (song.timeSignature) metaParts.push(song.timeSignature);
  if (song.style) metaParts.push(song.style);

  if (metaParts.length) {
    y += 4;
    doc.fontSize(10).fillColor(C.midGray).font("Helvetica")
       .text(metaParts.join("   •   "), MARGIN, y, { width: INNER_W, align: "center" });
    y += 14;
  }

  // ── Divider ──────────────────────────────────────────────────────────────────
  doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
     .strokeColor(C.divider).lineWidth(1).stroke();
  y += 12;

  // ── Bar grid settings ────────────────────────────────────────────────────────
  const COLS = 4;
  const BAR_W = INNER_W / COLS;
  const BAR_H = 60;
  const ROW_GAP = 8;

  // ── Render sections ──────────────────────────────────────────────────────────
  for (const section of song.sections) {
    if (section.type === "note") {
      y = ensureSpace(doc, y, 30);
      doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
         .text(section.noteText ?? "", MARGIN, y, { width: INNER_W });
      y += 20;
      continue;
    }

    const bars = barsOf(section);
    if (!bars.length) continue;

    y = ensureSpace(doc, y, 28 + BAR_H);

    // ── Section label (dark pill) ─────────────────────────────────────
    const labelW = Math.min(
      doc.widthOfString(section.name ?? "A", { fontSize: 10 }) + 16,
      120
    );
    doc.roundedRect(MARGIN, y, labelW, 20, 4).fill(C.sectionBg);
    doc.fontSize(10).fillColor(C.sectionFg).font("Helvetica-Bold")
       .text(section.name ?? "", MARGIN, y + 4, { width: labelW, align: "center" });
    y += 26;

    // ── Render bar rows ──────────────────────────────────────────────────
    let rowStart = 0;
    while (rowStart < bars.length) {
      const rowEnd = Math.min(rowStart + COLS, bars.length);
      const rowBars = bars.slice(rowStart, rowEnd);

      y = ensureSpace(doc, y, BAR_H + ROW_GAP);

      for (let col = 0; col < rowBars.length; col++) {
        const bar = rowBars[col];
        const bx = MARGIN + col * BAR_W;

        // ── Bar border ────────────────────────────────────────────────
        doc.rect(bx, y, BAR_W, BAR_H)
           .strokeColor(C.border).lineWidth(0.75).stroke();

        // ── Chord rendering ───────────────────────────────────────────
        const ch = barChords(bar);
        if (ch.length === 0) {
          // Repeat sign %
          doc.fontSize(28).fillColor(C.lightGray).font("Helvetica")
             .text("%", bx, y + BAR_H / 2 - 16, { width: BAR_W, align: "center" });
        } else if (ch.length === 1) {
          // Single chord - split into root (large) + quality (superscript)
          renderChordSplit(doc, ch[0].symbol, bx + BAR_W / 2, y + BAR_H / 2 - 8);
        } else if (ch.length === 2) {
          // Two chords with slash
          renderChordSplit(doc, ch[0].symbol, bx + BAR_W * 0.25, y + BAR_H / 2 - 8);
          doc.fontSize(16).fillColor(C.darkGray).font("Helvetica")
             .text("/", bx + BAR_W / 2 - 6, y + BAR_H / 2 - 10);
          renderChordSplit(doc, ch[1].symbol, bx + BAR_W * 0.75, y + BAR_H / 2 - 8);
        } else {
          // Many chords - try to fit
          const parts = ch.slice(0, 3);
          parts.forEach((c, i) => {
            const tx = bx + 4 + (i * (BAR_W - 8)) / parts.length;
            doc.fontSize(11).fillColor(C.black).font("Helvetica-Bold")
               .text(c.symbol, tx, y + 8, { width: BAR_W / parts.length - 4, align: "center", lineBreak: false });
          });
        }

        // ── Bar number (small, top-left) ──────────────────────────────
        const barNum = rowStart + col + 1;
        doc.fontSize(7).fillColor(C.lightGray).font("Helvetica")
           .text(String(barNum), bx + 3, y + 3);

        // ── Lyrics (bottom, small) ────────────────────────────────────
        if (bar.lyrics) {
          doc.fontSize(7).fillColor(C.midGray).font("Helvetica-Oblique")
             .text(bar.lyrics, bx + 3, y + BAR_H - 11, { width: BAR_W - 6, ellipsis: true });
        }

        // ── Navigation marker (bottom-right, small) ──────────────────
        if (bar.navigation) {
          doc.fontSize(6).fillColor(C.accent).font("Helvetica-Oblique")
             .text(bar.navigation, bx + 2, y + BAR_H - 8, { width: BAR_W - 4, align: "right", lineBreak: false });
        }
      }

      y += BAR_H + ROW_GAP;
      rowStart = rowEnd;
    }

    y += 4;
  }

  // ── Notes section ────────────────────────────────────────────────────────────
  if (song.notes) {
    y = ensureSpace(doc, y, 40);
    y += 8;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
       .strokeColor(C.divider).lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Not: ${song.notes}`, MARGIN, y, { width: INNER_W });
  }

  footer(doc, "iReal Grid");
}

// ─── Helper: render chord with split typography (root large, quality small) ───

function renderChordSplit(doc: PDFKit.PDFDocument, symbol: string, cx: number, cy: number) {
  if (symbol === "%") {
    doc.fontSize(20).fillColor(C.lightGray).font("Helvetica")
       .text("%", cx - 8, cy, { width: 16, align: "center" });
    return;
  }

  const { root, quality } = splitChord(symbol);

  // Root (large)
  doc.fontSize(22).fillColor(C.black).font("Helvetica-Bold")
     .text(root, cx - 20, cy, { width: 40, align: "center" });

  // Quality (small, superscript-like)
  if (quality) {
    doc.fontSize(11).fillColor(C.black).font("Helvetica-Bold")
       .text(quality, cx + 6, cy - 4, { width: 30, align: "left" });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STIL 2: Songbook (ChordPro-inspired, clean text format)
// ═══════════════════════════════════════════════════════════════════════════════

function renderSongbook(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(26).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W });
  y += 32;

  // ── Meta line ────────────────────────────────────────────────────────────────
  const meta: string[] = [];
  if (song.artist) meta.push(song.artist);
  if (song.key) meta.push(`Tonart: ${song.key}`);
  if (song.tempo) meta.push(`Tempo: ${song.tempo}`);
  if (song.timeSignature) meta.push(song.timeSignature);

  if (meta.length) {
    doc.fontSize(10).fillColor(C.midGray).font("Helvetica")
       .text(meta.join("   •   "), MARGIN, y, { width: INNER_W, align: "left" });
    y += 14;
  }

  doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
     .strokeColor(C.divider).lineWidth(1.5).stroke();
  y += 12;

  // ── Sections (ChordPro style) ────────────────────────────────────────────────
  const LINE_HEIGHT = 18;
  const CHORD_LINE_H = 14;
  const GAP_AFTER_SECTION = 8;

  for (const section of song.sections) {
    if (section.type === "note") {
      y = ensureSpace(doc, y, 22);
      doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
         .text(section.noteText ?? "", MARGIN, y, { width: INNER_W });
      y += 16;
      continue;
    }

    const bars = barsOf(section);
    if (!bars.length) continue;

    y = ensureSpace(doc, y, 40);

    // ── Section header ──────────────────────────────────────────────────
    doc.fontSize(11).fillColor(C.accent).font("Helvetica-Bold")
       .text(`[${section.name ?? ""}]`, MARGIN, y);
    y += LINE_HEIGHT + 2;

    // ── Chord progression line (ChordPro format: "Cm | Ab Bb | Cm | Ab Bb") ──
    const chordLine = bars
      .map((bar) => {
        const ch = barChords(bar);
        if (ch.length === 0) return "%";
        return ch.map((c) => c.symbol).join(" ");
      })
      .join(" | ");

    doc.fontSize(12).fillColor(C.black).font("Helvetica-Bold")
       .text(chordLine, MARGIN, y, { width: INNER_W });
    y += CHORD_LINE_H + GAP_AFTER_SECTION;
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (song.notes) {
    y = ensureSpace(doc, y, 30);
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Not: ${song.notes}`, MARGIN, y, { width: INNER_W });
  }

  footer(doc, "Songbook");
}

// ═══════════════════════════════════════════════════════════════════════════════
// STIL 3: Notation (Leadsheet with staff lines and chord symbols)
// ═══════════════════════════════════════════════════════════════════════════════

function renderNotation(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(22).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W, align: "center" });
  y += 28;

  // ── Meta line ────────────────────────────────────────────────────────────────
  const meta: string[] = [];
  if (song.artist) meta.push(song.artist);
  if (song.key) meta.push(`Tonart: ${song.key}`);
  if (song.tempo) meta.push(`♩ = ${song.tempo}`);
  if (song.timeSignature) meta.push(song.timeSignature);

  if (meta.length) {
    doc.fontSize(10).fillColor(C.midGray).font("Helvetica")
       .text(meta.join("   •   "), MARGIN, y, { width: INNER_W, align: "center" });
    y += 14;
  }
  y += 4;

  // ── Staff rendering ─────────────────────────────────────────────────────────
  const STAFF_LINES = 5;
  const STAFF_LINE_H = 6; // Spacing between lines
  const STAFF_H = STAFF_LINE_H * (STAFF_LINES - 1); // Total height = 24
  const CHORD_ZONE = 16; // Space above staff for chords
  const SYSTEM_H = CHORD_ZONE + STAFF_H + 18;
  const BARS_PER_SYSTEM = 4;
  const BAR_W = INNER_W / BARS_PER_SYSTEM;

  for (const section of song.sections) {
    if (section.type === "note") {
      y = ensureSpace(doc, y, 22);
      doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
         .text(section.noteText ?? "", MARGIN, y, { width: INNER_W });
      y += 16;
      continue;
    }

    const bars = barsOf(section);
    if (!bars.length) continue;

    y = ensureSpace(doc, y, SYSTEM_H + 10);

    // ── Section label ────────────────────────────────────────────────────
    doc.fontSize(11).fillColor(C.accent).font("Helvetica-Bold")
       .text(`[${section.name ?? ""}]`, MARGIN, y);
    y += 16;

    // ── Render bar systems (groups of BARS_PER_SYSTEM) ──────────────────
    const numSystems = Math.ceil(bars.length / BARS_PER_SYSTEM);
    for (let sys = 0; sys < numSystems; sys++) {
      y = ensureSpace(doc, y, SYSTEM_H);

      const systemBars = bars.slice(
        sys * BARS_PER_SYSTEM,
        sys * BARS_PER_SYSTEM + BARS_PER_SYSTEM
      );
      const staffY = y + CHORD_ZONE;

      // ── Draw staff lines ─────────────────────────────────────────────
      for (let line = 0; line < STAFF_LINES; line++) {
        const lineY = staffY + line * STAFF_LINE_H;
        doc.moveTo(MARGIN, lineY).lineTo(MARGIN + INNER_W, lineY)
           .strokeColor(C.staffLine).lineWidth(0.5).stroke();
      }

      // ── Draw barlines (left, middle between bars, right) ──────────────
      for (let bi = 0; bi <= systemBars.length; bi++) {
        const bx = MARGIN + bi * BAR_W;
        const isEnd = bi === 0 || bi === systemBars.length;
        const lw = isEnd ? 1.5 : 0.75;
        doc.moveTo(bx, staffY).lineTo(bx, staffY + STAFF_H)
           .strokeColor(C.black).lineWidth(lw).stroke();
      }

      // ── Final double bar (at end of section) ──────────────────────────
      if (sys === numSystems - 1) {
        const finalX = MARGIN + systemBars.length * BAR_W;
        doc.moveTo(finalX - 3, staffY).lineTo(finalX - 3, staffY + STAFF_H)
           .strokeColor(C.black).lineWidth(2.5).stroke();
      }

      // ── Time signature (first bar of first system only) ────────────────
      if (sys === 0 && song.timeSignature) {
        const [num, den] = (song.timeSignature || "4/4").split("/");
        doc.fontSize(12).fillColor(C.black).font("Helvetica-Bold");
        doc.text(num ?? "4", MARGIN + 4, staffY - 2, { lineBreak: false });
        doc.text(den ?? "4", MARGIN + 4, staffY + STAFF_H / 2 + 2, { lineBreak: false });
      }

      // ── Chord symbols above each bar ──────────────────────────────────
      systemBars.forEach((bar, bi) => {
        const bx = MARGIN + bi * BAR_W;
        const ch = barChords(bar);

        if (ch.length > 0) {
          const chordText = ch.map((c) => c.symbol).join("  ");
          doc.fontSize(10).fillColor(C.black).font("Helvetica-Bold")
             .text(chordText, bx + 3, y + 2, { width: BAR_W - 6, lineBreak: false });
        }
      });

      y += SYSTEM_H;
    }

    y += 4;
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (song.notes) {
    y = ensureSpace(doc, y, 26);
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Not: ${song.notes}`, MARGIN, y, { width: INNER_W });
  }

  footer(doc, "Leadsheet");
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function footer(doc: PDFKit.PDFDocument, style: string) {
  const y = PAGE.h - MARGIN + 6;
  doc.fontSize(7).fillColor(C.lightGray).font("Helvetica")
     .text(`DAJO 3.0  •  ${style}  •  ${new Date().toLocaleDateString("sv-SE")}`,
           MARGIN, y, { width: INNER_W, align: "center" });
}

/** Ensure enough vertical space; if not, add a new page */
function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > PAGE.h - MARGIN - 20) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}
