/**
 * VexFlow Server-Side Renderer
 * Renders professional music notation to SVG, then embeds in PDFKit documents.
 *
 * Uses VexFlow 5.0 (MIT license) + JSDOM for server-side DOM.
 */

import { JSDOM } from "jsdom";
import {
  Renderer, Stave, StaveNote, Voice, Formatter,
  Beam, Dot, Accidental, Barline, Repetition,
  TextNote, StaveText,
} from "vexflow";
// @ts-ignore
import SVGtoPDFKit from "svg-to-pdfkit";

import type { Section, Bar, ChordEntry } from "../shared/types.js";

// ─── Types ───────────────────────────────────────────────────────────────────

interface NoteData {
  pitch: string;
  duration: string;
  octave: number;
  dotted?: boolean;
  rest?: boolean;
  tied?: boolean;
}

interface RenderOptions {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  barsPerSystem: number;
  systemSpacing: number;
  title?: string;
  artist?: string;
  key?: string;
  tempo?: number;
  timeSignature?: string;
}

const DEFAULT_OPTS: RenderOptions = {
  pageWidth: 595.28,   // A4
  pageHeight: 841.89,
  margin: 40,
  barsPerSystem: 4,
  systemSpacing: 90,
};

// ─── VexFlow pitch mapping ───────────────────────────────────────────────────

function toVexKey(pitch: string, octave: number): string {
  // VexFlow uses format: "c/4", "f#/5", "bb/3"
  const p = pitch.toLowerCase()
    .replace("db", "d@").replace("eb", "e@").replace("gb", "g@")
    .replace("ab", "a@").replace("bb", "b@")
    .replace("@", "b"); // VexFlow uses 'b' for flat
  return `${p}/${octave}`;
}

function toVexDuration(dur: string, dotted?: boolean, rest?: boolean): string {
  // Map our durations to VexFlow: w, h, q, 8, 16
  let vd = dur;
  if (dur === "w") vd = "w";
  else if (dur === "h") vd = "h";
  else if (dur === "q") vd = "q";
  else if (dur === "8") vd = "8";
  else if (dur === "16") vd = "16";
  if (rest) vd += "r";
  if (dotted) vd += "d";
  return vd;
}

function durationToBeats(dur: string, dotted?: boolean): number {
  const base: Record<string, number> = { w: 4, h: 2, q: 1, "8": 0.5, "16": 0.25 };
  let beats = base[dur] ?? 1;
  if (dotted) beats *= 1.5;
  return beats;
}

function toVexKeySignature(key: string): string {
  // Map key names to VexFlow key signatures
  const map: Record<string, string> = {
    "C": "C", "G": "G", "D": "D", "A": "A", "E": "E", "B": "B",
    "F#": "F#", "Gb": "Gb", "Db": "Db", "Ab": "Ab", "Eb": "Eb",
    "Bb": "Bb", "F": "F",
    "Am": "Am", "Em": "Em", "Bm": "Bm", "Dm": "Dm", "Gm": "Gm",
    "Cm": "Cm", "Fm": "Fm",
  };
  return map[key] || "C";
}

// ─── Create JSDOM environment ────────────────────────────────────────────────

function createDom() {
  const dom = new JSDOM("<!DOCTYPE html><html><body><div id=\"vf\"></div></body></html>");
  // Suppress canvas warnings
  const origConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("getContext")) return;
    origConsoleWarn(...args);
  };
  return { dom, container: dom.window.document.getElementById("vf")! };
}

// ─── Main notation renderer ─────────────────────────────────────────────────

