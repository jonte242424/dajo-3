import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";

interface Bar {
  chords: Array<{ symbol: string; beat: number }>;
  lyrics: string;
}

interface Section {
  name: string;
  bars: Bar[];
}

interface SongbookEditorProps {
  sections: Section[];
  onChange: (sections: Section[]) => void;
}

export default function SongbookEditor({ sections, onChange }: SongbookEditorProps) {
  const [expandedSection, setExpandedSection] = useState<number | null>(0);

  const addSection = () => {
    const newSection: Section = {
      name: `Section ${sections.length + 1}`,
      bars: [{ chords: [], lyrics: "" }],
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
    updated[sectionIdx].bars.push({ chords: [], lyrics: "" });
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

  const updateChord = (sectionIdx: number, barIdx: number, chordIdx: number, symbol: string) => {
    const updated = [...sections];
    updated[sectionIdx].bars[barIdx].chords[chordIdx].symbol = symbol;
    onChange(updated);
  };

  const addChord = (sectionIdx: number, barIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].bars[barIdx].chords.push({ symbol: "", beat: 1 });
    onChange(updated);
  };

  const removeChord = (sectionIdx: number, barIdx: number, chordIdx: number) => {
    const updated = [...sections];
    updated[sectionIdx].bars[barIdx].chords = updated[sectionIdx].bars[barIdx].chords.filter(
      (_, i) => i !== chordIdx
    );
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Songbook (Lyrics + Chords)</h3>
        <button
          onClick={addSection}
          className="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-sm"
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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
                <span className="text-sm text-gray-600">({section.bars.length} lines)</span>
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
                  <div key={barIdx} className="border rounded p-4 bg-gray-50">
                    {/* Chords Row */}
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 font-bold mb-2">Chords:</div>
                      <div className="flex flex-wrap gap-2">
                        {bar.chords.length === 0 ? (
                          <button
                            onClick={() => addChord(sectionIdx, barIdx)}
                            className="px-2 py-1 text-sm bg-white border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50"
                          >
                            + Add Chord
                          </button>
                        ) : (
                          <>
                            {bar.chords.map((chord, chordIdx) => (
                              <div key={chordIdx} className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={chord.symbol}
                                  onChange={(e) =>
                                    updateChord(sectionIdx, barIdx, chordIdx, e.target.value)
                                  }
                                  placeholder="Am7"
                                  className="px-2 py-1 text-sm bg-white border rounded font-mono font-bold"
                                />
                                <button
                                  onClick={() => removeChord(sectionIdx, barIdx, chordIdx)}
                                  className="px-2 py-1 text-red-600 hover:bg-red-50 text-sm"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => addChord(sectionIdx, barIdx)}
                              className="px-2 py-1 text-sm bg-white border border-indigo-300 text-indigo-600 rounded hover:bg-indigo-50"
                            >
                              +
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Lyrics Row */}
                    <div>
                      <div className="text-xs text-gray-500 font-bold mb-2">Lyrics:</div>
                      <textarea
                        value={bar.lyrics}
                        onChange={(e) => {
                          const updated = { ...bar, lyrics: e.target.value };
                          updateBar(sectionIdx, barIdx, updated);
                        }}
                        placeholder="Enter lyrics for this line..."
                        className="w-full px-3 py-2 text-sm border rounded font-serif"
                        rows={2}
                      />
                    </div>

                    {/* Delete Button */}
                    {section.bars.length > 1 && (
                      <button
                        onClick={() => deleteBar(sectionIdx, barIdx)}
                        className="mt-2 px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200 w-full"
                      >
                        Delete Line
                      </button>
                    )}
                  </div>
                ))}

                {/* Add Line Button */}
                <button
                  onClick={() => addBar(sectionIdx)}
                  className="w-full px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Line
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}