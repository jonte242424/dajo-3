import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import type {
  Section,
  Bar,
  MelodyNote,
  NoteDuration,
  ChordEntry,
  TimeSignature,
} from "../../../shared/types";
import ChordAutocomplete from "./ChordAutocomplete";

interface NotationEditorProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
  timeSignature?: TimeSignature | string;
}

const PITCHES = ["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"];
const DURATIONS: Array<{ value: NoteDuration; label: string }> = [
  { value: "w", label: "Whole" },
  { value: "h", label: "Half" },
  { value: "q", label: "Quarter" },
  { value: "8", label: "Eighth" },
  { value: "16", label: "Sixteenth" },
];
const OCTAVES = [3, 4, 5, 6];

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `sec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function NotationEditor({
  sections,
  onChange,
  timeSignature = "4/4",
}: NotationEditorProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);
  const [editingNote, setEditingNote] = useState<{
    sectionIdx: number;
    barIdx: number;
    noteIdx: number;
  } | null>(null);

  const addSection = () => {
    const newSection: Section = {
      id: makeId(),
      name: `Section ${sections.length + 1}`,
      type: "staff",
      bars: [{ chords: [], lyrics: "", melodyNotes: [] }],
    };
    onChange([...sections, newSection]);
  };

  const updateSection = (idx: number, section: Section) => {
    const updated = [...sections];
    updated[idx] = section;
    onChange(updated);
  };

  const deleteSection = (idx: number) => {
    onChange(sections.filter((_, i) => i !== idx));
  };

  const addBar = (sectionIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].bars.push({ chords: [], lyrics: "", melodyNotes: [] });
    onChange(updated);
  };

  const deleteBar = (sectionIdx: number, barIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].bars = updated[sectionIdx].bars.filter((_, i) => i !== barIdx);
    onChange(updated);
  };

  const updateBar = (sectionIdx: number, barIdx: number, bar: Bar) => {
    const updated = [...sections];
    updated[sectionIdx].bars[barIdx] = bar;
    onChange(updated);
  };

  const addNote = (sectionIdx: number, barIdx: number) => {
    const updated = [...sections];
    const bar = updated[sectionIdx].bars[barIdx];
    if (!bar.melodyNotes) bar.melodyNotes = [];
    bar.melodyNotes.push({ pitch: "C", duration: "q" as NoteDuration, octave: 4 });
    onChange(updated);
  };

  const updateNote = (sectionIdx: number, barIdx: number, noteIdx: number, note: MelodyNote) => {
    const updated = [...sections];
    updated[sectionIdx].bars[barIdx].melodyNotes![noteIdx] = note;
    onChange(updated);
  };

  const removeNote = (sectionIdx: number, barIdx: number, noteIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].bars[barIdx].melodyNotes = updated[sectionIdx].bars[barIdx].melodyNotes!.filter(
      (_, i) => i !== noteIdx
    );
    onChange(updated);
  };

  const addChord = (sectionIdx: number, barIdx: number, symbol: string) => {
    const updated = [...sections];
    const bar = updated[sectionIdx].bars[barIdx];
    // Clamp beat position to valid range 1-4
    const beatMap: Array<ChordEntry["beat"]> = [1, 2, 3, 4];
    const beat: ChordEntry["beat"] = beatMap[bar.chords.length] ?? 1;
    bar.chords.push({ symbol, beat });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Notation (Staff Music)</h3>
        <button
          onClick={addSection}
          className="flex items-center gap-2 px-3 py-1 bg-steel-100 text-steel-700 rounded hover:bg-steel-200 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Section
        </button>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded border-2 border-dashed">
          <p className="text-gray-600 mb-4">No sections yet</p>
          <button
            onClick={addSection}
            className="inline-flex items-center gap-2 px-4 py-2 bg-steel-600 text-white rounded hover:bg-steel-700"
          >
            <Plus className="w-4 h-4" />
            Create First Section
          </button>
        </div>
      ) : (
        sections.map((section, sectionIdx) => (
          <div key={sectionIdx} className="border rounded-lg overflow-hidden">
            {/* Section Header */}
            <div
              className="bg-gray-100 px-4 py-3 cursor-pointer flex items-center justify-between hover:bg-gray-200 transition"
              onClick={() => setExpandedSection(expandedSection === sectionIdx ? null : sectionIdx)}
            >
              <div className="flex items-center gap-3">
                <ChevronDown
                  className={`w-4 h-4 transition ${expandedSection === sectionIdx ? "rotate-180" : ""}`}
                />
                <input
                  type="text"
                  value={section.name}
                  onChange={(e) => {
                    const updated = { ...section, name: e.target.value };
                    updateSection(sectionIdx, updated);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold bg-transparent border-b border-gray-300 px-2 py-1"
                />
                <span className="text-sm text-gray-600">({section.bars.length} measures)</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteSection(sectionIdx);
                }}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Section Content */}
            {expandedSection === sectionIdx && (
              <div className="p-4 space-y-4 bg-white">
                {section.bars.map((bar, barIdx) => (
                  <div key={barIdx} className="border rounded p-4 bg-gray-50 space-y-3">
                    {/* Measure Number and Time Signature */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold text-gray-700">
                        Measure {barIdx + 1}
                        <span className="ml-2 text-gray-600 font-normal text-xs">({timeSignature})</span>
                      </div>
                    </div>

                    {/* Chords */}
                    <div>
                      <div className="text-xs text-gray-500 font-bold mb-2">Chord Symbols:</div>
                      <div className="flex flex-wrap gap-2">
                        {bar.chords.map((chord, chordIdx) => (
                          <div key={chordIdx} className="bg-white px-2 py-1 rounded border text-sm">
                            {chord.symbol}
                          </div>
                        ))}
                        <PendingChordInput
                          onAdd={(symbol) => addChord(sectionIdx, barIdx, symbol)}
                        />
                      </div>
                    </div>

                    {/* Melody Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs text-gray-500 font-bold">Melody Notes:</div>
                        <button
                          onClick={() => addNote(sectionIdx, barIdx)}
                          className="text-xs px-2 py-1 bg-steel-100 text-steel-700 rounded hover:bg-steel-200"
                        >
                          + Add Note
                        </button>
                      </div>

                      {bar.melodyNotes && bar.melodyNotes.length > 0 ? (
                        <div className="space-y-2">
                          {bar.melodyNotes.map((note, noteIdx) => (
                            <div key={noteIdx} className="bg-white rounded p-2 border flex items-end gap-2 text-sm">
                              <div>
                                <label className="text-xs text-gray-600 block mb-1">Pitch</label>
                                <select
                                  value={note.pitch}
                                  onChange={(e) =>
                                    updateNote(sectionIdx, barIdx, noteIdx, { ...note, pitch: e.target.value })
                                  }
                                  className="px-2 py-1 border rounded"
                                >
                                  {PITCHES.map((p) => (
                                    <option key={p} value={p}>
                                      {p}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs text-gray-600 block mb-1">Octave</label>
                                <select
                                  value={note.octave}
                                  onChange={(e) =>
                                    updateNote(sectionIdx, barIdx, noteIdx, {
                                      ...note,
                                      octave: parseInt(e.target.value),
                                    })
                                  }
                                  className="px-2 py-1 border rounded"
                                >
                                  {OCTAVES.map((o) => (
                                    <option key={o} value={o}>
                                      {o}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="text-xs text-gray-600 block mb-1">Duration</label>
                                <select
                                  value={note.duration}
                                  onChange={(e) =>
                                    updateNote(sectionIdx, barIdx, noteIdx, {
                                      ...note,
                                      duration: e.target.value as NoteDuration,
                                    })
                                  }
                                  className="px-2 py-1 border rounded"
                                >
                                  {DURATIONS.map((d) => (
                                    <option key={d.value} value={d.value}>
                                      {d.label}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex-1">
                                <label className="text-xs text-gray-600 block mb-1">Flags</label>
                                <div className="flex gap-1">
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={note.dotted}
                                      onChange={(e) =>
                                        updateNote(sectionIdx, barIdx, noteIdx, { ...note, dotted: e.target.checked })
                                      }
                                    />
                                    Dotted
                                  </label>
                                  <label className="flex items-center gap-1 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={note.rest}
                                      onChange={(e) =>
                                        updateNote(sectionIdx, barIdx, noteIdx, { ...note, rest: e.target.checked })
                                      }
                                    />
                                    Rest
                                  </label>
                                </div>
                              </div>

                              <button
                                onClick={() => removeNote(sectionIdx, barIdx, noteIdx)}
                                className="px-2 py-1 text-red-600 hover:bg-red-50"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No notes yet</p>
                      )}
                    </div>

                    {/* Lyrics */}
                    <div>
                      <label className="text-xs text-gray-500 font-bold block mb-2">Lyrics (optional):</label>
                      <input
                        type="text"
                        value={bar.lyrics || ""}
                        onChange={(e) =>
                          updateBar(sectionIdx, barIdx, { ...bar, lyrics: e.target.value })
                        }
                        placeholder="Enter lyrics for this measure..."
                        className="w-full px-3 py-2 text-sm border rounded"
                      />
                    </div>

                    {/* Delete Button */}
                    {section.bars.length > 1 && (
                      <button
                        onClick={() => deleteBar(sectionIdx, barIdx)}
                        className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                      >
                        Delete Measure
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Measure Button */}
                <button
                  onClick={() => addBar(sectionIdx)}
                  className="w-full px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Measure
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// Liten input som håller sitt eget "pending"-värde och commit:ar till
// addChord() när användaren trycker Enter eller väljer ett förslag. Gjord
// inline här för att inte väva in chord-symbol-state i huvudkomponenten.
function PendingChordInput({ onAdd }: { onAdd: (symbol: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <ChordAutocomplete
      value={value}
      onChange={setValue}
      placeholder="Skriv ackord + Enter"
      className="px-2 py-1 text-sm border rounded font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 w-32"
      onCommit={(v) => {
        const trimmed = v.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setValue("");
      }}
    />
  );
}