export function renderNotationToSvg(
  sections: Section[],
  opts: Partial<RenderOptions> = {}
): string[] {
  const o = { ...DEFAULT_OPTS, ...opts };
  const innerW = o.pageWidth - o.margin * 2;
  const staveWidth = innerW;
  const svgPages: string[] = [];

  // Suppress JSDOM canvas warnings (VexFlow probes for canvas but uses SVG)
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = (...args: any[]) => {
    if (typeof args[0] === "string" && (args[0].includes("getContext") || args[0].includes("txtCanvas") || args[0].includes("HTMLCanvasElement"))) return;
    origWarn(...args);
  };
  console.error = (...args: any[]) => {
    if (typeof args[0] === "string" && args[0].includes("Not implemented")) return;
    origError(...args);
  };

  try {
    // Collect all bars across sections with metadata
    const allSystems: Array<{
      bars: Bar[];
      sectionName?: string;
      isFirstOfSection: boolean;
      keySignature?: string;
      timeSignature?: string;
    }> = [];

    for (const section of sections) {
      if (section.type === "note") continue;
      const bars = section.bars ?? [];
      for (let i = 0; i < bars.length; i += o.barsPerSystem) {
        const systemBars = bars.slice(i, i + o.barsPerSystem);
        allSystems.push({
          bars: systemBars,
          sectionName: i === 0 ? section.name : undefined,
          isFirstOfSection: i === 0,
          keySignature: o.key,
          timeSignature: i === 0 ? o.timeSignature : undefined,
        });
      }
    }

    // Render systems into pages
    let currentY = 0;
    let pageStartIdx = 0;
    const maxY = o.pageHeight - o.margin * 2 - 20; // Leave room for footer

    // Calculate how many systems fit per page
    const systemsPerPage: number[][] = [];
    let currentPage: number[] = [];

    for (let si = 0; si < allSystems.length; si++) {
      const systemH = o.systemSpacing + (allSystems[si].sectionName ? 20 : 0);
      if (currentY + systemH > maxY && currentPage.length > 0) {
        systemsPerPage.push(currentPage);
        currentPage = [si];
        currentY = systemH;
      } else {
        currentPage.push(si);
        currentY += systemH;
      }
    }
    if (currentPage.length > 0) systemsPerPage.push(currentPage);

    // Render each page
    for (const pageSystemIndices of systemsPerPage) {
      const pageHeight = o.pageHeight - o.margin * 2;
      const totalHeight = pageSystemIndices.length * o.systemSpacing + 40;

      const { dom, container } = createDom();
      (global as any).document = dom.window.document;

      const renderer = new Renderer(container as unknown as HTMLDivElement, Renderer.Backends.SVG);
      renderer.resize(innerW + 10, Math.max(totalHeight, 200));
      const context = renderer.getContext();

      let y = 0;

      for (const si of pageSystemIndices) {
        const sys = allSystems[si];

        // Section label
        if (sys.sectionName) {
          // Draw section name above the staff
          context.setFont("Arial", 11, "bold");
          context.fillText(sys.sectionName, 0, y + 10);
          y += 18;
        }

        // Calculate stave widths
        const numBars = sys.bars.length;
        const barWidth = staveWidth / numBars;

        // Create staves for each bar
        for (let bi = 0; bi < numBars; bi++) {
          const bar = sys.bars[bi];
          const x = bi * barWidth;
          const w = barWidth;

          const stave = new Stave(x, y, w);

          // First bar of first system: add clef, key sig, time sig
          if (si === 0 && bi === 0) {
            stave.addClef("treble");
            if (sys.keySignature) {
              stave.addKeySignature(toVexKeySignature(sys.keySignature));
            }
          }

          // Time signature on first bar of each section
          if (bi === 0 && sys.timeSignature) {
            stave.addTimeSignature(sys.timeSignature.replace("/", "/"));
          }

          // Repeat markers
          const repeat = (bar as any).repeat as string | undefined;
          if (repeat === "start" || repeat === "both") {
            stave.setBegBarType(Barline.type.REPEAT_BEGIN);
          }
          if (repeat === "end" || repeat === "both") {
            stave.setEndBarType(Barline.type.REPEAT_END);
          }

          // Double bar at end of last bar
          if (bi === numBars - 1 && !repeat?.includes("end")) {
            if (si === allSystems.length - 1) {
              stave.setEndBarType(Barline.type.END);
            }
          }

          // Volta brackets (1st/2nd endings)
          const ending = (bar as any).ending as number | undefined;
          if (ending) {
            // VoltaType: NONE=1, BEGIN=2, MID=3, END=4, BEGIN_END=5
            stave.setVoltaType(5, `${ending}.`, -5); // BEGIN_END = full bracket
          }

          stave.setContext(context).draw();

          // Draw chord symbols above
          const chords = bar.chords ?? [];
          if (chords.length > 0) {
            const chordText = chords.map(c => c.symbol).join("  ");
            context.setFont("Arial", 10, "bold");
            context.fillText(chordText, x + (si === 0 && bi === 0 ? 50 : 8), y - 2);
          }

          // Draw notes or slash notation
          const melodyNotes = (bar as any).melodyNotes as NoteData[] | undefined;

          if (melodyNotes && melodyNotes.length > 0) {
            // Real notes
            const vexNotes = melodyNotes.map(n => {
              const keys = n.rest ? ["b/4"] : [toVexKey(n.pitch, n.octave)];
              const dur = toVexDuration(n.duration, n.dotted, n.rest);
              const note = new StaveNote({ keys, duration: dur });

              // Add accidentals
              if (!n.rest) {
                if (n.pitch.includes("#")) note.addModifier(new Accidental("#"), 0);
                else if (n.pitch.includes("b") && n.pitch.length > 1 && n.pitch !== "B") {
                  note.addModifier(new Accidental("b"), 0);
                }
              }

              // Add dot
              if (n.dotted) Dot.buildAndAttach([note]);

              return note;
            });

            // Calculate total beats
            const totalBeats = melodyNotes.reduce((sum, n) => sum + durationToBeats(n.duration, n.dotted), 0);
            const [num] = (sys.timeSignature || "4/4").split("/").map(Number);
            const beatsPerBar = num || 4;

            try {
              const voice = new Voice({ numBeats: beatsPerBar, beatValue: 4 })
                .setMode(Voice.Mode.SOFT);
              voice.addTickables(vexNotes);

              new Formatter().joinVoices([voice]).format([voice], w - (si === 0 && bi === 0 ? 70 : 20));
              voice.draw(context, stave);

              // Add beams for eighth notes and shorter
              const beamableNotes = vexNotes.filter(n => {
                const dur = n.getDuration();
                return dur === "8" || dur === "16";
              });
              if (beamableNotes.length >= 2) {
                try {
                  const beams = Beam.generateBeams(beamableNotes as any);
                  beams.forEach(b => b.setContext(context).draw());
                } catch { /* beam generation can fail, that's ok */ }
              }
            } catch (e) {
              // Fallback: draw slash notation if voice fails
              drawSlashNotation(context, stave, x, y, w, beatsPerBar);
            }
          } else {
            // Slash notation (no melody notes)
            const [num] = (sys.timeSignature || "4/4").split("/").map(Number);
            drawSlashNotation(context, stave, x, y, w, num || 4);
          }

          // Lyrics below
          if (bar.lyrics) {
            context.setFont("Arial", 8, "normal");
            const textY = y + 75;
            context.fillText(bar.lyrics.substring(0, 60), x + 8, textY);
          }
        }

        y += o.systemSpacing;
      }

      // Extract SVG
      const svgEl = container.querySelector("svg");
      if (svgEl) {
        svgPages.push(svgEl.outerHTML);
      }

      delete (global as any).document;
    }
  } finally {
    console.warn = origWarn;
    console.error = origError;
  }

  return svgPages;
}

