import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ImportDialog — AI-powered file import
 * Supports: PDF, PNG, JPEG, WebP
 * Uses Claude Vision to detect chords, sections, and song structure
 */
import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Upload, X, FileText, Image, Loader2, CheckCircle2, AlertCircle, Music, ChevronRight, Grid3x3, BookOpen, Music2, } from "lucide-react";
import { apiFetch } from "../lib/api";
const FORMAT_LABELS = {
    ireal: { label: "iReal", desc: "Ackordschema i rutnät", icon: _jsx(Grid3x3, { size: 14 }) },
    songbook: { label: "Songbook", desc: "Text + ackord (ChordPro)", icon: _jsx(BookOpen, { size: 14 }) },
    notation: { label: "Notation", desc: "Notlinjer + leadsheet", icon: _jsx(Music2, { size: 14 }) },
};
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_EXT = ".pdf,.jpg,.jpeg,.png,.webp,.gif";
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result;
            // Strip data URL prefix: "data:application/pdf;base64,..."
            resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
function FileIcon({ type }) {
    return type === "application/pdf"
        ? _jsx(FileText, { size: 20, className: "text-red-400" })
        : _jsx(Image, { size: 20, className: "text-blue-400" });
}
export default function ImportDialog({ onClose }) {
    const [step, setStep] = useState("idle");
    const [dragOver, setDragOver] = useState(false);
    const [file, setFile] = useState(null);
    const [songs, setSongs] = useState([]);
    const [selected, setSelected] = useState(new Set());
    const [error, setError] = useState("");
    const [model, setModel] = useState("");
    const [tokens, setTokens] = useState(0);
    const [detectedFormat, setDetectedFormat] = useState("ireal");
    const [detectionConfidence, setDetectionConfidence] = useState(0);
    const [detectionSignals, setDetectionSignals] = useState([]);
    const [overrideFormat, setOverrideFormat] = useState(null);
    const fileRef = useRef(null);
    const queryClient = useQueryClient();
    const [, setLocation] = useLocation();
    const processFile = useCallback(async (f) => {
        if (!ACCEPTED.includes(f.type)) {
            setError(`Filtypen stöds inte. Använd PDF, PNG, JPEG eller WebP.`);
            setStep("error");
            return;
        }
        setFile(f);
        setError("");
        setStep("uploading");
        try {
            const base64 = await fileToBase64(f);
            setStep("analyzing");
            const result = await apiFetch("/api/import/analyze", {
                method: "POST",
                body: JSON.stringify({
                    base64,
                    mediaType: f.type,
                    filename: f.name,
                }),
            });
            setSongs(result.songs);
            setModel(result.model);
            setTokens(result.tokensUsed);
            setDetectedFormat(result.detectedFormat ?? result.songs[0]?.preferredFormat ?? "ireal");
            setDetectionConfidence(result.detectionConfidence ?? 0);
            setDetectionSignals(result.detectionSignals ?? []);
            setOverrideFormat(null);
            setSelected(new Set(result.songs.map((_, i) => i)));
            setStep("preview");
        }
        catch (err) {
            setError(err.message || "Analysen misslyckades");
            setStep("error");
        }
    }, []);
    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f)
            processFile(f);
    }, [processFile]);
    const handleFileChange = (e) => {
        const f = e.target.files?.[0];
        if (f)
            processFile(f);
    };
    const toggleSelect = (i) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(i) ? next.delete(i) : next.add(i);
            return next;
        });
    };
    const activeFormat = overrideFormat ?? detectedFormat;
    const saveSelected = async () => {
        const toSave = songs
            .filter((_, i) => selected.has(i))
            .map((s) => ({ ...s, preferredFormat: activeFormat }));
        if (toSave.length === 0)
            return;
        setStep("saving");
        try {
            const result = await apiFetch("/api/import/save", { method: "POST", body: JSON.stringify({ songs: toSave }) });
            await queryClient.invalidateQueries({ queryKey: ["songs"] });
            setStep("done");
            // If only one song saved, navigate to it
            if (result.saved.length === 1) {
                setTimeout(() => {
                    onClose();
                    setLocation(`/editor/${result.saved[0].id}`);
                }, 800);
            }
        }
        catch (err) {
            setError(err.message || "Kunde inte spara låtar");
            setStep("error");
        }
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", onClick: onClose, children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Music, { size: 18, className: "text-indigo-500" }), _jsx("h2", { className: "font-semibold text-gray-800", children: "Importera med AI" })] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition-colors", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "p-6", children: [(step === "idle" || step === "error") && (_jsxs(_Fragment, { children: [_jsxs("div", { onDragOver: (e) => { e.preventDefault(); setDragOver(true); }, onDragLeave: () => setDragOver(false), onDrop: handleDrop, onClick: () => fileRef.current?.click(), className: `border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
                  ${dragOver
                                        ? "border-indigo-400 bg-indigo-50"
                                        : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"}`, children: [_jsx(Upload, { size: 32, className: `mx-auto mb-3 transition-colors ${dragOver ? "text-indigo-500" : "text-gray-300"}` }), _jsx("p", { className: "font-medium text-gray-700 mb-1", children: "Dra hit eller klicka f\u00F6r att v\u00E4lja fil" }), _jsx("p", { className: "text-sm text-gray-400", children: "PDF, PNG, JPEG, WebP \u2014 upp till 30MB" }), _jsx("p", { className: "text-xs text-indigo-400 mt-3", children: "Claude AI analyserar noter, ackordscheman och kompskisser" }), _jsx("input", { ref: fileRef, type: "file", accept: ACCEPTED_EXT, onChange: handleFileChange, className: "hidden" })] }), step === "error" && (_jsxs("div", { className: "mt-4 flex items-start gap-2 text-red-600 bg-red-50 rounded-lg p-3", children: [_jsx(AlertCircle, { size: 16, className: "shrink-0 mt-0.5" }), _jsx("p", { className: "text-sm", children: error })] }))] })), step === "uploading" && (_jsxs("div", { className: "text-center py-10", children: [_jsx(Loader2, { size: 36, className: "mx-auto mb-4 text-indigo-400 animate-spin" }), _jsxs("p", { className: "font-medium text-gray-700", children: ["Laddar upp ", file?.name, "\u2026"] })] })), step === "analyzing" && (_jsxs("div", { className: "text-center py-10", children: [_jsxs("div", { className: "relative mx-auto mb-4 w-12 h-12", children: [_jsx(Loader2, { size: 48, className: "text-indigo-400 animate-spin" }), _jsx(Music, { size: 20, className: "absolute inset-0 m-auto text-indigo-600" })] }), _jsx("p", { className: "font-medium text-gray-700 mb-2", children: "Claude analyserar filen\u2026" }), _jsx("p", { className: "text-sm text-gray-400", children: "Identifierar ackord, sektioner och struktur" }), _jsx("div", { className: "mt-4 flex justify-center gap-1", children: [0, 1, 2].map((i) => (_jsx("div", { className: "w-2 h-2 rounded-full bg-indigo-300 animate-bounce", style: { animationDelay: `${i * 0.15}s` } }, i))) })] })), step === "preview" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx(CheckCircle2, { size: 16, className: "text-green-500" }), _jsx("span", { className: "text-sm text-gray-600", children: songs.length === 1 ? "1 låt hittad" : `${songs.length} låtar hittade` }), _jsxs("span", { className: "ml-auto text-xs text-gray-300", children: [tokens.toLocaleString(), " tokens"] })] }), _jsxs("div", { className: "mb-4 rounded-xl border border-gray-200 p-3 bg-gray-50", children: [_jsxs("p", { className: "text-xs font-medium text-gray-500 mb-2", children: ["Detekterat format", detectionConfidence > 0 && (_jsxs("span", { className: "ml-1 text-gray-400", children: ["(", Math.round(detectionConfidence * 100), "% s\u00E4kerhet)"] }))] }), _jsx("div", { className: "flex gap-2", children: Object.entries(FORMAT_LABELS).map(([fmt, info]) => (_jsxs("button", { onClick: () => setOverrideFormat(fmt === detectedFormat ? null : fmt), className: `flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all
                        ${activeFormat === fmt
                                                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium"
                                                    : "border-gray-200 text-gray-500 hover:border-gray-300"}`, children: [info.icon, _jsx("span", { children: info.label })] }, fmt))) }), overrideFormat && (_jsxs("p", { className: "text-xs text-amber-600 mt-2 flex items-center gap-1", children: [_jsx(AlertCircle, { size: 11 }), "Format \u00E4ndrat manuellt \u2014 l\u00E5ten extraheras om vid sparning"] }))] }), _jsx("div", { className: "flex flex-col gap-2 max-h-56 overflow-y-auto mb-4", children: songs.map((song, i) => (_jsxs("div", { onClick: () => toggleSelect(i), className: `flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${selected.has(i)
                                            ? "border-indigo-300 bg-indigo-50"
                                            : "border-gray-200 hover:border-gray-300"}`, children: [_jsx("div", { className: `w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${selected.has(i) ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`, children: selected.has(i) && _jsx(CheckCircle2, { size: 12, className: "text-white" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-semibold text-sm text-gray-900 truncate", children: song.title }), _jsx("p", { className: "text-xs text-gray-400 truncate", children: [song.artist, song.key, song.style, `♩${song.tempo}`,
                                                            `${song.sections.length} sektioner`].filter(Boolean).join(" · ") })] }), _jsx(FileIcon, { type: file?.type || "" })] }, i))) }), _jsxs("div", { className: "flex gap-2", children: [_jsxs("button", { onClick: saveSelected, disabled: selected.size === 0, className: "flex-1 flex items-center justify-center gap-2 py-2.5 bg-indigo-600\n                             text-white text-sm rounded-xl hover:bg-indigo-700\n                             disabled:opacity-40 transition-colors font-medium", children: ["Importera ", selected.size > 0 ? `(${selected.size})` : "", _jsx(ChevronRight, { size: 16 })] }), _jsx("button", { onClick: () => { setStep("idle"); setFile(null); setSongs([]); setOverrideFormat(null); }, className: "px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors", children: "Ny fil" })] })] })), step === "saving" && (_jsxs("div", { className: "text-center py-10", children: [_jsx(Loader2, { size: 36, className: "mx-auto mb-4 text-indigo-400 animate-spin" }), _jsx("p", { className: "font-medium text-gray-700", children: "Sparar l\u00E5tar\u2026" })] })), step === "done" && (_jsxs("div", { className: "text-center py-10", children: [_jsx(CheckCircle2, { size: 40, className: "mx-auto mb-4 text-green-500" }), _jsx("p", { className: "font-semibold text-gray-800 mb-1", children: "Importerat!" }), _jsx("p", { className: "text-sm text-gray-400", children: "\u00D6ppnar i editorn\u2026" })] }))] })] }) }));
}
