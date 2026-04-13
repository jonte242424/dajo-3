import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Save, Plus, Trash2, ChevronDown,
  ChevronUp, Music, Settings, Repeat, Download, Share2, Check,
  RotateCcw, RotateCw,
} from "lucide-react";
import { apiFetch, authFetch } from "../lib/api";
import { useUndoRedo } from "../hooks/useUndoRedo";
import ChordInput from "../components/ChordInput";
import { ExportDialog } from "../components/ExportDialog";
import { ChordPlayerButton, AudioSettings } from "../components/ChordPlayer";
import SongbookEditor from "../components/SongbookEditor";
import NotationEditor from "../components/NotationEditor";
import type { Song, Section, Bar, ChordEntry } from "../../shared/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newSection(name: string): Section {
  return {
    id: crypto.randomUUID(),
    name,
    type: "bars",
    bars: Array.from({ length: 8 }, () => ({ chords: [], lyrics: "" })),
  };
}

function newBar(): Bar {
  return { chords: [], lyrics: "" };
}

const KEYS = [
  "C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B",
  "Cm","Dbm","Dm","Ebm","Em","Fm","F#m","Gm","Abm","Am","Bbm","Bm",
];
const STYLES = ["Jazz","Bossa Nova","Samba","Pop","Rock","Funk","Blues","Ballad","Latin","Swing",""];
const TIME_SIGS = ["4/4","3/4","6/8","2/4","5/4","12/8"];
const SECTION_NAMES = ["Intro","A","B","C","Vers","Refräng","Bridge","Outro","Coda","Interlude","Solo","Vamp"];

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
        ${isActive ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400 z-10" : "hover:bg-gray-50 cursor-pointer"}`}
    >
      {/* Repeat indicator (placeholder for Fas 3) */}
      {bar.repeat && bar.repeat !== "none" && (
        <div className="absolute top-1 right-1 text-[9px] text-indigo-300 font-mono">
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
                  className="text-sm font-mono font-semibold text-gray-800 hover:text-indigo-700
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
            className="text-[10px] text-indigo-300 hover:text-indigo-600 mt-1 flex items-center gap-0.5 transition-colors"
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

  // Group bars into rows of 4
  const rows: { bar: Bar; idx: number }[][] = [];
  for (let i = 0; i < section.bars.length; i += 4) {
    rows.push(
      section.bars.slice(i, i + 4).map((bar, j) => ({ bar, idx: i + j }))
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      {/* Section header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200">
        <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />

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
            className="text-sm font-semibold text-gray-700 bg-white border border-indigo-300
                       rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-32"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors"
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
          className="text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors">
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
    <div className="min-h-screen flex items-center justify-center text-gray-400">
      Laddar låt…
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setActiveBarKey(null)}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
        <button
          onClick={() => setLocation("/songs")}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft size={15} /> Låtar
        </button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Music size={16} className="text-indigo-400 shrink-0" />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="font-semibold text-gray-800 bg-transparent focus:outline-none truncate
                       border-b border-transparent focus:border-indigo-300 transition-colors"
            placeholder="Låttitel"
          />
          <span className="hidden sm:inline text-gray-300">·</span>
          <input
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            className="hidden sm:block text-sm text-gray-400 bg-transparent focus:outline-none truncate
                       border-b border-transparent focus:border-indigo-300 transition-colors"
            placeholder="Artist"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Ångra (Cmd+Z)"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Gör om (Cmd+Shift+Z)"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
          >
            <RotateCw size={16} />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors ${showSettings ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:text-gray-700"}`}
          >
            <Settings size={16} />
          </button>
          <button
            onClick={toggleShare}
            title={isPublic ? "Offentlig — klicka för att stänga delning" : "Dela låten"}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border text-sm rounded-lg transition-colors ${
              isPublic
                ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100"
                : "border-gray-300 text-gray-500 hover:bg-gray-50"
            }`}
          >
            {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
            <span className="hidden sm:inline">{shareCopied ? "Kopierad!" : isPublic ? "Delad" : "Dela"}</span>
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-indigo-300 text-indigo-600 text-sm
                       rounded-lg hover:bg-indigo-50 transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Exportera</span>
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm
                       rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save size={14} />
            {saved ? "Sparat!" : saveMutation.isPending ? "Sparar…" : "Spara"}
          </button>
        </div>
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="bg-white border-b border-gray-100 px-6 py-4" onClick={(e) => e.stopPropagation()}>
          <div className="max-w-4xl mx-auto flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Tonart</label>
              <select value={key} onChange={(e) => setKey(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {KEYS.map((k) => <option key={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Tempo ♩</label>
              <input type="number" value={tempo} onChange={(e) => setTempo(Number(e.target.value))}
                min={40} max={320}
                className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Taktart</label>
              <select value={timeSignature} onChange={(e) => setTimeSignature(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {TIME_SIGS.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Stil</label>
              <select value={style} onChange={(e) => setStyle(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {STYLES.map((s) => <option key={s} value={s}>{s || "—"}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Format</label>
              <select value={preferredFormat} onChange={(e) => setPreferredFormat(e.target.value as "ireal" | "songbook" | "notation")}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="ireal">iReal Grid</option>
                <option value="songbook">Songbook</option>
                <option value="notation">Notation</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Transponera</label>
              <div className="flex items-center gap-2">
                <button onClick={() => transposeMutation.mutate(-1)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">♭ −1</button>
                <button onClick={() => transposeMutation.mutate(1)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors">♯ +1</button>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wide block mb-1">Uppspelning</label>
              <AudioSettings />
            </div>
          </div>

          {/* Key info panel */}
          {keyInfo && (
            <div className="max-w-4xl mx-auto mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <span className="text-xs text-indigo-400 uppercase tracking-wide block mb-1">Diatoniska ackord</span>
                  <div className="flex flex-wrap gap-1">
                    {keyInfo.diatonicChords?.map((c: string) => (
                      <span key={c} className="px-2 py-0.5 bg-white border border-indigo-200 rounded text-xs font-mono text-indigo-700">{c}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-indigo-400 uppercase tracking-wide block mb-1">Relativ tonart</span>
                  <span className="font-mono text-indigo-700">{keyInfo.relativeKey}</span>
                </div>
                <div>
                  <span className="text-xs text-indigo-400 uppercase tracking-wide block mb-1">Skala</span>
                  <span className="font-mono text-indigo-700 text-xs">{keyInfo.scale?.join(" – ")}</span>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-xs text-indigo-400 uppercase tracking-wide">Vanliga progressioner:</span>
                {keyInfo.commonProgressions?.map((p: any) => (
                  <span key={p.name} className="text-xs text-indigo-600 bg-white border border-indigo-200 rounded px-2 py-0.5">
                    {p.name}: <span className="font-mono">{p.chords.join(" – ")}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 py-6" onClick={(e) => e.stopPropagation()}>

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
              <span className="text-xs text-gray-400 self-center">Lägg till sektion:</span>
              {SECTION_NAMES.map((name) => (
                <button
                  key={name}
                  onClick={() => addSection(name)}
                  className="px-3 py-1 text-xs border border-dashed border-gray-300 rounded-lg
                             text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                >
                  + {name}
                </button>
              ))}
            </div>
          </>
        )}

        {preferredFormat === "songbook" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <SongbookEditor
              sections={sections}
              onChange={(newSections) => setSections(newSections)}
            />
          </div>
        )}

        {preferredFormat === "notation" && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <NotationEditor
              sections={sections}
              onChange={(newSections) => setSections(newSections)}
              timeSignature={timeSignature}
            />
          </div>
        )}

        {/* Notes */}
        <div className="mt-6">
          <label className="text-xs text-gray-400 uppercase tracking-wide block mb-2">Anteckningar</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Fria anteckningar om låten…"
            rows={3}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600
                       bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
          />
        </div>

        <p className="text-center text-xs text-gray-300 mt-4">
          Klicka på en takt för att redigera · ⌘S för att spara · Escape för att avbryta
        </p>
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