function drawSlashNotation(
  context: any, stave: any,
  x: number, y: number, w: number, beats: number
) {
  // Draw diamond-shaped slash noteheads
  const startX = x + 30;
  const spacing = (w - 40) / beats;
  const midY = y + 34; // Middle of staff

  for (let i = 0; i < beats; i++) {
    const nx = startX + i * spacing;

    // Diamond shape
    context.beginPath();
    context.moveTo(nx, midY - 5);
    context.lineTo(nx + 4, midY);
    context.lineTo(nx, midY + 5);
    context.lineTo(nx - 4, midY);
    context.closePath();
    context.fill();

    // Stem
    context.beginPath();
    context.moveTo(nx + 4, midY);
    context.lineTo(nx + 4, midY - 22);
    context.stroke();
  }
}

// ─── Embed SVG into PDFKit document ─────────────────────────────────────────

export function embedSvgInPdf(
  doc: PDFKit.PDFDocument,
  svgString: string,
  x: number,
  y: number,
  options?: { width?: number; height?: number }
): void {
  try {
    SVGtoPDFKit(doc, svgString, x, y, {
      width: options?.width,
      height: options?.height,
      preserveAspectRatio: "xMinYMin meet",
      fontCallback: () => "Helvetica", // Fallback font for PDF
    });
  } catch (err) {
    console.error("[VexFlow] SVG→PDF embedding failed:", err);
  }
}
