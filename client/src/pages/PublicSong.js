import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Publik visning av en delad låt — ingen inloggning krävs
 */
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Music, Copy, Check } from "lucide-react";
import { useState } from "react";
import { ChordPlayerButton } from "../components/ChordPlayer";
async function fetchPublicSong(id) {
    const res = await fetch(`/api/songs/public/${id}`);
    if (!res.ok)
        throw new Error("Låten hittades inte eller är inte offentlig");
    return res.json();
}
function PublicBarCell({ bar }) {
    const ch = bar.chords ?? [];
    return (_jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-3 min-h-[56px] flex flex-col justify-center", children: [ch.length === 0 ? (_jsx("span", { className: "text-gray-300 text-lg text-center", children: "%" })) : ch.length === 1 ? (_jsx("span", { className: "font-bold text-gray-900 text-lg text-center", children: ch[0].symbol })) : (_jsx("div", { className: "flex gap-1", children: ch.map((c, i) => (_jsx("span", { className: "font-bold text-gray-900 text-sm flex-1 text-center", children: c.symbol }, i))) })), bar.lyrics && (_jsx("p", { className: "text-xs text-gray-400 italic mt-1 truncate text-center", children: bar.lyrics }))] }));
}
export default function PublicSong() {
    const [, params] = useRoute("/share/:id");
    const id = params?.id ?? "";
    const [copied, setCopied] = useState(false);
    const { data: song, isLoading, isError } = useQuery({
        queryKey: ["public-song", id],
        queryFn: () => fetchPublicSong(id),
        enabled: !!id,
    });
    function copyLink() {
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
    if (isLoading)
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center text-gray-400 bg-gray-50", children: "Laddar l\u00E5t\u2026" }));
    if (isError || !song)
        return (_jsxs("div", { className: "min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500", children: [_jsx(Music, { size: 40, className: "mb-4 opacity-30" }), _jsx("p", { className: "font-semibold", children: "L\u00E5ten hittades inte" }), _jsx("p", { className: "text-sm mt-1", children: "Den kanske inte \u00E4r offentlig l\u00E4ngre" })] }));
    // Samla alla ackord för uppspelning
    const allChords = [];
    (song.sections ?? []).forEach((sec) => {
        (sec.bars ?? []).forEach((bar) => {
            (bar.chords ?? []).forEach((c) => {
                if (c.symbol)
                    allChords.push(c.symbol);
            });
        });
    });
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-b from-indigo-50 to-gray-50", children: [_jsxs("header", { className: "bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center", children: _jsx(Music, { size: 14, className: "text-white" }) }), _jsx("span", { className: "font-bold text-gray-800 text-sm", children: "DAJO 3.0" })] }), _jsxs("button", { onClick: copyLink, className: "flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors", children: [copied ? _jsx(Check, { size: 14, className: "text-green-500" }) : _jsx(Copy, { size: 14 }), copied ? "Kopierad!" : "Kopiera länk"] })] }), _jsxs("div", { className: "max-w-3xl mx-auto px-4 py-8", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: song.title }), song.artist && _jsx("p", { className: "text-gray-500 mt-1 text-lg", children: song.artist }), _jsxs("div", { className: "flex flex-wrap gap-3 mt-3", children: [song.key && (_jsxs("span", { className: "px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium", children: ["Tonart: ", song.key] })), song.tempo && (_jsxs("span", { className: "px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm", children: ["\u2669 = ", song.tempo] })), song.timeSignature && (_jsx("span", { className: "px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm", children: song.timeSignature })), song.style && (_jsx("span", { className: "px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm", children: song.style }))] }), allChords.length > 0 && (_jsx("div", { className: "mt-4", children: _jsx(ChordPlayerButton, { chords: allChords }) }))] }), _jsx("div", { className: "space-y-8", children: (song.sections ?? []).map((section) => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-3", children: [_jsx("span", { className: "px-3 py-1 bg-indigo-600 text-white text-sm font-bold rounded-lg", children: section.name }), section.type === "bars" && section.bars && (_jsx(ChordPlayerButton, { chords: section.bars.flatMap((b) => b.chords.map((c) => c.symbol)).filter(Boolean), className: "opacity-60 hover:opacity-100" }))] }), section.type === "note" ? (_jsx("p", { className: "text-gray-500 italic text-sm pl-2 border-l-2 border-gray-200", children: section.noteText })) : (_jsx("div", { className: "grid grid-cols-4 gap-2", children: (section.bars ?? []).map((bar, i) => (_jsx(PublicBarCell, { bar: bar }, i))) }))] }, section.id))) }), song.notes && (_jsxs("div", { className: "mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl", children: [_jsx("p", { className: "text-xs text-amber-700 font-medium uppercase tracking-wide mb-1", children: "Anteckningar" }), _jsx("p", { className: "text-gray-700 text-sm", children: song.notes })] })), _jsxs("div", { className: "mt-12 text-center", children: [_jsx("p", { className: "text-xs text-gray-400", children: "Delad via" }), _jsx("p", { className: "text-sm font-semibold text-indigo-600 mt-0.5", children: "DAJO 3.0 \u2014 Music chord charts" })] })] })] }));
}
