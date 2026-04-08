import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp, Music, Settings, Download, Share2, Check, } from "lucide-react";
import { apiFetch, authFetch } from "../lib/api";
import ChordInput from "../components/ChordInput";
import { ExportDialog } from "../components/ExportDialog";
import { ChordPlayerButton, AudioSettings } from "../components/ChordPlayer";
// ─── Helpers ─────────────────────────────────────────────────────────────────
function newSection(name) {
    return {
        id: crypto.randomUUID(),
        name,
        type: "bars",
        bars: Array.from({ length: 8 }, () => ({ chords: [], lyrics: "" })),
    };
}
function newBar() {
    return { chords: [], lyrics: "" };
}
const KEYS = [
    "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
    "Cm", "Dbm", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "Abm", "Am", "Bbm", "Bm",
];
const STYLES = ["Jazz", "Bossa Nova", "Samba", "Pop", "Rock", "Funk", "Blues", "Ballad", "Latin", "Swing", ""];
const TIME_SIGS = ["4/4", "3/4", "6/8", "2/4", "5/4", "12/8"];
const SECTION_NAMES = ["Intro", "A", "B", "C", "Vers", "Refräng", "Bridge", "Outro", "Coda", "Interlude", "Solo", "Vamp"];
function BarCell({ bar, isActive, onClick, onUpdate, onDeactivate }) {
    const [editingIdx, setEditingIdx] = useState(null);
    const [inputValue, setInputValue] = useState("");
    const startEdit = (idx, current) => {
        setEditingIdx(idx);
        setInputValue(current);
    };
    const commitEdit = (idx, value) => {
        const chords = [...bar.chords];
        if (value.trim()) {
            chords[idx] = { ...chords[idx], symbol: value.trim() };
        }
        else {
            chords.splice(idx, 1);
        }
        onUpdate({ ...bar, chords });
        setEditingIdx(null);
        setInputValue("");
    };
    const addChord = () => {
        const beat = [1, 3, 2, 4][bar.chords.length] ?? 1;
        const newChords = [...bar.chords, { symbol: "", beat }];
        onUpdate({ ...bar, chords: newChords });
        setEditingIdx(newChords.length - 1);
        setInputValue("");
    };
    const removeChord = (idx) => {
        const chords = bar.chords.filter((_, i) => i !== idx);
        onUpdate({ ...bar, chords });
    };
    // Display: sort chords by beat
    const sorted = [...bar.chords].sort((a, b) => a.beat - b.beat);
    return (_jsxs("div", { onClick: !isActive ? onClick : undefined, className: `relative border-r border-b border-gray-200 min-h-[72px] transition-colors select-none
        ${isActive ? "bg-indigo-50 ring-2 ring-inset ring-indigo-400 z-10" : "hover:bg-gray-50 cursor-pointer"}`, children: [bar.repeat && bar.repeat !== "none" && (_jsx("div", { className: "absolute top-1 right-1 text-[9px] text-indigo-300 font-mono", children: bar.repeat === "start" ? "‖:" : bar.repeat === "end" ? ":‖" : "‖:‖" })), _jsxs("div", { className: "p-2 flex flex-col gap-1 min-h-[72px]", children: [sorted.length === 0 && !isActive && (_jsx("span", { className: "text-gray-200 text-xs font-mono mt-2 ml-1", children: "\u2014" })), sorted.map((entry, i) => {
                        const origIdx = bar.chords.indexOf(entry);
                        return (_jsxs("div", { className: "flex items-center gap-1 group/chord", children: [sorted.length > 1 && (_jsx("span", { className: "text-[9px] text-gray-300 w-3 shrink-0", children: entry.beat })), isActive && editingIdx === origIdx ? (_jsx(ChordInput, { value: inputValue, onChange: setInputValue, onConfirm: (v) => commitEdit(origIdx, v), onCancel: () => { setEditingIdx(null); setInputValue(""); onDeactivate(); } })) : (_jsx("button", { onClick: () => isActive && startEdit(origIdx, entry.symbol), className: "text-sm font-mono font-semibold text-gray-800 hover:text-indigo-700\n                             text-left leading-tight truncate max-w-[90px]", children: entry.symbol || _jsx("span", { className: "text-gray-300", children: "?" }) })), isActive && editingIdx !== origIdx && (_jsx("button", { onClick: () => removeChord(origIdx), className: "opacity-0 group-hover/chord:opacity-100 text-red-300 hover:text-red-500\n                             transition-opacity ml-auto", children: _jsx(Trash2, { size: 10 }) }))] }, i));
                    }), isActive && bar.chords.length < 4 && editingIdx === null && (_jsxs("button", { onClick: addChord, className: "text-[10px] text-indigo-300 hover:text-indigo-600 mt-1 flex items-center gap-0.5 transition-colors", children: [_jsx(Plus, { size: 10 }), " ackord"] }))] }), (bar.lyrics || isActive) && (_jsx("div", { className: "border-t border-dashed border-gray-200 px-2 py-1", children: _jsx("input", { value: bar.lyrics || "", onChange: (e) => onUpdate({ ...bar, lyrics: e.target.value }), onClick: (e) => e.stopPropagation(), placeholder: isActive ? "Text…" : "", className: "w-full text-[10px] text-gray-500 bg-transparent focus:outline-none\n                       placeholder:text-gray-300 italic" }) }))] }));
}
function SectionBlock({ section, activeBarKey, setActiveBarKey, onChange, onDelete, onMoveUp, onMoveDown, isFirst, isLast, }) {
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(section.name);
    const updateBar = (barIdx, bar) => {
        const bars = [...section.bars];
        bars[barIdx] = bar;
        onChange({ ...section, bars });
    };
    const addBar = () => {
        onChange({ ...section, bars: [...section.bars, newBar()] });
    };
    const removeBar = (idx) => {
        if (section.bars.length <= 1)
            return;
        const bars = section.bars.filter((_, i) => i !== idx);
        onChange({ ...section, bars });
    };
    // Group bars into rows of 4
    const rows = [];
    for (let i = 0; i < section.bars.length; i += 4) {
        rows.push(section.bars.slice(i, i + 4).map((bar, j) => ({ bar, idx: i + j })));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4", children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200", children: [_jsx("div", { className: "w-2 h-2 rounded-full bg-indigo-400 shrink-0" }), editingName ? (_jsx("input", { autoFocus: true, value: nameVal, onChange: (e) => setNameVal(e.target.value), onBlur: () => { setEditingName(false); onChange({ ...section, name: nameVal }); }, onKeyDown: (e) => {
                            if (e.key === "Enter" || e.key === "Escape") {
                                setEditingName(false);
                                onChange({ ...section, name: nameVal });
                            }
                        }, className: "text-sm font-semibold text-gray-700 bg-white border border-indigo-300\n                       rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-400 w-32" })) : (_jsx("button", { onClick: () => setEditingName(true), className: "text-sm font-semibold text-gray-700 hover:text-indigo-600 transition-colors", children: section.name })), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsx(ChordPlayerButton, { chords: section.bars.flatMap((b) => b.chords.map((c) => c.symbol)).filter(Boolean) }), _jsxs("span", { className: "text-xs text-gray-400", children: [section.bars.length, " takter"] }), _jsx("button", { onClick: onMoveUp, disabled: isFirst, className: "p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors", children: _jsx(ChevronUp, { size: 14 }) }), _jsx("button", { onClick: onMoveDown, disabled: isLast, className: "p-1 text-gray-300 hover:text-gray-600 disabled:opacity-20 transition-colors", children: _jsx(ChevronDown, { size: 14 }) }), _jsx("button", { onClick: onDelete, className: "p-1 text-gray-300 hover:text-red-500 transition-colors ml-1", children: _jsx(Trash2, { size: 14 }) })] })] }), _jsx("div", { className: "border-t border-gray-100", children: rows.map((row, rowIdx) => (_jsxs("div", { className: "grid grid-cols-2 sm:grid-cols-4 border-t border-gray-100 first:border-t-0", children: [row.map(({ bar, idx }) => {
                            const key = `${section.id}-${idx}`;
                            return (_jsx(BarCell, { bar: bar, isActive: activeBarKey === key, onClick: () => setActiveBarKey(key), onUpdate: (b) => updateBar(idx, b), onDeactivate: () => setActiveBarKey(null) }, key));
                        }), row.length < 4 && Array.from({ length: 4 - row.length }).map((_, i) => (_jsx("div", { className: "hidden sm:block border-r border-b border-gray-100 min-h-[72px] bg-gray-50/50" }, `empty-${i}`)))] }, rowIdx))) }), _jsxs("div", { className: "flex gap-2 px-4 py-2 border-t border-gray-100 bg-gray-50/50", children: [_jsxs("button", { onClick: addBar, className: "text-xs text-gray-400 hover:text-indigo-600 flex items-center gap-1 transition-colors", children: [_jsx(Plus, { size: 12 }), " L\u00E4gg till takt"] }), section.bars.length > 1 && (_jsxs("button", { onClick: () => removeBar(section.bars.length - 1), className: "text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 ml-auto transition-colors", children: [_jsx(Trash2, { size: 12 }), " Ta bort sista"] }))] })] }));
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
    const [sections, setSections] = useState([]);
    const [notes, setNotes] = useState("");
    const [activeBarKey, setActiveBarKey] = useState(null);
    const [saved, setSaved] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showExport, setShowExport] = useState(false);
    const [isPublic, setIsPublic] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);
    const [keyInfo, setKeyInfo] = useState(null);
    const [semitones, setSemitones] = useState(0);
    // Load song
    const { data: song, isLoading } = useQuery({
        queryKey: ["song", id],
        queryFn: () => apiFetch(`/api/songs/${id}`),
        enabled: !!id,
    });
    useEffect(() => {
        if (song) {
            setTitle(song.title);
            setArtist(song.artist || "");
            setKey(song.key || "C");
            setTempo(song.tempo || 120);
            setTimeSignature(song.timeSignature || "4/4");
            setStyle(song.style || "");
            setSections(Array.isArray(song.sections) && song.sections.length > 0
                ? song.sections
                : [newSection("A")]);
            setNotes(song.notes || "");
            setIsPublic(!!song.isPublic);
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
        }
        catch {
            setIsPublic(!newPublic); // återställ vid fel
        }
    }
    // Load key info when key changes
    useEffect(() => {
        if (!key)
            return;
        authFetch(`/api/music/key/${encodeURIComponent(key)}`)
            .then((r) => r.json())
            .then(setKeyInfo)
            .catch(() => setKeyInfo(null));
    }, [key]);
    // Save
    const saveMutation = useMutation({
        mutationFn: () => apiFetch(`/api/songs/${id}`, {
            method: "PUT",
            body: JSON.stringify({ title, artist, key, tempo, timeSignature, style, sections, notes, preferredFormat: "ireal" }),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["songs"] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });
    // Transpose
    const transposeMutation = useMutation({
        mutationFn: (s) => apiFetch(`/api/songs/${id}/transpose`, {
            method: "PUT",
            body: JSON.stringify({ semitones: s }),
        }),
        onSuccess: (data) => {
            setKey(data.key);
            setSections(data.sections);
            setSemitones(0);
        },
    });
    // Keyboard shortcut: Cmd+S
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                e.preventDefault();
                saveMutation.mutate();
            }
            if (e.key === "Escape")
                setActiveBarKey(null);
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [saveMutation]);
    const updateSection = useCallback((idx, s) => {
        setSections((prev) => { const n = [...prev]; n[idx] = s; return n; });
    }, []);
    const deleteSection = useCallback((idx) => {
        setSections((prev) => prev.filter((_, i) => i !== idx));
    }, []);
    const moveSection = useCallback((idx, dir) => {
        setSections((prev) => {
            const n = [...prev];
            const target = idx + dir;
            if (target < 0 || target >= n.length)
                return n;
            [n[idx], n[target]] = [n[target], n[idx]];
            return n;
        });
    }, []);
    const addSection = (name) => {
        setSections((prev) => [...prev, newSection(name)]);
    };
    if (isLoading)
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center text-gray-400", children: "Laddar l\u00E5t\u2026" }));
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", onClick: () => setActiveBarKey(null), children: [_jsxs("header", { className: "bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4 sticky top-0 z-20", children: [_jsxs("button", { onClick: () => setLocation("/songs"), className: "flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors shrink-0", children: [_jsx(ArrowLeft, { size: 15 }), " L\u00E5tar"] }), _jsxs("div", { className: "flex items-center gap-2 flex-1 min-w-0", children: [_jsx(Music, { size: 16, className: "text-indigo-400 shrink-0" }), _jsx("input", { value: title, onChange: (e) => setTitle(e.target.value), className: "font-semibold text-gray-800 bg-transparent focus:outline-none truncate\n                       border-b border-transparent focus:border-indigo-300 transition-colors", placeholder: "L\u00E5ttitel" }), _jsx("span", { className: "hidden sm:inline text-gray-300", children: "\u00B7" }), _jsx("input", { value: artist, onChange: (e) => setArtist(e.target.value), className: "hidden sm:block text-sm text-gray-400 bg-transparent focus:outline-none truncate\n                       border-b border-transparent focus:border-indigo-300 transition-colors", placeholder: "Artist" })] }), _jsxs("div", { className: "flex items-center gap-2 shrink-0", children: [_jsx("button", { onClick: () => setShowSettings(!showSettings), className: `p-1.5 rounded-lg transition-colors ${showSettings ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:text-gray-700"}`, children: _jsx(Settings, { size: 16 }) }), _jsxs("button", { onClick: toggleShare, title: isPublic ? "Offentlig — klicka för att stänga delning" : "Dela låten", className: `flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border text-sm rounded-lg transition-colors ${isPublic
                                    ? "border-green-400 text-green-700 bg-green-50 hover:bg-green-100"
                                    : "border-gray-300 text-gray-500 hover:bg-gray-50"}`, children: [shareCopied ? _jsx(Check, { size: 14 }) : _jsx(Share2, { size: 14 }), _jsx("span", { className: "hidden sm:inline", children: shareCopied ? "Kopierad!" : isPublic ? "Delad" : "Dela" })] }), _jsxs("button", { onClick: () => setShowExport(true), className: "flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 border border-indigo-300 text-indigo-600 text-sm\n                       rounded-lg hover:bg-indigo-50 transition-colors", children: [_jsx(Download, { size: 14 }), _jsx("span", { className: "hidden sm:inline", children: "Exportera" })] }), _jsxs("button", { onClick: () => saveMutation.mutate(), disabled: saveMutation.isPending, className: "flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm\n                       rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors", children: [_jsx(Save, { size: 14 }), saved ? "Sparat!" : saveMutation.isPending ? "Sparar…" : "Spara"] })] })] }), showSettings && (_jsxs("div", { className: "bg-white border-b border-gray-100 px-6 py-4", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "max-w-4xl mx-auto flex flex-wrap gap-4 items-end", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-400 uppercase tracking-wide block mb-1", children: "Tonart" }), _jsx("select", { value: key, onChange: (e) => setKey(e.target.value), className: "px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300", children: KEYS.map((k) => _jsx("option", { children: k }, k)) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-400 uppercase tracking-wide block mb-1", children: "Tempo \u2669" }), _jsx("input", { type: "number", value: tempo, onChange: (e) => setTempo(Number(e.target.value)), min: 40, max: 320, className: "w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-400 uppercase tracking-wide block mb-1", children: "Taktart" }), _jsx("select", { value: timeSignature, onChange: (e) => setTimeSignature(e.target.value), className: "px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300", children: TIME_SIGS.map((t) => _jsx("option", { children: t }, t)) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-400 uppercase tracking-wide block mb-1", children: "Stil" }), _jsx("select", { value: style, onChange: (e) => setStyle(e.target.value), className: "px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300", children: STYLES.map((s) => _jsx("option", { value: s, children: s || "—" }, s)) })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-400 uppercase tracking-wide block mb-1", children: "Transponera" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => transposeMutation.mutate(-1), className: "px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors", children: "\u266D \u22121" }), _jsx("button", { onClick: () => transposeMutation.mutate(1), className: "px-3 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors", children: "\u266F +1" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-400 uppercase tracking-wide block mb-1", children: "Uppspelning" }), _jsx(AudioSettings, {})] })] }), keyInfo && (_jsxs("div", { className: "max-w-4xl mx-auto mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100", children: [_jsxs("div", { className: "flex flex-wrap gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-xs text-indigo-400 uppercase tracking-wide block mb-1", children: "Diatoniska ackord" }), _jsx("div", { className: "flex flex-wrap gap-1", children: keyInfo.diatonicChords?.map((c) => (_jsx("span", { className: "px-2 py-0.5 bg-white border border-indigo-200 rounded text-xs font-mono text-indigo-700", children: c }, c))) })] }), _jsxs("div", { children: [_jsx("span", { className: "text-xs text-indigo-400 uppercase tracking-wide block mb-1", children: "Relativ tonart" }), _jsx("span", { className: "font-mono text-indigo-700", children: keyInfo.relativeKey })] }), _jsxs("div", { children: [_jsx("span", { className: "text-xs text-indigo-400 uppercase tracking-wide block mb-1", children: "Skala" }), _jsx("span", { className: "font-mono text-indigo-700 text-xs", children: keyInfo.scale?.join(" – ") })] })] }), _jsxs("div", { className: "mt-2 flex flex-wrap gap-2", children: [_jsx("span", { className: "text-xs text-indigo-400 uppercase tracking-wide", children: "Vanliga progressioner:" }), keyInfo.commonProgressions?.map((p) => (_jsxs("span", { className: "text-xs text-indigo-600 bg-white border border-indigo-200 rounded px-2 py-0.5", children: [p.name, ": ", _jsx("span", { className: "font-mono", children: p.chords.join(" – ") })] }, p.name)))] })] }))] })), _jsxs("div", { className: "max-w-4xl mx-auto px-4 py-6", onClick: (e) => e.stopPropagation(), children: [sections.map((section, idx) => (_jsx(SectionBlock, { section: section, activeBarKey: activeBarKey, setActiveBarKey: setActiveBarKey, onChange: (s) => updateSection(idx, s), onDelete: () => deleteSection(idx), onMoveUp: () => moveSection(idx, -1), onMoveDown: () => moveSection(idx, 1), isFirst: idx === 0, isLast: idx === sections.length - 1 }, section.id))), _jsxs("div", { className: "flex flex-wrap gap-2 mt-2", children: [_jsx("span", { className: "text-xs text-gray-400 self-center", children: "L\u00E4gg till sektion:" }), SECTION_NAMES.map((name) => (_jsxs("button", { onClick: () => addSection(name), className: "px-3 py-1 text-xs border border-dashed border-gray-300 rounded-lg\n                         text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors", children: ["+ ", name] }, name)))] }), _jsxs("div", { className: "mt-6", children: [_jsx("label", { className: "text-xs text-gray-400 uppercase tracking-wide block mb-2", children: "Anteckningar" }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "Fria anteckningar om l\u00E5ten\u2026", rows: 3, className: "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-600\n                       bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none" })] }), _jsx("p", { className: "text-center text-xs text-gray-300 mt-4", children: "Klicka p\u00E5 en takt f\u00F6r att redigera \u00B7 \u2318S f\u00F6r att spara \u00B7 Escape f\u00F6r att avbryta" })] }), showExport && id && (_jsx(ExportDialog, { songId: Number(id), songTitle: title, onClose: () => setShowExport(false) }))] }));
}
