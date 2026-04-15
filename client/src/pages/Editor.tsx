import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown,
  ChevronUp, Music, Settings, Repeat, Download, Share2, Check,
  RotateCcw, RotateCw, FileImage, X, ZoomIn, ZoomOut, Eye, Loader2,
} from "lucide-react";
import { apiFetch, authFetch } from "../lib/api";
import { useUndoRedo } from "../hooks/useUndoRedo";
import ChordInput from "../components/ChordInput";
import { ExportDialog } from "../components/ExportDialog";
import { ChordPlayerButton, AudioSettings } from "../components/ChordPlayer";
import SongbookEditor from "../components/SongbookEditor";
import NotationEditor from "../components/NotationEditor";
import type { Song, Section, Bar, ChordEntry, NoteColor } from "../../shared/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newSection(name: string): Section {
  return {
    id: crypto.randomUUID(),
    name,
    type: "bars",
    bars: Array.from({ length: 8 }, () => ({ chords: [], lyrics: "" })),
  };
}

function newNoteSection(name = "Anteckning"): Section {
  return {
    id: crypto.randomUUID(),
    name,
    type: "note",
    bars: [],
    noteText: "",
    noteColor: "yellow",
  };
}

function newBar(): Bar {
  return { chords: [], lyrics: "" };
}

const KEYS = [
  "C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B",
  "Cm","Dbm","Dm","Ebm","Em","Fm","F#m","Gm","Abm","Am","Bbm","Bm",
];
const STYLES = ["Jazz","Bossa Nova","Samba","Pop","Rock","Funk","Blues","Ballad","Latin","Swing","Folk","Country","Soul","R&B","Gospel","Indie","Reggae","Schlager","Visa","Klassiskt",""];
const TIME_SIGS = ["4/4","3/4","6/8","2/4","5/4","12/8"];
const SECTION_NAMES = ["Intro","A","B","C","Vers","Refräng","Bridge","Outro","Coda","Interlude","Solo","Vamp"];

// Sticky-note color palette — Tailwind classes per NoteColor
const NOTE_COLOR_CLASSES: Record<NoteColor, { bg: string; border: string; text: string; dot: string }> = {
  default: { bg: "bg-gray-50",     border: "border-gray-300",    text: "text-gray-700",    dot: "bg-gray-400" },
  yellow:  { bg: "bg-yellow-50",   border: "border-yellow-300",  text: "text-yellow-900",  dot: "bg-yellow-400" },
  blue:    { bg: "bg-sky-50",      border: "border-sky-300",     text: "text-sky-900",     dot: "bg-sky-400" },
  green:   { bg: "bg-emerald-50",  border: "border-emerald-300", text: "text-emerald-900", dot: "bg-emerald-400" },
  red:     { bg: "bg-rose-50",     border: "border-rose-300",    text: "text-rose-900",    dot: "bg-rose-400" },
  purple:  { bg: "bg-purple-50",   border: "border-purple-300",  text: "text-purple-900",  dot: "bg-purple-400" },
  orange:  { bg: "bg-orange-50",   border: "border-orange-300",  text: "text-orange-900",  dot: "bg-orange-400" },
};
const NOTE_COLORS: NoteColor[] = ["default", "yellow", "blue", "green", "red", "purple", "orange"];

// ─── Bar cell component ───────────────────────────────────────────────────────

interface BarCellProps {
  bar: Bar;
  isActive: boolean;
  onClick: () => void;
  onUpdate: (bar: Bar) => void;
  onDeactivate: () => void;
}

