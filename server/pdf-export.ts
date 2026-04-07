/**
 * DAJO 3.0 — PDF Export
 * Tre stilar: ireal (ackordschema-grid), songbook (text+ackord), notation (staff-look)
 */

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

// ─── Colors & fonts ───────────────────────────────────────────────────────────

const C = {
  black:     "#111111",
  darkGray:  "#333333",
  midGray:   "#666666",
  lightGray: "#AAAAAA",
  border:    "#CCCCCC",
  barBg:     "#FAFAFA",
  sectionBg: "#1A2A4A",
  sectionFg: "#FFFFFF",
  accent:    "#2563EB",
  staffLine: "#888888",
};

const PAGE = { w: 595.28, h: 841.89 }; // A4
const MARGIN = 40;
const INNER_W = PAGE.w - MARGIN * 2;

// ─── Helper: chord symbols list from a bar ────────────────────────────────────

function barChords(bar: Bar): ChordEntry[] {
  return bar.chords ?? [];
}

function chordsText(bar: Bar): string {
  const ch = barChords(bar);
  if (ch.length === 0) return "%"; // % = repeat
  return ch.map((c) => c.symbol).join("  ");
}

// ─── Helper: split sections into bars-only groups ────────────────────────────

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
// STIL 1: iReal Grid
// ═══════════════════════════════════════════════════════════════════════════════

