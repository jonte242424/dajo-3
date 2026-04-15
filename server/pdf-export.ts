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
// @ts-ignore
import SVGtoPDFKit from "svg-to-pdfkit";
import type { Section, Bar, ChordEntry } from "../shared/types.js";
import { renderNotationToSvg } from "./vexflow-renderer.js";

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
  if (section.type === "note") return [];
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

  // ── Header (iReal Pro style — title centered, large) ───────────────────────
  doc.fontSize(24).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W, align: "center" });
  y += 32;

  if (song.artist) {
    doc.fontSize(12).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(song.artist, MARGIN, y, { width: INNER_W, align: "center" });
    y += 18;
  }

  // ── Meta line ────────────────────────────────────────────────────────────────
  const metaParts: string[] = [];
  if (song.key) metaParts.push(`Key: ${song.key}`);
  if (song.tempo) metaParts.push(`Tempo: ${song.tempo}`);
  if (song.timeSignature) metaParts.push(song.timeSignature);
  if (song.style) metaParts.push(song.style);

  if (metaParts.length) {
    doc.fontSize(9).fillColor(C.lightGray).font("Helvetica")
       .text(metaParts.join("  |  "), MARGIN, y, { width: INNER_W, align: "center" });
    y += 14;
  }

  y += 6;

  // ── Grid settings (iReal Pro: 4 cells per line) ─────────────────────────────
  const COLS = 4;
  const BAR_W = INNER_W / COLS;
  const BAR_H = 52;
  const ROW_GAP = 0; // Tight rows like iReal Pro

  // ── Render sections ──────────────────────────────────────────────────────────
  const sectionList = song.sections;
  for (let si = 0; si < sectionList.length; si++) {
    const section = sectionList[si];
    const isLastSection = si === sectionList.length - 1;

    if (section.type === "note") {
      y = ensureSpace(doc, y, 30);
      doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
         .text(section.noteText ?? "", MARGIN, y, { width: INNER_W });
      y += 20;
      continue;
    }

    const bars = barsOf(section);
    if (!bars.length) continue;

    y = ensureSpace(doc, y, 24 + BAR_H);

    // ── Rehearsal mark (iReal Pro style: bold letter in box) ────────────
    const sName = section.name ?? "A";
    const labelW = Math.max(doc.fontSize(10).font("Helvetica-Bold").widthOfString(sName) + 12, 28);
    doc.rect(MARGIN, y, labelW, 18).strokeColor(C.black).lineWidth(1.5).stroke();
    doc.fontSize(10).fillColor(C.black).font("Helvetica-Bold")
       .text(sName, MARGIN, y + 3, { width: labelW, align: "center" });
    y += 24;

    // ── Render bar rows ──────────────────────────────────────────────────
    let rowStart = 0;
    while (rowStart < bars.length) {
      const rowEnd = Math.min(rowStart + COLS, bars.length);
      const rowBars = bars.slice(rowStart, rowEnd);
      const isLastRow = rowEnd >= bars.length;

      y = ensureSpace(doc, y, BAR_H + 4);

      // ── Row outline (thick outer borders like iReal Pro) ────────────
      const rowW = rowBars.length * BAR_W;

      // Top border (thin for internal rows, thicker for first row)
      doc.moveTo(MARGIN, y).lineTo(MARGIN + rowW, y)
         .strokeColor(C.black).lineWidth(rowStart === 0 ? 1.5 : 0.5).stroke();

      // Bottom border
      const bottomLw = (isLastRow && isLastSection) ? 3 : (isLastRow ? 1.5 : 0.5);
      doc.moveTo(MARGIN, y + BAR_H).lineTo(MARGIN + rowW, y + BAR_H)
         .strokeColor(C.black).lineWidth(bottomLw).stroke();

      // Double final bar at end of piece
      if (isLastRow && isLastSection) {
        doc.moveTo(MARGIN + rowW, y).lineTo(MARGIN + rowW, y + BAR_H)
           .strokeColor(C.black).lineWidth(3).stroke();
        doc.moveTo(MARGIN + rowW - 5, y).lineTo(MARGIN + rowW - 5, y + BAR_H)
           .strokeColor(C.black).lineWidth(1).stroke();
      }

      for (let col = 0; col < rowBars.length; col++) {
        const bar = rowBars[col];
        const bx = MARGIN + col * BAR_W;

        // ── Vertical barlines ─────────────────────────────────────────
        doc.moveTo(bx, y).lineTo(bx, y + BAR_H)
           .strokeColor(C.black).lineWidth(col === 0 ? 1.5 : 0.75).stroke();
        // Right barline (only for non-last bar; last bar handled by row outline)
        if (col === rowBars.length - 1 && !(isLastRow && isLastSection)) {
          doc.moveTo(bx + BAR_W, y).lineTo(bx + BAR_W, y + BAR_H)
             .strokeColor(C.black).lineWidth(1.5).stroke();
        }

        // ── Chord rendering ───────────────────────────────────────────
        const ch = barChords(bar);
        if (ch.length === 0) {
          // Slash repeat (%) — like iReal Pro
          doc.fontSize(24).fillColor(C.lightGray).font("Helvetica")
             .text("%", bx, y + BAR_H / 2 - 14, { width: BAR_W, align: "center" });
        } else if (ch.length === 1) {
          renderChordSplit(doc, ch[0].symbol, bx + BAR_W / 2, y + BAR_H / 2 - 8);
        } else if (ch.length === 2) {
          // Two chords per bar: beats 1 and 3 (iReal standard)
          renderChordSplit(doc, ch[0].symbol, bx + BAR_W * 0.28, y + BAR_H / 2 - 8);
          // Thin diagonal divider
          doc.moveTo(bx + BAR_W / 2, y + 4).lineTo(bx + BAR_W / 2, y + BAR_H - 4)
             .strokeColor(C.border).lineWidth(0.5).stroke();
          renderChordSplit(doc, ch[1].symbol, bx + BAR_W * 0.72, y + BAR_H / 2 - 8);
        } else {
          // 3-4 chords: grid subdivisions
          const parts = ch.slice(0, 4);
          const cellW = BAR_W / parts.length;
          parts.forEach((c, i) => {
            if (i > 0) {
              doc.moveTo(bx + i * cellW, y + 6).lineTo(bx + i * cellW, y + BAR_H - 6)
                 .strokeColor(C.border).lineWidth(0.3).stroke();
            }
            doc.fontSize(10).fillColor(C.black).font("Helvetica-Bold")
               .text(c.symbol, bx + i * cellW + 2, y + BAR_H / 2 - 6,
                     { width: cellW - 4, align: "center", lineBreak: false });
          });
        }

        // ── Navigation marker (D.S., Coda, Fine — bottom-right) ──────
        if (bar.navigation) {
          doc.fontSize(7).fillColor(C.accent).font("Helvetica-BoldOblique")
             .text(bar.navigation, bx + 2, y + BAR_H - 10, { width: BAR_W - 4, align: "right", lineBreak: false });
        }

        // ── Repeat markers (thick bar + dots, iReal Pro style) ────────
        const repeat = bar.repeat as string | undefined;
        if (repeat === "start" || repeat === "both") {
          doc.moveTo(bx + 1, y).lineTo(bx + 1, y + BAR_H)
             .strokeColor(C.black).lineWidth(3).stroke();
          doc.moveTo(bx + 5, y).lineTo(bx + 5, y + BAR_H)
             .strokeColor(C.black).lineWidth(0.75).stroke();
          doc.circle(bx + 10, y + BAR_H * 0.38, 2).fill(C.black);
          doc.circle(bx + 10, y + BAR_H * 0.62, 2).fill(C.black);
        }
        if (repeat === "end" || repeat === "both") {
          const ex = bx + BAR_W;
          doc.moveTo(ex - 1, y).lineTo(ex - 1, y + BAR_H)
             .strokeColor(C.black).lineWidth(3).stroke();
          doc.moveTo(ex - 5, y).lineTo(ex - 5, y + BAR_H)
             .strokeColor(C.black).lineWidth(0.75).stroke();
          doc.circle(ex - 10, y + BAR_H * 0.38, 2).fill(C.black);
          doc.circle(ex - 10, y + BAR_H * 0.62, 2).fill(C.black);
        }

        // ── Volta bracket ─────────────────────────────────────────────
        const ending = bar.ending as number | undefined;
        if (ending) {
          doc.moveTo(bx, y - 1).lineTo(bx, y - 8).lineTo(bx + BAR_W * 0.5, y - 8)
             .strokeColor(C.black).lineWidth(1).stroke();
          doc.fontSize(8).fillColor(C.black).font("Helvetica-Bold")
             .text(`${ending}.`, bx + 4, y - 14, { lineBreak: false });
        }
      }

      y += BAR_H + ROW_GAP;
      rowStart = rowEnd;
    }

    y += 8;
  }

  // ── Notes section ────────────────────────────────────────────────────────────
  if (song.notes) {
    y = ensureSpace(doc, y, 40);
    y += 4;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
       .strokeColor(C.divider).lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Notes: ${song.notes}`, MARGIN, y, { width: INNER_W });
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
// STIL 2: Songbook (ChordPro standard — chords positioned above lyrics)
// ═══════════════════════════════════════════════════════════════════════════════

function renderSongbook(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.fontSize(24).fillColor(C.black).font("Helvetica-Bold")
     .text(song.title, MARGIN, y, { width: INNER_W });
  y += 30;

  if (song.artist) {
    doc.fontSize(13).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(song.artist, MARGIN, y, { width: INNER_W });
    y += 18;
  }

  // ── Meta line ────────────────────────────────────────────────────────────────
  const meta: string[] = [];
  if (song.key) meta.push(`Key: ${song.key}`);
  if (song.tempo) meta.push(`Tempo: ${song.tempo}`);
  if (song.timeSignature) meta.push(song.timeSignature);
  if (song.style) meta.push(song.style);

  if (meta.length) {
    doc.fontSize(9).fillColor(C.lightGray).font("Helvetica")
       .text(meta.join("  |  "), MARGIN, y, { width: INNER_W });
    y += 12;
  }

  doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
     .strokeColor(C.divider).lineWidth(1).stroke();
  y += 14;

  // ── Constants ────────────────────────────────────────────────────────────────
  const CHORD_SIZE = 10;
  const LYRICS_SIZE = 11;
  const CHORD_LINE_H = 14;
  const LYRICS_LINE_H = 16;
  const SECTION_GAP = 12;
  const X = MARGIN + 6;

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

    // ── Section header (bold, with bracket) ────────────────────────────
    doc.fontSize(11).fillColor(C.accent).font("Helvetica-Bold")
       .text(`[${section.name ?? ""}]`, MARGIN, y);
    y += 18;

    // ── Group bars into logical lines ──────────────────────────────────
    // Each bar becomes a chord-line + lyrics-line pair (ChordPro style)
    // Group 2 bars per visual line when bars have short lyrics
    const BARS_PER_LINE = 2;
    for (let bi = 0; bi < bars.length; bi += BARS_PER_LINE) {
      const lineBars = bars.slice(bi, bi + BARS_PER_LINE);

      y = ensureSpace(doc, y, CHORD_LINE_H + LYRICS_LINE_H + 4);

      // Repeat start indicator
      const firstBar = lineBars[0];
      const lastBar = lineBars[lineBars.length - 1];
      if (firstBar?.repeat === "start" || firstBar?.repeat === "both") {
        doc.fontSize(8).fillColor(C.midGray).font("Helvetica-Bold")
           .text("||:", X, y, { lineBreak: false });
        y += 10;
      }
      // Volta/ending bracket
      if (firstBar?.ending) {
        doc.fontSize(8).fillColor(C.black).font("Helvetica-Bold")
           .text(`[${firstBar.ending}.`, X, y, { lineBreak: false });
        y += 10;
      }

      // Build chord line: position each chord at estimated text position
      const hasChords = lineBars.some(b => barChords(b).length > 0);
      const hasLyrics = lineBars.some(b => (b.lyrics?.trim() ?? "").length > 0);

      if (hasChords) {
        doc.fontSize(CHORD_SIZE).font("Helvetica-Bold").fillColor(C.accent);
        let xCursor = X;

        for (const bar of lineBars) {
          const ch = barChords(bar);
          const lyrics = bar.lyrics?.trim() ?? "";
          const barTextWidth = lyrics
            ? doc.fontSize(LYRICS_SIZE).font("Helvetica").widthOfString(lyrics) + 12
            : INNER_W / BARS_PER_LINE;

          if (ch.length > 0) {
            doc.fontSize(CHORD_SIZE).font("Helvetica-Bold").fillColor(C.accent);
            // Position chords proportionally based on beat
            for (const c of ch) {
              const beatFraction = (c.beat - 1) / 4;
              const chordXPos = xCursor + beatFraction * barTextWidth;
              doc.text(c.symbol, chordXPos, y, { lineBreak: false });
            }
          }

          xCursor += barTextWidth;
        }

        y += CHORD_LINE_H;
      }

      // Lyrics line
      if (hasLyrics) {
        doc.fontSize(LYRICS_SIZE).font("Helvetica").fillColor(C.darkGray);
        const lyricsText = lineBars.map(b => b.lyrics?.trim() ?? "").filter(Boolean).join("   ");
        if (lyricsText) {
          doc.text(lyricsText, X, y, { width: INNER_W - 12 });
          y += LYRICS_LINE_H;
        }
      } else if (!hasChords) {
        y += 4;
      }

      // Repeat end / navigation indicators
      if (lastBar?.repeat === "end" || lastBar?.repeat === "both") {
        doc.fontSize(8).fillColor(C.midGray).font("Helvetica-Bold")
           .text(":||", X + INNER_W - 30, y - LYRICS_LINE_H, { lineBreak: false });
      }
      if (lastBar?.navigation) {
        doc.fontSize(8).fillColor(C.accent).font("Helvetica-Oblique")
           .text(lastBar.navigation, X, y, { lineBreak: false });
        y += 10;
      }
    }

    y += SECTION_GAP;
  }

  // ── Notes ────────────────────────────────────────────────────────────────────
  if (song.notes) {
    y = ensureSpace(doc, y, 30);
    y += 4;
    doc.moveTo(MARGIN, y).lineTo(MARGIN + INNER_W, y)
       .strokeColor(C.divider).lineWidth(0.5).stroke();
    y += 8;
    doc.fontSize(9).fillColor(C.midGray).font("Helvetica-Oblique")
       .text(`Not: ${song.notes}`, MARGIN, y, { width: INNER_W });
  }

  footer(doc, "Songbook (ChordPro)");
}

// ═══════════════════════════════════════════════════════════════════════════════
// STIL 3: Notation (Leadsheet with VexFlow professional rendering)
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
  if (song.tempo) meta.push(`Tempo: ${song.tempo}`);
  if (song.timeSignature) meta.push(song.timeSignature);

  if (meta.length) {
    doc.fontSize(10).fillColor(C.midGray).font("Helvetica")
       .text(meta.join("   •   "), MARGIN, y, { width: INNER_W, align: "center" });
    y += 14;
  }
  y += 4;

  // ── VexFlow SVG rendering ─────────────────────────────────────────────────
  try {
    const svgPages = renderNotationToSvg(song.sections, {
      pageWidth: PAGE.w,
      pageHeight: PAGE.h,
      margin: MARGIN,
      barsPerSystem: 4,
      systemSpacing: 90,
      title: song.title,
      artist: song.artist,
      key: song.key,
      tempo: song.tempo,
      timeSignature: song.timeSignature,
    });

    if (svgPages.length > 0) {
      // Embed first SVG page on current page below header
      SVGtoPDFKit(doc, svgPages[0], MARGIN, y, {
        width: INNER_W,
        preserveAspectRatio: "xMinYMin meet",
        fontCallback: () => "Helvetica",
      });

      // Additional pages
      for (let i = 1; i < svgPages.length; i++) {
        doc.addPage();
        SVGtoPDFKit(doc, svgPages[i], MARGIN, MARGIN, {
          width: INNER_W,
          preserveAspectRatio: "xMinYMin meet",
          fontCallback: () => "Helvetica",
        });
      }
    } else {
      // Fallback: no SVG generated, render basic notation
      renderNotationFallback(doc, song, y);
    }
  } catch (err) {
    console.error("[PDF] VexFlow rendering failed, using fallback:", err);
    renderNotationFallback(doc, song, y);
  }

  footer(doc, "Leadsheet");
}

/** Fallback: simple PDFKit-based notation when VexFlow fails */
function renderNotationFallback(doc: PDFKit.PDFDocument, song: SongForExport, startY: number) {
  let y = startY;
  const STAFF_LINES = 5;
  const STAFF_LINE_H = 6;
  const STAFF_H = STAFF_LINE_H * (STAFF_LINES - 1);
  const CHORD_ZONE = 16;
  const LYRICS_ZONE = 14;
  const SYSTEM_H = CHORD_ZONE + STAFF_H + LYRICS_ZONE + 12;
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
    doc.fontSize(11).fillColor(C.accent).font("Helvetica-Bold")
       .text(`[${section.name ?? ""}]`, MARGIN, y);
    y += 16;

    const numSystems = Math.ceil(bars.length / BARS_PER_SYSTEM);
    for (let sys = 0; sys < numSystems; sys++) {
      y = ensureSpace(doc, y, SYSTEM_H);
      const systemBars = bars.slice(sys * BARS_PER_SYSTEM, sys * BARS_PER_SYSTEM + BARS_PER_SYSTEM);
      const staffY = y + CHORD_ZONE;

      // Staff lines
      for (let line = 0; line < STAFF_LINES; line++) {
        const lineY = staffY + line * STAFF_LINE_H;
        doc.moveTo(MARGIN, lineY).lineTo(MARGIN + INNER_W, lineY)
           .strokeColor(C.staffLine).lineWidth(0.5).stroke();
      }

      // Barlines
      for (let bi = 0; bi <= systemBars.length; bi++) {
        const bx = MARGIN + bi * BAR_W;
        doc.moveTo(bx, staffY).lineTo(bx, staffY + STAFF_H)
           .strokeColor(C.black).lineWidth(bi === 0 || bi === systemBars.length ? 1.5 : 0.75).stroke();
      }

      // Slash notation in each bar
      systemBars.forEach((bar, bi) => {
        const bx = MARGIN + bi * BAR_W;
        const ch = barChords(bar);
        if (ch.length > 0) {
          doc.fontSize(10).fillColor(C.black).font("Helvetica-Bold")
             .text(ch.map(c => c.symbol).join("  "), bx + 3, y + 2, { width: BAR_W - 6, lineBreak: false });
        }
        // Slash diamonds
        const slashSpacing = (BAR_W - 16) / 4;
        for (let si = 0; si < 4; si++) {
          const sx = bx + 8 + si * slashSpacing + slashSpacing / 2;
          const slashY = staffY + STAFF_H / 2;
          doc.path(`M ${sx - 3} ${slashY} L ${sx} ${slashY - 5} L ${sx + 3} ${slashY} L ${sx} ${slashY + 5} Z`).fill(C.black);
          doc.moveTo(sx + 3, slashY).lineTo(sx + 3, slashY - 18).strokeColor(C.black).lineWidth(1).stroke();
        }
      });

      y += SYSTEM_H;
    }
    y += 4;
  }
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

// ─── Setlist PDF Export ────────────────────────────────────────────────────────

export interface SetlistForExport {
  name: string;
  description?: string;
  songs: SongForExport[];
}

export function generateSetlistPdf(
  setlist: SetlistForExport,
  exportStyle: ExportStyle = "ireal"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      info: {
        Title: setlist.name,
        Author: "DAJO",
        Creator: "DAJO 3.0",
      },
    });

    doc.on("data", (chunk: Buffer) => buffers.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(buffers)));
    doc.on("error", reject);

    // Spellista-framsida
    doc.fontSize(32).fillColor(C.black).font("Helvetica-Bold")
       .text(setlist.name, MARGIN, 100, { width: INNER_W, align: "center" });

    let y = 150;
    if (setlist.description) {
      doc.fontSize(11).fillColor(C.darkGray).font("Helvetica-Oblique")
         .text(setlist.description, MARGIN, y, { width: INNER_W, align: "center" });
      y += 40;
    }

    doc.fontSize(10).fillColor(C.midGray).font("Helvetica")
       .text(`${setlist.songs.length} låtar`, MARGIN, y, { width: INNER_W, align: "center" });

    // Låt-index
    y += 60;
    doc.fontSize(11).fillColor(C.black).font("Helvetica-Bold").text("Innehål:", MARGIN, y);
    y += 15;

    setlist.songs.forEach((song, idx) => {
      y = ensureSpace(doc, y, 15);
      doc.fontSize(10).fillColor(C.darkGray).font("Helvetica")
         .text(`${idx + 1}. ${song.title}${song.artist ? ` — ${song.artist}` : ""}`, MARGIN + 10, y);
      y += 12;
    });

    // Exportera varje låt med sidbrytning
    setlist.songs.forEach((song, idx) => {
      doc.addPage();

      // Sidnummer och låtnummer
      doc.fontSize(8).fillColor(C.lightGray).font("Helvetica")
         .text(`Låt ${idx + 1} av ${setlist.songs.length}`, MARGIN, MARGIN - 10);

      // Spela upp låtarna med vald stil
      switch (exportStyle) {
        case "songbook":
          renderSongbookSingle(doc, song);
          break;
        case "notation":
          renderNotationSingle(doc, song);
          break;
        case "ireal":
        default:
          renderIrealSingle(doc, song);
          break;
      }

      footer(doc, `${exportStyle} — Spellista: ${setlist.name}`);
    });

    doc.end();
  });
}

/** Render single song for ireal style (used in setlist) */
function renderIrealSingle(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  // Title
  doc.fontSize(20).fillColor(C.black).font("Helvetica-Bold").text(song.title, MARGIN, y);
  y += 25;

  // Meta-line
  const metaParts = [song.artist, song.key && `Tonart: ${song.key}`,
                    song.tempo && `Tempo: ${song.tempo}`, song.timeSignature].filter(Boolean);
  doc.fontSize(9).fillColor(C.midGray).font("Helvetica")
     .text(metaParts.join(" • "), MARGIN, y);
  y += 20;

  // Sections
  song.sections.forEach((section) => {
    y = ensureSpace(doc, y, 15);

    // Section badge
    doc.fillColor(C.sectionBg).rect(MARGIN, y, 40, 14).fill();
    doc.fontSize(9).fillColor(C.sectionFg).font("Helvetica-Bold")
       .text(section.name, MARGIN + 2, y + 2);
    y += 20;

    // Bars in rows of 4
    const barRows: Bar[][] = [];
    for (let i = 0; i < section.bars.length; i += 4) {
      barRows.push(section.bars.slice(i, i + 4));
    }

    barRows.forEach((row) => {
      y = ensureSpace(doc, y, 40);
      const boxW = INNER_W / 4;

      row.forEach((bar, idx) => {
        const x = MARGIN + idx * boxW;

        // Box
        doc.strokeColor(C.border).lineWidth(0.5)
           .rect(x, y, boxW, 35).stroke();

        // Chords
        const chords = bar.chords.sort((a, b) => a.beat - b.beat);
        const textY = y + 5;

        if (chords.length === 0) {
          doc.fontSize(10).fillColor(C.lightGray).font("Helvetica")
             .text("—", x + 3, textY);
        } else {
          chords.forEach((chord, ci) => {
            const { root, quality } = splitChord(chord.symbol);
            doc.fontSize(12).fillColor(C.black).font("Helvetica-Bold")
               .text(root, x + 3, textY + ci * 12);
            if (quality) {
              doc.fontSize(8).fillColor(C.darkGray).font("Helvetica")
                 .text(quality, x + 15, textY + ci * 12 + 4);
            }
          });
        }
      });

      y += 40;
    });

    y += 5;
  });
}

/** Render single song for songbook style (used in setlist) */
function renderSongbookSingle(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  doc.fontSize(18).fillColor(C.black).font("Helvetica-Bold").text(song.title, MARGIN, y);
  y += 20;

  const metaParts = [song.artist, song.key && `Tonart: ${song.key}`,
                    song.tempo && `Tempo: ${song.tempo}`, song.timeSignature].filter(Boolean);
  doc.fontSize(8).fillColor(C.midGray).font("Helvetica")
     .text(metaParts.join(" • "), MARGIN, y);
  y += 15;

  song.sections.forEach((section) => {
    y = ensureSpace(doc, y, 12);
    doc.fontSize(10).fillColor(C.black).font("Helvetica-Bold").text(`[${section.name}]`, MARGIN, y);
    y += 12;

    section.bars.forEach((bar) => {
      if (bar.chords.length > 0) {
        const chordText = bar.chords.map(c => c.symbol).join(" | ");
        y = ensureSpace(doc, y, 10);
        doc.fontSize(9).fillColor(C.darkGray).font("Courier").text(chordText, MARGIN + 10, y);
        y += 10;
      }
      if (bar.lyrics) {
        y = ensureSpace(doc, y, 8);
        doc.fontSize(8).fillColor(C.black).font("Helvetica").text(bar.lyrics, MARGIN + 10, y);
        y += 8;
      }
    });
    y += 8;
  });
}

/** Render single song for notation style (used in setlist) */
function renderNotationSingle(doc: PDFKit.PDFDocument, song: SongForExport) {
  let y = MARGIN;

  doc.fontSize(18).fillColor(C.black).font("Helvetica-Bold").text(song.title, MARGIN, y);
  y += 20;

  const metaParts = [song.artist, song.key && `Tonart: ${song.key}`,
                    song.tempo && `Tempo: ${song.tempo}`, song.timeSignature].filter(Boolean);
  doc.fontSize(8).fillColor(C.midGray).font("Helvetica")
     .text(metaParts.join(" • "), MARGIN, y);
  y += 20;

  song.sections.forEach((section) => {
    y = ensureSpace(doc, y, 60);

    // Section label
    doc.fontSize(9).fillColor(C.darkGray).font("Helvetica-Bold").text(`[${section.name}]`, MARGIN, y - 10);

    const staffY = y;
    const staffSpacing = 5;

    // Draw 5 staff lines
    for (let i = 0; i < 5; i++) {
      const lineY = staffY + i * staffSpacing;
      doc.strokeColor(C.staffLine).lineWidth(0.5)
         .moveTo(MARGIN, lineY).lineTo(MARGIN + INNER_W, lineY).stroke();
    }

    // Bar info
    let barX = MARGIN;
    section.bars.forEach((bar, idx) => {
      if (barX + 30 > MARGIN + INNER_W) {
        y += 30;
        barX = MARGIN;
      }

      // Chord above bar
      const chordText = bar.chords.map(c => c.symbol).join("/");
      doc.fontSize(8).fillColor(C.black).font("Helvetica")
         .text(chordText || "—", barX, staffY - 15, { width: 30, align: "center" });

      barX += 30;
    });

    y += 50;
  });
}