function BarCell({ bar, isActive, onClick, onUpdate, onDeactivate }: BarCellProps) {
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");

  const startEdit = (idx: number, current: string) => {
    setEditingIdx(idx);
    setInputValue(current);
  };

  const commitEdit = (idx: number, value: string) => {
    const chords = [...bar.chords];
    if (value.trim()) {
      chords[idx] = { ...chords[idx], symbol: value.trim() };
    } else {
      chords.splice(idx, 1);
    }
    onUpdate({ ...bar, chords });
    setEditingIdx(null);
    setInputValue("");
  };

  const addChord = () => {
    const beat = ([1, 3, 2, 4] as const)[bar.chords.length] ?? 1;
    const newChords: ChordEntry[] = [...bar.chords, { symbol: "", beat }];
    onUpdate({ ...bar, chords: newChords });
    setEditingIdx(newChords.length - 1);
    setInputValue("");
  };

  const removeChord = (idx: number) => {
    const chords = bar.chords.filter((_, i) => i !== idx);
    onUpdate({ ...bar, chords });
  };

  // Display: sort chords by beat
  const sorted = [...bar.chords].sort((a, b) => a.beat - b.beat);

  return (
    <div
      onClick={!isActive ? onClick : undefined}
      className={`relative border-r border-b border-gray-200 min-h-[72px] transition-colors select-none
        ${isActive ? "bg-steel-50 ring-2 ring-inset ring-steel-400 z-10" : "hover:bg-gray-50 cursor-pointer"}`}
    >
      {/* Repeat indicator (placeholder for Fas 3) */}
      {bar.repeat && bar.repeat !== "none" && (
        <div className="absolute top-1 right-1 text-[9px] text-steel-300 font-mono">
          {bar.repeat === "start" ? "‖:" : bar.repeat === "end" ? ":‖" : "‖:‖"}
        </div>
      )}

      <div className="p-2 flex flex-col gap-1 min-h-[72px]">
        {sorted.length === 0 && !isActive && (
          <span className="text-gray-200 text-xs font-mono mt-2 ml-1">—</span>
        )}

        {/* Chord entries */}
        {sorted.map((entry, i) => {
          const origIdx = bar.chords.indexOf(entry);
          return (
            <div key={i} className="flex items-center gap-1 group/chord">
              {/* Beat label */}
              {sorted.length > 1 && (
                <span className="text-[9px] text-gray-300 w-3 shrink-0">{entry.beat}</span>
              )}

              {isActive && editingIdx === origIdx ? (
                <ChordInput
                  value={inputValue}
                  onChange={setInputValue}
                  onConfirm={(v) => commitEdit(origIdx, v)}
                  onCancel={() => { setEditingIdx(null); setInputValue(""); onDeactivate(); }}
                />
              ) : (
                <button
                  onClick={() => isActive && startEdit(origIdx, entry.symbol)}
                  className="text-sm font-mono font-semibold text-gray-800 hover:text-steel-700
                             text-left leading-tight truncate max-w-[90px]"
                >
                  {entry.symbol || <span className="text-gray-300">?</span>}
                </button>
              )}

              {isActive && editingIdx !== origIdx && (
                <button
                  onClick={() => removeChord(origIdx)}
                  className="opacity-0 group-hover/chord:opacity-100 text-red-300 hover:text-red-500
                             transition-opacity ml-auto"
                >
                  <Trash2 size={10} />
                </button>
              )}
            </div>
          );
        })}

        {/* Add chord button */}
        {isActive && bar.chords.length < 4 && editingIdx === null && (
          <button
            onClick={addChord}
            className="text-[10px] text-steel-300 hover:text-steel-600 mt-1 flex items-center gap-0.5 transition-colors"
          >
            <Plus size={10} /> ackord
          </button>
        )}
      </div>

      {/* Lyrics */}
      {(bar.lyrics || isActive) && (
        <div className="border-t border-dashed border-gray-200 px-2 py-1">
          <input
            value={bar.lyrics || ""}
            onChange={(e) => onUpdate({ ...bar, lyrics: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder={isActive ? "Text…" : ""}
            className="w-full text-[10px] text-gray-500 bg-transparent focus:outline-none
                       placeholder:text-gray-300 italic"
          />
        </div>
      )}

      {/* Repeat / Volta / Navigation toolbar (active bar only) */}
      {isActive && editingIdx === null && (
        <div className="border-t border-gray-200 px-1.5 py-1 flex flex-wrap gap-1 bg-gray-50">
          {/* Repeat toggles */}
          <select
            value={bar.repeat || "none"}
            onChange={(e) => onUpdate({ ...bar, repeat: e.target.value as Bar["repeat"] })}
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-600"
          >
            <option value="none">Rep: —</option>
            <option value="start">‖: start</option>
            <option value="end">:‖ slut</option>
            <option value="both">‖:‖ båda</option>
          </select>

          {/* Volta/ending */}
          <select
            value={bar.ending ?? ""}
            onChange={(e) => onUpdate({ ...bar, ending: e.target.value ? Number(e.target.value) : undefined })}
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-600"
          >
            <option value="">Volta: —</option>
            <option value="1">1.</option>
            <option value="2">2.</option>
            <option value="3">3.</option>
          </select>

          {/* Navigation */}
          <select
            value={bar.navigation ?? ""}
            onChange={(e) => onUpdate({ ...bar, navigation: e.target.value || undefined })}
            onClick={(e) => e.stopPropagation()}
            className="text-[9px] bg-white border border-gray-200 rounded px-1 py-0.5 text-gray-600"
          >
            <option value="">Nav: —</option>
            <option value="D.S. al Coda">D.S. al Coda</option>
            <option value="D.C. al Fine">D.C. al Fine</option>
            <option value="Fine">Fine</option>
            <option value="Coda">Coda</option>
            <option value="Segno">Segno</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ─── Section component ────────────────────────────────────────────────────────

interface SectionProps {
  section: Section;
  activeBarKey: string | null;
  setActiveBarKey: (k: string | null) => void;
  onChange: (s: Section) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

function SectionBlock({
  section, activeBarKey, setActiveBarKey,
  onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast,
}: SectionProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(section.name);

  const updateBar = (barIdx: number, bar: Bar) => {
    const bars = [...section.bars];
    bars[barIdx] = bar;
    onChange({ ...section, bars });
  };

  const addBar = () => {
    onChange({ ...section, bars: [...section.bars, newBar()] });
  };

  const removeBar = (idx: number) => {
    if (section.bars.length <= 1) return;
    const bars = section.bars.filter((_, i) => i !== idx);
    onChange({ ...section, bars });
  };

  // ─── Note section (sticky-note style) ───────────────────────────────────
  if (section.type === "note") {
    const color: NoteColor = section.noteColor ?? "yellow";
    const cls = NOTE_COLOR_CLASSES[color];
    return (
      <div className={`rounded-xl border ${cls.border} ${cls.bg} shadow-sm overflow-hidden mb-4`}>
        <div className={`flex items-center gap-2 px-4 py-2 border-b ${cls.border}`}>
          <div className={`w-2 h-2 rounded-full ${cls.dot} shrink-0`} />
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={() => { setEditingName(false); onChange({ ...section, name: nameVal }); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === "Escape") {
                  setEditingName(false);
                  onChange({ ...section, name: nameVal });
                }
              }}
              className={`text-sm font-semibold ${cls.text} bg-white/60 border ${cls.border} rounded px-2 py-0.5 focus:outline-none w-32`}
            />
          ) : (
            <button
              onClick={() => setEditingName(true)}
              className={`text-sm font-semibold ${cls.text} hover:underline`}
            >
              {section.name}
            </button>
          )}
          <span className={`text-xs ${cls.text} opacity-60`}>Anteckning</span>

          <div className="ml-auto flex items-center gap-1">
            {/* Color picker */}
            <div className="flex items-center gap-0.5 mr-2" title="Färg">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onChange({ ...section, noteColor: c })}
                  className={`w-4 h-4 rounded-full ${NOTE_COLOR_CLASSES[c].dot} border ${color === c ? "ring-2 ring-offset-1 ring-gray-600" : "border-white"}`}
                  title={c}
                />
              ))}
            </div>
            <button onClick={onMoveUp} disabled={isFirst}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors">
              <ChevronUp size={14} />
            </button>
            <button onClick={onMoveDown} disabled={isLast}
              className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition-colors">
              <ChevronDown size={14} />
            </button>
            <button onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors ml-1">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        <div className="p-4">
          <textarea
            value={section.noteText ?? ""}
            onChange={(e) => onChange({ ...section, noteText: e.target.value })}
            onClick={(e) => e.stopPropagation()}
            placeholder="Scenanvisning, påminnelse, anteckning till bandet…"
            rows={3}
            className={`w-full bg-transparent ${cls.text} placeholder:opacity-50 focus:outline-none resize-none text-sm`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="w-2 h-2 rounded-full bg-steel-400 shrink-0" />

        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { setEditingName(false); onChange({ ...section, name: nameVal }); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Escape") {
                setEditingName(false);
                onChange({ ...section, name: nameVal });
              }
            }}
            className="text-sm font-semibold text-gray-700 bg-white border border-steel-300
                       rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-steel-400 w-32"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold text-gray-700 hover:text-steel-600 transition-colors"
          >
            {section.name}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ChordPlayerButton
            chords={section.bars.flatMap((b) => b.chords.map((c) => c.symbol)).filter(Boolean)}
          />
          <span className="text-xs text-gray-400">{section.bars.length} takter</span>
          <button onClick={onMoveUp} disabled={isFirst}
            className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
            <ChevronUp size={14} />
          </button>
          <button onClick={onMoveDown} disabled={isLast}
            className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors">
            <ChevronDown size={14} />
          </button>
          <button onClick={onDelete}
            className="p-1 text-gray-300 hover:text-red-500 transition-colors ml-1">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Bar grid — 2 per rad på mobil, 4 på desktop */}
      <div className="border-t border-gray-100">
        {rows.map((row, rowIdx) => (
          <div key={rowIdx}
               className="grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100 first:border-t-0">
            {row.map(({ bar, idx }) => {
              const key = `${section.id}-${idx}`;
              return (
                <BarCell
                  key={key}
                  bar={bar}
                  isActive={activeBarKey === key}
                  onClick={() => setActiveBarKey(key)}
                  onUpdate={(b) => updateBar(idx, b)}
                  onDeactivate={() => setActiveBarKey(null)}
                />
              );
            })}
            {/* Fill empty cells in last row (desktop only) */}
            {row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (
              <div key={`empty-${i}`} className="hidden sm:block border-r border-b border-gray-100 min-h-[72px] bg-gray-50/50" />
            ))}
          </div>
        ))}
      </div>

      {/* Add bar */}
      <div className="flex gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
        <button onClick={addBar}
          className="text-xs text-gray-400 hover:text-steel-600 flex items-center gap-1 transition-colors">
          <Plus size={12} /> Lägg till takt
        </button>
        {section.bars.length > 1 && (
          <button onClick={() => removeBar(section.bars.length - 1)}
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 ml-auto transition-colors">
            <Trash2 size={12} /> Ta bort sista
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Editor page ─────────────────────────────────────────────────────────

export default function Editor() {
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/editor/:id");
  const id = params?.id;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [key, setKey] = useState("C");
  const [tempo, setTempo] = useState(120);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [style, setStyle] = useState("");
  const [preferredFormat, setPreferredFormat] = useState<"ireal" | "songbook" | "notation">("ireal");
  const { state: sections, setState: setSections, undo, redo, canUndo, canRedo } = useUndoRedo<Section[]>([]);
  const [notes, setNotes] = useState("");
  const [activeBarKey, setActiveBarKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [semitones, setSemitones] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [originalFile, setOriginalFile] = useState<{ data: string; type: string } | null>(null);
  const [originalZoom, setOriginalZoom] = useState(100);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewStyle, setPreviewStyle] = useState<"ireal" | "songbook" | "notation">("ireal");

  // Load song
  const { data: song, isLoading } = useQuery({
    queryKey: ["song", id],
    queryFn: () => apiFetch<Song>(`/api/songs/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (song) {
      setTitle(song.title);
      setArtist(song.artist || "");
      setKey(song.key || "C");
      setTempo(song.tempo || 120);
      setTimeSignature((song.timeSignature as string) || "4/4");
      setStyle(song.style || "");
      setPreferredFormat(((song as any).preferredFormat || "ireal") as "ireal" | "songbook" | "notation");
      setSections(
        Array.isArray(song.sections) && song.sections.length > 0
          ? song.sections
          : [newSection("A")]
      );
      setNotes(song.notes || "");
      setIsPublic(!!(song as any).isPublic);
      // Load original file for side-by-side view
      if ((song as any).originalFileData && (song as any).originalFileType) {
        setOriginalFile({
          data: (song as any).originalFileData,
          type: (song as any).originalFileType,
        });
      }
    }
  }, [song]);

  async function toggleShare() {
    const newPublic = !isPublic;
    setIsPublic(newPublic);
    try {
      await apiFetch(`/api/songs/${id}/share`, {
        method: "PUT",
        body: JSON.stringify({ isPublic: newPublic }),
      });
      if (newPublic) {
        const url = `${window.location.origin}/share/${id}`;
        navigator.clipboard.writeText(url);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 3000);
      }
    } catch {
      setIsPublic(!newPublic); // återställ vid fel
    }
  }

  // Load key info when key changes
  useEffect(() => {
    if (!key) return;
    authFetch(`/api/music/key/${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then(setKeyInfo)
      .catch(() => setKeyInfo(null));
  }, [key]);

  // Save
  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/api/songs/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, artist, key, tempo, timeSignature, style, sections, notes, preferredFormat }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  // Transpose
  const transposeMutation = useMutation({
    mutationFn: (s: number) =>
      apiFetch<Song>(`/api/songs/${id}/transpose`, {
        method: "PUT",
        body: JSON.stringify({ semitones: s }),
      }),
    onSuccess: (data) => {
      setKey(data.key);
      setSections(data.sections);
      setSemitones(0);
    },
  });

  // Keyboard shortcuts: Cmd+S, Cmd+Z (undo), Cmd+Shift+Z (redo)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveMutation.mutate();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      if (e.key === "Escape") setActiveBarKey(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveMutation, undo, redo]);

  // Preview export PDF
  const loadPreview = useCallback(async (exportStyle: "ireal" | "songbook" | "notation") => {
    if (!id) return;
    setPreviewLoading(true);
    setPreviewStyle(exportStyle);
    // Clean up old URL
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    try {
      // Save first to ensure latest data is exported
      await apiFetch(`/api/songs/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title, artist, key, tempo, timeSignature, style, sections, notes, preferredFormat }),
      });
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`/api/songs/${id}/export?style=${exportStyle}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error("Preview error:", err);
    } finally {
      setPreviewLoading(false);
    }
  }, [id, title, artist, key, tempo, timeSignature, style, sections, notes, preferredFormat, previewUrl]);

  // Clean up preview URL on unmount
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const updateSection = useCallback((idx: number, s: Section) => {
    setSections((prev) => { const n = [...prev]; n[idx] = s; return n; });
  }, []);

  const deleteSection = useCallback((idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const moveSection = useCallback((idx: number, dir: -1 | 1) => {
    setSections((prev) => {
      const n = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= n.length) return n;
      [n[idx], n[target]] = [n[target], n[idx]];
      return n;
    });
  }, []);

  const addSection = (name: string) => {
    setSections((prev) => [...prev, newSection(name)]);
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-ink-faint bg-cream">
      Laddar låt…
    </div>
  );

  return (
    <div className="min-h-screen bg-cream" onClick={() => setActiveBarKey(null)}>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-cream2 px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
        <button
          onClick={() => setLocation("/songs")}
          className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors shrink-0"
        >
          <ArrowLeft size={15} /> Låtar
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Music size={16} className="text-amber-500 shrink-0" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-display font-bold text-ink bg-transparent focus:outline-none truncate
                       border-b border-transparent focus:border-amber-400 transition-colors"
            placeholder="Låttitel"
          />
          <span className="hidden sm:inline text-ink-faint">·</span>
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="hidden sm:block text-sm text-ink-soft bg-transparent focus:outline-none truncate
                       border-b border-transparent focus:border-amber-400 transition-colors"
            placeholder="Artist"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Ångra (Cmd+Z)"
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink-soft disabled:opacity-30 transition-colors"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Gör om (Cmd+Shift+Z)"
            className="p-1.5 rounded-lg text-ink-faint hover:text-ink-soft disabled:opacity-30 transition-colors"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-amber-100 text-amber-700" : "text-ink-faint hover:text-ink-soft"}`}
          >
            <Settings size={16} />
          </button>
          {originalFile && (
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              title={showOriginal ? "Stäng original" : "Visa original bredvid editorn"}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border text-sm rounded-xl transition-colors ${
                showOriginal
                  ? "border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100"
                  : "border-cream2 text-ink-soft bg-white hover:bg-cream2"
              }`}
            >
              <FileImage size={14} />
              <span className="hidden sm:inline">{showOriginal ? "Original" : "Original"}</span>
            </button>
          )}
          <button
            onClick={toggleShare}
            title={isPublic ? "Offentlig — klicka för att stänga delning" : "Dela låten"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border text-sm rounded-xl transition-colors ${
              isPublic
                ? "border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                : "border-cream2 text-ink-soft bg-white hover:bg-cream2"
            }`}
          >
            {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{shareCopied ? "Kopierad!" : isPublic ? "Delad" : "Dela"}</span>
          </button>
          <button
            onClick={() => {
              if (showPreview) { setShowPreview(false); }
              else { setShowPreview(true); loadPreview(preferredFormat); }
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border text-sm rounded-xl transition-colors ${
              showPreview
                ? "border-lavender text-purple-700 bg-purple-50 hover:bg-purple-100"
                : "border-cream2 text-ink-soft bg-white hover:bg-cream2"
            }`}
          >
            {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
            <span className="hidden sm:inline">{showPreview ? "Stäng" : "Förhandsvisning"}</span>
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-amber-300 bg-white text-amber-700 text-sm
                       rounded-xl hover:bg-amber-50 transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportera</span>
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-steel-600 text-white text-sm font-semibold
                       rounded-xl hover:bg-steel-700 disabled:opacity-50 transition-colors shadow-soft"
          >
            <Save size={14} />
            {saved ? "Sparat!" : saveMutation.isPending ? "Sparar…" : "Spara"}
          </button>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border-b border-cream2 px-6 py-5" onClick={(e) => e.stopPropagation()}>
          <div className="max-w-4xl mx-auto flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Tonart</label>
              <select value={key} onChange={(e) => setKey(e.target.value)}
                className="px-3 py-2 border border-cream2 rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all">
                {KEYS.map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Tempo ♩</label>
              <input type="number" value={tempo} onChange={(e) => setTempo(Number(e.target.value))}
                min={40} max={320}
                className="w-20 px-3 py-2 border border-cream2 rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Taktart</label>
              <select value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)}
                className="px-3 py-2 border border-cream2 rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all">
                {TIME_SIGS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Stil</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)}
                className="px-3 py-2 border border-cream2 rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all">
                {STYLES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Format</label>
              <select value={preferredFormat} onChange={(e) => setPreferredFormat(e.target.value as "ireal" | "songbook" | "notation")}
                className="px-3 py-2 border border-cream2 rounded-xl text-sm bg-cream focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all">
                <option value="ireal">iReal Grid</option>
                <option value="songbook">Songbook</option>
                <option value="notation">Notation</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Transponera</label>
              <div className="flex items-center gap-2">
                <button onClick={() => transposeMutation.mutate(-1)}
                  className="px-3 py-2 border border-cream2 bg-white rounded-xl text-sm text-ink-soft hover:bg-cream2 transition-colors">♭ −1</button>
                <button onClick={() => transposeMutation.mutate(1)}
                  className="px-3 py-2 border border-cream2 bg-white rounded-xl text-sm text-ink-soft hover:bg-cream2 transition-colors">♯ +1</button>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Uppspelning</label>
              <AudioSettings />
            </div>
          </div>

          {/* Key info panel */}
          {keyInfo && (
            <div className="max-w-4xl mx-auto mt-4 p-3 bg-steel-50 rounded-lg border border-steel-100">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-xs text-steel-400 uppercase tracking-wide block mb-1">Diatoniska ackord</span>
                  <div className="flex flex-wrap gap-1">
                    {keyInfo.diatonicChords?.map((c: string) => (
                      <span key={c} className="px-2 py-0.5 bg-white border border-steel-200 rounded text-xs font-mono text-steel-700">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-steel-400 uppercase tracking-wide block mb-1">Relativ tonart</span>
                  <span className="font-mono text-steel-700">{keyInfo.relativeKey}</span>
                </div>
                <div>
                  <span className="text-xs text-steel-400 uppercase tracking-wide block mb-1">Skala</span>
                  <span className="font-mono text-steel-700 text-xs">{keyInfo.scale?.join(" – ")}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-steel-400 uppercase tracking-wide">Vanliga progressioner:</span>
                {keyInfo.commonProgressions?.map((p: any) => (
                  <span key={p.name} className="text-xs text-steel-600 bg-white border border-steel-200 rounded px-2 py-0.5">
                    {p.name}: <span className="font-mono">{p.chords.join(" – ")}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export preview panel */}
      {showPreview && (
        <div className="bg-white border-b border-gray-200 shadow-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 px-6 py-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">PDF Förhandsvisning</span>
            <div className="flex gap-1">
              {(["ireal", "songbook", "notation"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => loadPreview(s)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    previewStyle === s
                      ? "bg-purple-100 text-purple-700 font-medium"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {s === "ireal" ? "iReal" : s === "songbook" ? "Songbook" : "Notation"}
                </button>
              ))}
            </div>
            <button
              onClick={() => loadPreview(previewStyle)}
              className="text-xs text-purple-600 hover:text-purple-800 ml-auto"
            >
              ↻ Uppdatera
            </button>
            <button onClick={() => setShowPreview(false)} className="p-1 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>
          <div className="flex items-center justify-center bg-gray-100" style={{ height: "60vh" }}>
            {previewLoading ? (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <Loader2 size={32} className="animate-spin" />
                <span className="text-sm">Genererar PDF…</span>
              </div>
            ) : previewUrl ? (
              <embed
                src={previewUrl}
                type="application/pdf"
                className="w-full h-full"
              />
            ) : (
              <span className="text-sm text-gray-400">Kunde inte ladda förhandsvisning</span>
            )}
          </div>
        </div>
      )}

      {/* Main content — side-by-side when original is shown */}
      <div className={`${showOriginal ? "flex gap-0" : ""}`}>

        {/* Original file panel */}
        {showOriginal && originalFile && (
          <div className="w-1/2 border-r border-gray-200 bg-gray-100 sticky top-[57px] h-[calc(100vh-57px)] overflow-auto flex flex-col">
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-gray-200">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Original</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setOriginalZoom(z => Math.max(25, z - 25))} className="p-1 text-gray-400 hover:text-gray-700">
                  <ZoomOut size={14} />
                </button>
                <span className="text-xs text-gray-400 w-8 text-center">{originalZoom}%</span>
                <button onClick={() => setOriginalZoom(z => Math.min(300, z + 25))} className="p-1 text-gray-400 hover:text-gray-700">
                  <ZoomIn size={14} />
                </button>
                <button onClick={() => setShowOriginal(false)} className="p-1 text-gray-400 hover:text-gray-700 ml-1">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
              {originalFile.type === "application/pdf" ? (
                <embed
                  src={`data:application/pdf;base64,${originalFile.data}`}
                  type="application/pdf"
                  className="w-full h-full min-h-[600px]"
                />
              ) : (
                <img
                  src={`data:${originalFile.type};base64,${originalFile.data}`}
                  alt="Originaldokument"
                  style={{ width: `${originalZoom}%`, maxWidth: "none" }}
                  className="shadow-lg rounded"
                />
              )}
            </div>
          </div>
        )}

        <div className={`${showOriginal ? "w-1/2 overflow-auto h-[calc(100vh-57px)]" : "max-w-4xl mx-auto"} px-4 py-6`} onClick={(e) => e.stopPropagation()}>

        {/* Editor based on format */}
        {preferredFormat === "ireal" && (
          <>
            {/* iReal Grid - Sections */}
            {sections.map((section, idx) => (
              <SectionBlock
                key={section.id}
                section={section}
                activeBarKey={activeBarKey}
                setActiveBarKey={setActiveBarKey}
                onChange={(s) => updateSection(idx, s)}
                onDelete={() => deleteSection(idx)}
                onMoveUp={() => moveSection(idx, -1)}
                onMoveDown={() => moveSection(idx, 1)}
                isFirst={idx === 0}
                isLast={idx === sections.length - 1}
              />
            ))}

            {/* Add section */}
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs font-bold text-ink-soft self-center uppercase tracking-wider">Lägg till sektion:</span>
              {SECTION_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => addSection(name)}
                  className="px-3 py-1.5 text-xs border border-dashed border-cream2 rounded-xl
                             text-ink-soft bg-white hover:border-amber-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                >
                  + {name}
                </button>
              ))}
              <button
                onClick={() => setSections((prev) => [...prev, newNoteSection()])}
                className="px-3 py-1.5 text-xs border border-dashed border-butter rounded-xl
                           text-yellow-800 bg-white hover:bg-yellow-50 transition-colors"
                title="Färgad anteckning (scenanvisning, påminnelse)"
              >
                + Anteckning
              </button>
            </div>
          </>
        )}

        {preferredFormat === "songbook" && (
          <div className="bg-white rounded-2xl border border-cream2 shadow-soft p-6">
            <SongbookEditor
              sections={sections}
              onChange={(newSections) => setSections(newSections)}
            />
          </div>
        )}

        {preferredFormat === "notation" && (
          <div className="bg-white rounded-2xl border border-cream2 shadow-soft p-6">
            <NotationEditor
              sections={sections}
              onChange={(newSections) => setSections(newSections)}
              timeSignature={timeSignature}
            />
          </div>
        )}

        {/* Notes */}
        <div className="mt-7">
          <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-2">Anteckningar</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fria anteckningar om låten…"
            rows={3}
            className="w-full px-4 py-3 border border-cream2 rounded-2xl text-sm text-ink
                       bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none transition-all"
          />
        </div>

        <p className="text-center text-xs text-ink-faint mt-5">
          Klicka på en takt för att redigera · ⌘S för att spara · Escape för att avbryta
        </p>
      </div>
      </div>

      {showExport && id && (
        <ExportDialog
          songId={Number(id)}
          songTitle={title}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
