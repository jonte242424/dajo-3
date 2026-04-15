import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ListMusic, Plus, Trash2, ChevronRight, GripVertical,
  ArrowLeft, Save, X, Music, Download,
} from "lucide-react";
import { Logo } from "../components/Logo";
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
      className="flex items-center gap-3 p-3.5 bg-white rounded-2xl border border-cream2 shadow-soft hover:shadow-lift transition-all group"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-ink-faint hover:text-ink-soft cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-display font-bold text-ink truncate text-sm">{song.title}</p>
        <p className="text-xs text-ink-faint mt-0.5">
          {[song.artist, song.key, song.tempo ? `♩${song.tempo}` : ""].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        onClick={() => onRemove(song.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-rose/70 hover:text-rose p-1"
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

  async function handleSetlistExport(style: "ireal" | "songbook" | "notation" = "ireal") {
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`/api/setlists/${id}/export?style=${style}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Export failed:", data.error);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = (setlist?.name || "spellista")
        .replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      a.download = `${safeName}_${style}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
  }

  const alreadyInList = new Set(songs.map((s) => s.id));
  const available = allSongs.filter((s: any) => !alreadyInList.has(s.id));

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-ink-faint">Laddar…</div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft mb-6 transition-colors"
      >
        <ArrowLeft size={15} /> Spellistor
      </button>

      <div className="flex items-start justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-ink">{setlist?.name}</h1>
          {setlist?.description && (
            <p className="text-ink-soft text-sm mt-1.5">{setlist.description}</p>
          )}
          <p className="text-xs text-ink-faint mt-1.5">{songs.length} låtar</p>
        </div>
        <div className="flex gap-2">
          {songs.length > 0 && (
            <button
              onClick={() => handleSetlistExport("ireal")}
              className="flex items-center gap-1.5 px-3 py-2 border border-cream2 bg-white text-ink-soft rounded-xl text-sm font-medium hover:bg-cream2 hover:text-ink transition-colors"
              title="Exportera spellista som PDF (iReal-stil)"
            >
              <Download size={15} /> Exportera
            </button>
          )}
          <button
            onClick={() => setShowAddSong(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-steel-600 text-white rounded-xl text-sm font-semibold hover:bg-steel-700 transition-colors shadow-soft"
          >
            <Plus size={15} /> Lägg till låt
          </button>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="text-center py-20 bg-white/60 rounded-3xl border border-cream2">
          <ListMusic size={36} className="mx-auto mb-3 text-ink-faint opacity-60" />
          <p className="font-display font-bold text-ink">Spellistan är tom</p>
          <p className="text-sm mt-1.5 text-ink-soft">Lägg till låtar från ditt bibliotek</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={songs.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2.5">
              {songs.map((song, idx) => (
                <div key={song.id} className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold text-ink-faint w-5 text-right">{idx + 1}</span>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-lift border border-cream2 w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream2">
              <h3 className="font-display font-bold text-ink">Lägg till låt</h3>
              <button onClick={() => setShowAddSong(false)} className="text-ink-faint hover:text-ink-soft">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1">
              {available.length === 0 ? (
                <p className="text-center text-ink-faint py-10 text-sm">Alla låtar är redan med</p>
              ) : (
                available.map((song: any) => (
                  <button
                    key={song.id}
                    onClick={() => addSongMutation.mutate(song.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 text-left transition-colors"
                  >
                    <Music size={15} className="text-amber-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-ink truncate">{song.title}</p>
                      <p className="text-xs text-ink-faint">{[song.artist, song.key].filter(Boolean).join(" · ")}</p>
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
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-cream2 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/songs")}
            className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors"
          >
            <ArrowLeft size={15} /> Låtar
          </button>
          <span className="text-cream2">|</span>
          <Logo size="sm" />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-steel-600 text-white text-sm font-semibold rounded-xl hover:bg-steel-700 transition-colors shadow-soft"
        >
          <Plus size={14} /> Ny spellista
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-2.5 mb-6">
          <ListMusic className="text-amber-600" size={24} />
          <h1 className="font-display text-3xl font-extrabold text-ink">Spellistor</h1>
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-ink-faint">Laddar…</div>
        ) : setlists.length === 0 ? (
          <div className="text-center py-20 bg-white/60 rounded-3xl border border-cream2">
            <ListMusic size={48} className="mx-auto mb-4 text-ink-faint opacity-60" />
            <p className="font-display font-bold text-ink text-lg">Inga spellistor ännu</p>
            <p className="text-sm mt-2 mb-6 text-ink-soft">Skapa din första spellista för en konsert eller repetition</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-steel-600 text-white rounded-xl text-sm font-semibold hover:bg-steel-700 transition-colors shadow-soft"
            >
              <Plus size={15} /> Skapa spellista
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {setlists.map((sl) => (
              <div
                key={sl.id}
                className="bg-white rounded-2xl border border-cream2 p-4 flex items-center gap-4 hover:border-amber-200 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all group cursor-pointer"
                onClick={() => setSelectedId(sl.id)}
              >
                <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <ListMusic size={18} className="text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-ink">{sl.name}</p>
                  {sl.description && (
                    <p className="text-xs text-ink-soft truncate">{sl.description}</p>
                  )}
                  <p className="text-xs text-ink-faint mt-0.5">{sl.songCount ?? 0} låtar</p>
                </div>
                <ChevronRight size={18} className="text-ink-faint group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(sl.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-rose/70 hover:text-rose p-1.5 rounded-lg hover:bg-rose/10"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-lift border border-cream2 w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream2">
              <h3 className="font-display font-bold text-ink">Ny spellista</h3>
              <button onClick={() => setShowCreate(false)} className="text-ink-faint hover:text-ink-soft">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Namn *</label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate()}
                  placeholder="t.ex. Jazzgig 14 april"
                  className="w-full px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Beskrivning</label>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Valfri beskrivning…"
                  className="w-full px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-cream flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-cream2 bg-white text-ink-soft text-sm font-medium hover:bg-cream2 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!newName.trim() || createMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-steel-600 text-white text-sm font-semibold hover:bg-steel-700 disabled:opacity-50 transition-colors shadow-soft"
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
