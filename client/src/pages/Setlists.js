import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ListMusic, Plus, Trash2, ChevronRight, GripVertical, ArrowLeft, Save, X, Music, } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "../lib/api";
// ─── Sortable song row ────────────────────────────────────────────────────────
function SortableSongRow({ song, onRemove, }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: song.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };
    return (_jsxs("div", { ref: setNodeRef, style: style, className: "flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm group", children: [_jsx("button", { ...attributes, ...listeners, className: "text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing", children: _jsx(GripVertical, { size: 16 }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-gray-800 truncate text-sm", children: song.title }), _jsx("p", { className: "text-xs text-gray-400", children: [song.artist, song.key, song.tempo ? `♩${song.tempo}` : ""].filter(Boolean).join(" · ") })] }), _jsx("button", { onClick: () => onRemove(song.id), className: "opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1", children: _jsx(X, { size: 14 }) })] }));
}
// ─── Setlist detail view ──────────────────────────────────────────────────────
function SetlistDetail({ id, onBack }) {
    const queryClient = useQueryClient();
    const [showAddSong, setShowAddSong] = useState(false);
    const { data: setlist, isLoading } = useQuery({
        queryKey: ["setlist", id],
        queryFn: () => apiFetch(`/api/setlists/${id}`),
    });
    const { data: allSongs = [] } = useQuery({
        queryKey: ["songs"],
        queryFn: () => apiFetch("/api/songs"),
    });
    const reorderMutation = useMutation({
        mutationFn: (songIds) => apiFetch(`/api/setlists/${id}/reorder`, {
            method: "PUT",
            body: JSON.stringify({ songIds }),
        }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setlist", id] }),
    });
    const addSongMutation = useMutation({
        mutationFn: (songId) => apiFetch(`/api/setlists/${id}/songs`, {
            method: "POST",
            body: JSON.stringify({ songId }),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["setlist", id] });
            setShowAddSong(false);
        },
    });
    const removeSongMutation = useMutation({
        mutationFn: (songId) => apiFetch(`/api/setlists/${id}/songs/${songId}`, { method: "DELETE" }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setlist", id] }),
    });
    const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
    const songs = setlist?.songs ?? [];
    function handleDragEnd(event) {
        const { active, over } = event;
        if (!over || active.id === over.id)
            return;
        const oldIndex = songs.findIndex((s) => s.id === active.id);
        const newIndex = songs.findIndex((s) => s.id === over.id);
        const reordered = arrayMove(songs, oldIndex, newIndex);
        reorderMutation.mutate(reordered.map((s) => s.id));
    }
    const alreadyInList = new Set(songs.map((s) => s.id));
    const available = allSongs.filter((s) => !alreadyInList.has(s.id));
    if (isLoading)
        return (_jsx("div", { className: "flex items-center justify-center h-64 text-gray-400", children: "Laddar\u2026" }));
    return (_jsxs("div", { className: "max-w-2xl mx-auto px-4 py-6", children: [_jsxs("button", { onClick: onBack, className: "flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors", children: [_jsx(ArrowLeft, { size: 15 }), " Spellistor"] }), _jsxs("div", { className: "flex items-start justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: setlist?.name }), setlist?.description && (_jsx("p", { className: "text-gray-500 text-sm mt-1", children: setlist.description })), _jsxs("p", { className: "text-xs text-gray-400 mt-1", children: [songs.length, " l\u00E5tar"] })] }), _jsxs("button", { onClick: () => setShowAddSong(true), className: "flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors", children: [_jsx(Plus, { size: 15 }), " L\u00E4gg till l\u00E5t"] })] }), songs.length === 0 ? (_jsxs("div", { className: "text-center py-16 text-gray-400", children: [_jsx(ListMusic, { size: 36, className: "mx-auto mb-3 opacity-40" }), _jsx("p", { className: "font-medium", children: "Spellistan \u00E4r tom" }), _jsx("p", { className: "text-sm mt-1", children: "L\u00E4gg till l\u00E5tar fr\u00E5n ditt bibliotek" })] })) : (_jsx(DndContext, { sensors: sensors, collisionDetection: closestCenter, onDragEnd: handleDragEnd, children: _jsx(SortableContext, { items: songs.map((s) => s.id), strategy: verticalListSortingStrategy, children: _jsx("div", { className: "space-y-2", children: songs.map((song, idx) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-300 w-5 text-right", children: idx + 1 }), _jsx("div", { className: "flex-1", children: _jsx(SortableSongRow, { song: song, onRemove: (sid) => removeSongMutation.mutate(sid) }) })] }, song.id))) }) }) })), showAddSong && (_jsx("div", { className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b", children: [_jsx("h3", { className: "font-bold text-gray-900", children: "L\u00E4gg till l\u00E5t" }), _jsx("button", { onClick: () => setShowAddSong(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { size: 18 }) })] }), _jsx("div", { className: "overflow-y-auto flex-1 p-3 space-y-1", children: available.length === 0 ? (_jsx("p", { className: "text-center text-gray-400 py-8 text-sm", children: "Alla l\u00E5tar \u00E4r redan med" })) : (available.map((song) => (_jsxs("button", { onClick: () => addSongMutation.mutate(song.id), className: "w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 text-left transition-colors", children: [_jsx(Music, { size: 15, className: "text-indigo-400 flex-shrink-0" }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "font-medium text-sm text-gray-800 truncate", children: song.title }), _jsx("p", { className: "text-xs text-gray-400", children: [song.artist, song.key].filter(Boolean).join(" · ") })] })] }, song.id)))) })] }) }))] }));
}
// ─── Main Setlists page ───────────────────────────────────────────────────────
export default function Setlists() {
    const [, setLocation] = useLocation();
    const queryClient = useQueryClient();
    const [selectedId, setSelectedId] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [newName, setNewName] = useState("");
    const [newDesc, setNewDesc] = useState("");
    const { data: setlists = [], isLoading } = useQuery({
        queryKey: ["setlists"],
        queryFn: () => apiFetch("/api/setlists"),
    });
    const createMutation = useMutation({
        mutationFn: () => apiFetch("/api/setlists", {
            method: "POST",
            body: JSON.stringify({ name: newName, description: newDesc }),
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["setlists"] });
            setShowCreate(false);
            setNewName("");
            setNewDesc("");
        },
    });
    const deleteMutation = useMutation({
        mutationFn: (id) => apiFetch(`/api/setlists/${id}`, { method: "DELETE" }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setlists"] }),
    });
    if (selectedId !== null) {
        return _jsx(SetlistDetail, { id: selectedId, onBack: () => setSelectedId(null) });
    }
    return (_jsxs("div", { className: "min-h-screen bg-gray-50", children: [_jsxs("header", { className: "bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("button", { onClick: () => setLocation("/songs"), className: "flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors", children: [_jsx(ArrowLeft, { size: 15 }), " L\u00E5tar"] }), _jsx("span", { className: "text-gray-200", children: "|" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ListMusic, { size: 16, className: "text-indigo-400" }), _jsx("span", { className: "font-semibold text-gray-800", children: "Spellistor" })] })] }), _jsxs("button", { onClick: () => setShowCreate(true), className: "flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors", children: [_jsx(Plus, { size: 14 }), " Ny spellista"] })] }), _jsx("div", { className: "max-w-2xl mx-auto px-4 py-6", children: isLoading ? (_jsx("div", { className: "text-center py-16 text-gray-400", children: "Laddar\u2026" })) : setlists.length === 0 ? (_jsxs("div", { className: "text-center py-20 text-gray-400", children: [_jsx(ListMusic, { size: 48, className: "mx-auto mb-4 opacity-30" }), _jsx("p", { className: "font-semibold text-lg", children: "Inga spellistor \u00E4nnu" }), _jsx("p", { className: "text-sm mt-2 mb-6", children: "Skapa din f\u00F6rsta spellista f\u00F6r en konsert eller repetition" }), _jsxs("button", { onClick: () => setShowCreate(true), className: "inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors", children: [_jsx(Plus, { size: 15 }), " Skapa spellista"] })] })) : (_jsx("div", { className: "space-y-3", children: setlists.map((sl) => (_jsxs("div", { className: "bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-indigo-300 hover:shadow-sm transition-all group cursor-pointer", onClick: () => setSelectedId(sl.id), children: [_jsx("div", { className: "w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0", children: _jsx(ListMusic, { size: 18, className: "text-indigo-600" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-gray-800", children: sl.name }), sl.description && (_jsx("p", { className: "text-xs text-gray-400 truncate", children: sl.description })), _jsxs("p", { className: "text-xs text-gray-400 mt-0.5", children: [sl.songCount ?? 0, " l\u00E5tar"] })] }), _jsx(ChevronRight, { size: 16, className: "text-gray-300 group-hover:text-indigo-400 transition-colors" }), _jsx("button", { onClick: (e) => { e.stopPropagation(); deleteMutation.mutate(sl.id); }, className: "opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50", children: _jsx(Trash2, { size: 14 }) })] }, sl.id))) })) }), showCreate && (_jsx("div", { className: "fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between px-5 py-4 border-b", children: [_jsx("h3", { className: "font-bold text-gray-900", children: "Ny spellista" }), _jsx("button", { onClick: () => setShowCreate(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { size: 18 }) })] }), _jsxs("div", { className: "p-5 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-500 uppercase tracking-wide block mb-1.5", children: "Namn *" }), _jsx("input", { autoFocus: true, value: newName, onChange: (e) => setNewName(e.target.value), onKeyDown: (e) => e.key === "Enter" && newName.trim() && createMutation.mutate(), placeholder: "t.ex. Jazzgig 14 april", className: "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-500 uppercase tracking-wide block mb-1.5", children: "Beskrivning" }), _jsx("input", { value: newDesc, onChange: (e) => setNewDesc(e.target.value), placeholder: "Valfri beskrivning\u2026", className: "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" })] })] }), _jsxs("div", { className: "px-5 py-4 bg-gray-50 flex gap-3", children: [_jsx("button", { onClick: () => setShowCreate(false), className: "flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors", children: "Avbryt" }), _jsxs("button", { onClick: () => createMutation.mutate(), disabled: !newName.trim() || createMutation.isPending, className: "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors", children: [_jsx(Save, { size: 14 }), " Skapa"] })] })] }) }))] }));
}