function renderIreal(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(22).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W, align: "center" });
  y += 30;

  if (song.artist) {
    doc.fontSize(13).fillColor(C.midGray).font("Helvetica")
       .text(song.artist, MARGIN, y, { width: INNER_W, align: "center" });
    y += 20;
  }

  // ── Meta bar ────────────────────────────────────────────────────────────────
  const metaParts: string[] = [];
  if (song.key)           metaParts.push(`Tonart: ${song.key}`);
  if (song.tempo)         metaParts.push(`♩ = ${song.tempo}`);
  if (song.timeSignature) metaParts.push(song.timeSignature);
  if (song.style)         metaParts.push(song.style);

  if (metaParts.length) {
    y += 4;
    doc.fontSize(10).fillColor(C.midGray).font("Helvetica")
       .text(metaParts.join("   •   "), MARGIN, y, { width: INNER_W, align: "center" });
    y += 16;
  }

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
     .strokeColor(C.border).lineWidth(1).stroke();
  y += 12;

  // ── Bars per row & bar dimensions ───────────────────────────────────────────
  const COLS = 4;
  const BAR_W = (INNER_W - (COLS - 1) * 6) / COLS;
  const BAR_H = 52;
  const BAR_GAP_X = 6;
  const BAR_GAP_Y = 6;

  for (const section of song.sections) {
    if (section.type === "note") {
      // Render note section
      y = ensureSpace(doc, y, 30);
      doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
         .text(section.noteText ?? "", MARGIN, y, { width: INNER_W });
      y += doc.currentLineHeight() + 8;
      continue;
    }

    const bars = barsOf(section);
    if (!bars.length) continue;

    y = ensureSpace(doc, y, 24 + BAR_H);

    // Section label pill
    const labelW = Math.min(doc.widthOfString(section.name ?? "A", { fontSize: 11 }) + 20, 120);
    doc.roundedRect(MARGIN, y, labelW, 18, 3)
       .fill(C.sectionBg);
    doc.fontSize(11).fillColor(C.sectionFg).font("Helvetica-Bold")
       .text(section.name ?? "", MARGIN, y + 3, { width: labelW, align: "center" });
    y += 24;

    // Bar grid
    let col = 0;
    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const x = MARGIN + col * (BAR_W + BAR_GAP_X);

      y = col === 0 && i > 0 ? ensureSpace(doc, y, BAR_H + BAR_GAP_Y) : y;

      // Bar background + border
      doc.roundedRect(x, y, BAR_W, BAR_H, 4)
         .fill(C.barBg)
         .roundedRect(x, y, BAR_W, BAR_H, 4)
         .strokeColor(C.border).lineWidth(0.75).stroke();

      // Chords
      const ch = barChords(bar);
      if (ch.length === 0) {
        // Repeat sign %
        doc.fontSize(18).fillColor(C.lightGray).font("Helvetica")
           .text("%", x, y + BAR_H / 2 - 10, { width: BAR_W, align: "center" });
      } else if (ch.length === 1) {
        doc.fontSize(16).fillColor(C.black).font("Helvetica-Bold")
           .text(ch[0].symbol, x + 6, y + BAR_H / 2 - 10, { width: BAR_W - 12, align: "center" });
      } else {
        // Two chords split at half
        const half = BAR_W / 2;
        doc.fontSize(13).fillColor(C.black).font("Helvetica-Bold");
        doc.text(ch[0].symbol, x + 4, y + BAR_H / 2 - 9, { width: half - 6, align: "center" });
        doc.text(ch[1].symbol, x + half + 2, y + BAR_H / 2 - 9, { width: half - 6, align: "center" });
        // Divider
        doc.moveTo(x + half, y + 8).lineTo(x + half, y + BAR_H - 8)
           .strokeColor(C.border).lineWidth(0.5).stroke();
      }

      // Bar number (small)
      doc.fontSize(7).fillColor(C.lightGray).font("Helvetica")
         .text(String(i + 1), x + 3, y + 3, { width: 20 });

      // Lyrics
      if (bar.lyrics) {
        doc.fontSize(7).fillColor(C.midGray).font("Helvetica-Oblique")
           .text(bar.lyrics, x + 4, y + BAR_H - 12, { width: BAR_W - 8, ellipsis: true });
      }

      col++;
      if (col >= COLS) {
        col = 0;
        y += BAR_H + BAR_GAP_Y;
      }
    }

    if (col > 0) y += BAR_H + BAR_GAP_Y;
    y += 10;
  }

  // Notes
  if (song.notes) {
    y = ensureSpace(doc, y, 40);
    y += 8;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
       .strokeColor(C.border).lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Not: ${song.notes}`, MARGIN, y, { width: INNER_W });
  }

  footer(doc, "iReal Grid");
}

// ═══════════════════════════════════════════════════════════════════════════════
// STIL 2: Songbook (ackord ovanför text, som Real Book)
// ═══════════════════════════════════════════════════════════════════════════════

function renderSongbook(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(26).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W });
  y += 34;

  const sub: string[] = [];
  if (song.artist)         sub.push(song.artist);
  if (song.key)            sub.push(`Tonart: ${song.key}`);
  if (song.tempo)          sub.push(`♩ = ${song.tempo}`);
  if (song.timeSignature)  sub.push(song.timeSignature);
  if (song.style)          sub.push(song.style);

  if (sub.length) {
    doc.fontSize(11).fillColor(C.midGray).font("Helvetica")
       .text(sub.join("   •   "), MARGIN, y, { width: INNER_W });
    y += 18;
  }

  doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
     .strokeColor(C.black).lineWidth(1.5).stroke();
  y += 16;

  // ── Sections ────────────────────────────────────────────────────────────────
  const BARS_PER_ROW = 4;
  const CHORD_H = 16; // height for chord line
  const LYRIC_H = 14; // height for lyric line
  const ROW_PAD = 6;

  for (const section of song.sections) {
    if (section.type === "note") {
      y = ensureSpace(doc, y, 24);
      doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
         .text(section.noteText ?? "", MARGIN, y, { width: INNER_W });
      y += 18;
      continue;
    }

    const bars = barsOf(section);
    if (!bars.length) continue;

    y = ensureSpace(doc, y, 60);

    // Section label
    doc.fontSize(12).fillColor(C.accent).font("Helvetica-Bold")
       .text(`[${section.name ?? ""}]`, MARGIN, y);
    y += 18;

    // Rows of BARS_PER_ROW
    const hasLyrics = bars.some((b) => b.lyrics);
    const rowH = CHORD_H + (hasLyrics ? LYRIC_H : 0) + ROW_PAD;
    const barW = INNER_W / BARS_PER_ROW;

    for (let row = 0; row * BARS_PER_ROW < bars.length; row++) {
      y = ensureSpace(doc, y, rowH + 4);

      const rowBars = bars.slice(row * BARS_PER_ROW, row * BARS_PER_ROW + BARS_PER_ROW);

      // Draw bar lines
      for (let ci = 0; ci <= rowBars.length; ci++) {
        const lx = MARGIN + ci * barW;
        const lw = ci === 0 || ci === rowBars.length ? 1.5 : 0.5;
        doc.moveTo(lx, y).lineTo(lx, y + CHORD_H + (hasLyrics ? LYRIC_H : 0))
           .strokeColor(C.darkGray).lineWidth(lw).stroke();
      }

      // Chords & lyrics per bar
      rowBars.forEach((bar, ci) => {
        const bx = MARGIN + ci * barW;
        const ch = barChords(bar);
        let chText = "";
        if (ch.length === 0) chText = "%";
        else if (ch.length === 1) chText = ch[0].symbol;
        else chText = ch.map((c) => `${c.symbol}`).join("  ");

        doc.fontSize(13).fillColor(C.black).font("Helvetica-Bold")
           .text(chText, bx + 4, y + 1, { width: barW - 8, lineBreak: false });

        if (hasLyrics && bar.lyrics) {
          doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
             .text(bar.lyrics, bx + 4, y + CHORD_H, { width: barW - 8, lineBreak: false });
        }
      });

      y += rowH;
    }

    y += 12;
  }

  if (song.notes) {
    y = ensureSpace(doc, y, 30);
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Not: ${song.notes}`, MARGIN, y, { width: INNER_W });
  }

  footer(doc, "Songbook");
}

// ═══════════════════════════════════════════════════════════════════════════════
// STIL 3: Notation (staff-look med ackordsymboler)
// ═══════════════════════════════════════════════════════════════════════════════

