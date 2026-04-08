import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Music, Plus, LogOut, ChevronRight, Search, Upload, ListMusic } from "lucide-react";
import { apiFetch } from "../lib/api";
import ImportDialog from "../components/ImportDialog";
const KEYS = [
    "C", "Db", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B",
    "Cm", "Dm", "Em", "Fm", "Gm", "Am", "Bm",
];
const DEFAULT_SECTIONS = [
    { id: crypto.randomUUID(), name: "A", type: "bars",
        bars: Array.from({ length: 8 }, () => ({ chords: [], lyrics: "" })) },
];
export default function Songs() {
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const [showNew, setShowNew] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [key, setKey] = useState("C");
    const [style, setStyle] = useState("");
    const [search, setSearch] = useState("");
    const { data: songs = [], isLoading } = useQuery({
        queryKey: ["songs"],
        queryFn: async () => {
            const res = await apiFetch("/api/songs");
            return res;
        },
    });
    const createSong = useMutation({
        mutationFn: () => apiFetch("/api/songs", {
            method: "POST",
            body: JSON.stringify({
                title: title || "Namnlös låt",
                artist, key, style,
                tempo: 120,
                timeSignature: "4/4",
                sections: DEFAULT_SECTIONS,
                preferredFormat: "ireal",
            }),
        }),
        onSuccess: (song) => {
            queryClient.invalidateQueries({ queryKey: ["songs"] });
            setShowNew(false);
            setTitle("");
            setArtist("");
            setKey("C");
            setStyle("");
            setLocation(`/editor/${song.id}`);
        },
    });
    const deleteSong = useMutation({
        mutationFn: (id) => apiFetch(`/api/songs/${id}`, { method: "DELETE" }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["songs"] }),
    });
    const logout = () => {
        localStorage.removeItem("token");
        setLocation("/login");
    };
    const filtered = songs.filter((s) => !search ||
        s.title?.toLowerCase().includes(search.toLowerCase()) ||
        s.artist?.toLowerCase().includes(search.toLowerCase()));
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs("header", { className: "bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Music, { className: "text-indigo-600", size: 20 }), _jsx("span", { className: "text-lg font-bold text-indigo-700", children: "DAJO" })] }), _jsxs("button", { onClick: logout, className: "flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors", children: [_jsx(LogOut, { size: 15 }), " Logga ut"] })] }), _jsxs("div", { className: "max-w-2xl mx-auto px-6 py-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "Mina l\u00E5tar" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => setLocation("/setlists"), className: "flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-500\n                         text-sm rounded-lg hover:bg-gray-50 transition-colors", children: [_jsx(ListMusic, { size: 15 }), " Spellistor"] }), _jsxs("button", { onClick: () => setShowImport(true), className: "flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-600\n                         text-sm rounded-lg hover:bg-indigo-50 transition-colors", children: [_jsx(Upload, { size: 15 }), " Importera"] }), _jsxs("button", { onClick: () => setShowNew(!showNew), className: "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm\n                         rounded-lg hover:bg-indigo-700 transition-colors", children: [_jsx(Plus, { size: 15 }), " Ny l\u00E5t"] })] })] }), songs.length > 3 && (_jsxs("div", { className: "relative mb-4", children: [_jsx(Search, { size: 14, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" }), _jsx("input", { value: search, onChange: (e) => setSearch(e.target.value), placeholder: "S\u00F6k l\u00E5tar\u2026", className: "w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm\n                         focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" })] })), showNew && (_jsxs("div", { className: "bg-white rounded-xl border border-indigo-200 shadow-sm p-5 mb-4", children: [_jsx("h2", { className: "font-semibold text-gray-700 mb-4 text-sm", children: "Ny l\u00E5t" }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("input", { placeholder: "Titel *", value: title, onChange: (e) => setTitle(e.target.value), className: "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300", autoFocus: true }), _jsx("input", { placeholder: "Artist", value: artist, onChange: (e) => setArtist(e.target.value), className: "px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("select", { value: key, onChange: (e) => setKey(e.target.value), className: "flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300", children: KEYS.map((k) => _jsx("option", { children: k }, k)) }), _jsx("input", { placeholder: "Stil (Jazz, Pop\u2026)", value: style, onChange: (e) => setStyle(e.target.value), className: "flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" })] }), _jsxs("div", { className: "flex gap-2 pt-1", children: [_jsx("button", { onClick: () => createSong.mutate(), disabled: createSong.isPending, className: "flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg\n                             hover:bg-indigo-700 disabled:opacity-40 transition-colors", children: createSong.isPending ? "Skapar…" : "Skapa och öppna editor" }), _jsx("button", { onClick: () => setShowNew(false), className: "px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors", children: "Avbryt" })] })] })] })), isLoading ? (_jsx("div", { className: "space-y-3", children: [1, 2, 3].map((i) => (_jsx("div", { className: "h-16 bg-gray-100 rounded-xl animate-pulse" }, i))) })) : filtered.length === 0 ? (_jsxs("div", { className: "text-center py-16 text-gray-400", children: [_jsx(Music, { size: 40, className: "mx-auto mb-3 opacity-20" }), _jsx("p", { children: search ? "Inga låtar matchar sökningen" : "Inga låtar ännu — skapa din första!" })] })) : (_jsx("div", { className: "flex flex-col gap-2", children: filtered.map((song) => (_jsxs("div", { onClick: () => setLocation(`/editor/${song.id}`), className: "bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4\n                           flex items-center justify-between group hover:border-indigo-200\n                           hover:shadow-md transition-all cursor-pointer", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("h2", { className: "font-semibold text-gray-900 truncate", children: song.title }), _jsx("p", { className: "text-sm text-gray-400 truncate", children: [song.artist, song.key, song.style, song.tempo && `♩${song.tempo}`]
                                                .filter(Boolean).join(" · ") })] }), _jsxs("div", { className: "flex items-center gap-3 shrink-0", children: [_jsx("button", { onClick: (e) => { e.stopPropagation(); deleteSong.mutate(song.id); }, className: "text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity", children: "Radera" }), _jsx(ChevronRight, { size: 16, className: "text-gray-300 group-hover:text-indigo-400 transition-colors" })] })] }, song.id))) }))] }), showImport && _jsx(ImportDialog, { onClose: () => setShowImport(false) })] }));
}
