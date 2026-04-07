import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ListMusic, Plus, Trash2, ChevronRight, GripVertical,
  ArrowLeft, Save, X, Music,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { apiFetch } from "../lib/api";

interface Setlist {
  id: number;
  name: string;
  description?: string;
  songs?: SetlistSong[];
  songCount?: number;
  createdAt?: string;
}

interface SetlistSong {
  id: number;
  title: string;
  artist?: string;
  key?: string;
  tempo?: number;
  position: number;
}

// ─── Sortable song row ────────────────────────────────────────────────────────

function SortableSongRow({
  song,
  onRemove,
}: {
  song: SetlistSong;
  onRemove: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: song.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 shadow-sm group"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-800 truncate text-sm">{song.title}</p>
        <p className="text-xs text-gray-400">
          {[song.artist, song.key, song.tempo ? `♩${song.tempo}` : ""].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        onClick={() => onRemove(song.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Setlist detail view ──────────────────────────────────────────────────────

function SetlistDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const queryClient = useQueryClient();
  const [showAddSong, setShowAddSong] = useState(false);

  const { data: setlist, isLoading } = useQuery({
    queryKey: ["setlist", id],
    queryFn: () => apiFetch<Setlist>(`/api/setlists/${id}`),
  });

  const { data: allSongs = [] } = useQuery({
    queryKey: ["songs"],
    queryFn: () => apiFetch<any[]>("/api/songs"),
  });

  const reorderMutation = useMutation({
    mutationFn: (songIds: number[]) =>
      apiFetch(`/api/setlists/${id}/reorder`, {
        method: "PUT",
        body: JSON.stringify({ songIds }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setlist", id] }),
  });

  const addSongMutation = useMutation({
    mutationFn: (songId: number) =>
      apiFetch(`/api/setlists/${id}/songs`, {
        method: "POST",
        body: JSON.stringify({ songId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setlist", id] });
      setShowAddSong(false);
    },
  });

  const removeSongMutation = useMutation({
    mutationFn: (songId: number) =>
      apiFetch(`/api/setlists/${id}/songs/${songId}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setlist", id] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const songs: SetlistSong[] = setlist?.songs ?? [];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = songs.findIndex((s) => s.id === active.id);
    const newIndex = songs.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(songs, oldIndex, newIndex);
    reorderMutation.mutate(reordered.map((s) => s.id));
  }

  const alreadyInList = new Set(songs.map((s) => s.id));
  const available = allSongs.filter((s: any) => !alreadyInList.has(s.id));

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Laddar…</div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Spellistor
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{setlist?.name}</h1>
          {setlist?.description && (
            <p className="text-gray-500 text-sm mt-1">{setlist.description}</p>
          )}
          <p className="text-xs text-gray-400 mt-1">{songs.length} låtar</p>
        </div>
        <button
          onClick={() => setShowAddSong(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} /> Lägg till låt
        </button>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ListMusic size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">Spellistan är tom</p>
          <p className="text-sm mt-1">Lägg till låtar från ditt bibliotek</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {songs.map((song, idx) => (
                <div key={song.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-300 w-5 text-right">{idx + 1}</span>
                  <div className="flex-1">
                    <SortableSongRow song={song} onRemove={(sid) => removeSongMutation.mutate(sid)} />
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add song panel */}
      {showAddSong && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Lägg till låt</h3>
              <button onClick={() => setShowAddSong(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {available.length === 0 ? (
                <p className="text-center text-gray-400 py-8 text-sm">Alla låtar är redan med</p>
              ) : (
                available.map((song: any) => (
                  <button
                    key={song.id}
                    onClick={() => addSongMutation.mutate(song.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 text-left transition-colors"
                  >
                    <Music size={15} className="text-indigo-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-gray-800 truncate">{song.title}</p>
                      <p className="text-xs text-gray-400">{[song.artist, song.key].filter(Boolean).join(" · ")}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Setlists page ───────────────────────────────────────────────────────

export default function Setlists() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const { data: setlists = [], isLoading } = useQuery({
    queryKey: ["setlists"],
    queryFn: () => apiFetch<Setlist[]>("/api/setlists"),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/setlists", {
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
    mutationFn: (id: number) => apiFetch(`/api/setlists/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["setlists"] }),
  });

  if (selectedId !== null) {
    return <SetlistDetail id={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/songs")}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft size={15} /> Låtar
          </button>
          <span className="text-gray-200">|</span>
          <div className="flex items-center gap-2">
            <ListMusic size={16} className="text-indigo-400" />
            <span className="font-semibold text-gray-800">Spellistor</span>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> Ny spellista
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-16 text-gray-400">Laddar…</div>
        ) : setlists.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ListMusic size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold text-lg">Inga spellistor ännu</p>
            <p className="text-sm mt-2 mb-6">Skapa din första spellista för en konsert eller repetition</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} /> Skapa spellista
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {setlists.map((sl) => (
              <div
                key={sl.id}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:border-indigo-300 hover:shadow-sm transition-all group cursor-pointer"
                onClick={() => setSelectedId(sl.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <ListMusic size={18} className="text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800">{sl.name}</p>
                  {sl.description && (
                    <p className="text-xs text-gray-400 truncate">{sl.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">{sl.songCount ?? 0} låtar</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(sl.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-bold text-gray-900">Ny spellista</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Namn *</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate()}
                  placeholder="t.ex. Jazzgig 14 april"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1.5">Beskrivning</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Valfri beskrivning…"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-gray-50 flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Save size={14} /> Skapa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