function renderNotation(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(20).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W, align: "center" });
  y += 26;

  const sub: string[] = [];
  if (song.artist)         sub.push(song.artist);
  if (song.key)            sub.push(`Tonart: ${song.key}`);
  if (song.tempo)          sub.push(`♩ = ${song.tempo}`);
  if (song.timeSignature)  sub.push(song.timeSignature);

  if (sub.length) {
    doc.fontSize(10).fillColor(C.midGray).font("Helvetica")
       .text(sub.join("   •   "), MARGIN, y, { width: INNER_W, align: "center" });
    y += 16;
  }
  y += 4;

  // ── Staff rendering ──────────────────────────────────────────────────────────
  const STAFF_LINES = 5;
  const STAFF_LINE_H = 6;   // spacing between staff lines
  const STAFF_H = STAFF_LINE_H * (STAFF_LINES - 1); // 24
  const CHORD_ZONE = 18;    // space above staff for chord symbols
  const LYRIC_ZONE = 14;    // space below staff for lyrics
  const SYSTEM_H = CHORD_ZONE + STAFF_H + LYRIC_ZONE + 14;

  const BARS_PER_SYSTEM = 4;
  const barW = INNER_W / BARS_PER_SYSTEM;

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

    // Section label
    doc.fontSize(11).fillColor(C.accent).font("Helvetica-Bold")
       .text(section.name ?? "", MARGIN, y);
    y += 14;

    const numSystems = Math.ceil(bars.length / BARS_PER_SYSTEM);

    for (let sys = 0; sys < numSystems; sys++) {
      y = ensureSpace(doc, y, SYSTEM_H);

      const systemBars = bars.slice(sys * BARS_PER_SYSTEM, sys * BARS_PER_SYSTEM + BARS_PER_SYSTEM);
      const staffY = y + CHORD_ZONE;

      // Draw 5 staff lines
      for (let l = 0; l < STAFF_LINES; l++) {
        const ly = staffY + l * STAFF_LINE_H;
        doc.moveTo(MARGIN, ly).lineTo(MARGIN + INNER_W, ly)
           .strokeColor(C.staffLine).lineWidth(0.5).stroke();
      }

      // Bar lines
      for (let bi = 0; bi <= systemBars.length; bi++) {
        const bx = MARGIN + bi * barW;
        const lw = bi === 0 || bi === systemBars.length ? 1.5 : 0.75;
        doc.moveTo(bx, staffY).lineTo(bx, staffY + STAFF_H)
           .strokeColor(C.black).lineWidth(lw).stroke();
      }

      // Double bar at end of last system of section
      if (sys === numSystems - 1) {
        const ex = MARGIN + systemBars.length * barW;
        doc.moveTo(ex - 2, staffY).lineTo(ex - 2, staffY + STAFF_H)
           .strokeColor(C.black).lineWidth(2.5).stroke();
      }

      // Time signature on first bar of first system
      if (sys === 0 && song.timeSignature) {
        const [num, den] = (song.timeSignature || "4/4").split("/");
        doc.fontSize(12).fillColor(C.black).font("Helvetica-Bold");
        doc.text(num ?? "4", MARGIN + 4, staffY - 1, { lineBreak: false });
        doc.text(den ?? "4", MARGIN + 4, staffY + STAFF_H / 2 + 1, { lineBreak: false });
      }

      // Chords & lyrics per bar
      systemBars.forEach((bar, bi) => {
        const bx = MARGIN + bi * barW;
        const ch = barChords(bar);
        let chText = ch.length === 0 ? "%" : ch.map((c) => c.symbol).join("  ");

        // Chord symbol above staff
        doc.fontSize(11).fillColor(C.black).font("Helvetica-Bold")
           .text(chText, bx + 5, y + 3, { width: barW - 10, lineBreak: false });

        // Lyrics below staff
        if (bar.lyrics) {
          doc.fontSize(8).fillColor(C.midGray).font("Helvetica-Oblique")
             .text(bar.lyrics, bx + 4, staffY + STAFF_H + 4, {
               width: barW - 8, lineBreak: false,
             });
        }
      });

      y += SYSTEM_H;
    }

    y += 8;
  }

  if (song.notes) {
    y = ensureSpace(doc, y, 26);
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Not: ${song.notes}`, MARGIN, y, { width: INNER_W });
  }

  footer(doc, "Notation");
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function footer(doc: PDFKit.PDFDocument, style: string) {
  const y = PAGE.h - MARGIN + 8;
  doc.fontSize(7).fillColor(C.lightGray).font("Helvetica")
     .text(`DAJO 3.0  •  ${style}  •  ${new Date().toLocaleDateString("sv-SE")}`,
           MARGIN, y, { width: INNER_W, align: "center" });
}

/** Make sure we have enough vertical space; if not, add a new page */
function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed > PAGE.h - MARGIN - 20) {
    doc.addPage();
    return MARGIN;
  }
  return y;
}
