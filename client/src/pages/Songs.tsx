import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Music, Plus, LogOut, ChevronRight, Search, Upload, ListMusic } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { Song } from "../../shared/types";
import ImportDialog from "../components/ImportDialog";

const KEYS = [
  "C","Db","D","Eb","E","F","F#","G","Ab","A","Bb","B",
  "Cm","Dm","Em","Fm","Gm","Am","Bm",
];

const DEFAULT_SECTIONS = [
  { id: crypto.randomUUID(), name: "A", type: "bars" as const,
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
  const [preferredFormat, setPreferredFormat] = useState<"ireal" | "songbook" | "notation">("ireal");
  const [search, setSearch] = useState("");

  const { data: songs = [], isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: async () => {
      const res = await apiFetch<Song[]>("/api/songs");
      return res;
    },
  });

  const createSong = useMutation({
    mutationFn: () =>
      apiFetch<Song>("/api/songs", {
        method: "POST",
        body: JSON.stringify({
          title: title || "Namnlös låt",
          artist, key, style,
          tempo: 120,
          timeSignature: "4/4",
          sections: DEFAULT_SECTIONS,
          preferredFormat,
        }),
      }),
    onSuccess: (song) => {
      queryClient.invalidateQueries({ queryKey: ["songs"] });
      setShowNew(false);
      setTitle(""); setArtist(""); setKey("C"); setStyle(""); setPreferredFormat("ireal");
      setLocation(`/editor/${song.id}`);
    },
  });

  const deleteSong = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/songs/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["songs"] }),
  });

  const logout = () => {
    localStorage.removeItem("token");
    setLocation("/login");
  };

  const filtered = songs.filter((s: any) =>
    !search ||
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.artist?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Music className="text-indigo-600" size={20} />
          <span className="text-lg font-bold text-indigo-700">DAJO</span>
        </div>
        <button onClick={logout}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <LogOut size={15} /> Logga ut
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Mina låtar</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/setlists")}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-500
                         text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ListMusic size={15} /> Spellistor
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 px-4 py-2 border border-indigo-300 text-indigo-600
                         text-sm rounded-lg hover:bg-indigo-50 transition-colors"
            >
              <Upload size={15} /> Importera
            </button>
            <button
              onClick={() => setShowNew(!showNew)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm
                         rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} /> Ny låt
            </button>
          </div>
        </div>

        {/* Search */}
        {songs.length > 3 && (
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök låtar…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            />
          </div>
        )}

        {/* New song form */}
        {showNew && (
          <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-5 mb-4">
            <h2 className="font-semibold text-gray-700 mb-4 text-sm">Ny låt</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Titel *" value={title} onChange={(e) => setTitle(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                autoFocus />
              <input placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              <div className="flex gap-2">
                <select value={key} onChange={(e) => setKey(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                  {KEYS.map((k) => <option key={k}>{k}</option>)}
                </select>
                <input placeholder="Stil (Jazz, Pop…)" value={style} onChange={(e) => setStyle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
              </div>
              <select value={preferredFormat} onChange={(e) => setPreferredFormat(e.target.value as "ireal" | "songbook" | "notation")}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300">
                <option value="ireal">iReal Grid</option>
                <option value="songbook">Songbook</option>
                <option value="notation">Notation</option>
              </select>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => createSong.mutate()}
                  disabled={createSong.isPending}
                  className="flex-1 py-2 bg-indigo-600 text-white text-sm rounded-lg
                             hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                >
                  {createSong.isPending ? "Skapar…" : "Skapa och öppna editor"}
                </button>
                <button onClick={() => setShowNew(false)}
                  className="px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Song list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Music size={40} className="mx-auto mb-3 opacity-20" />
            <p>{search ? "Inga låtar matchar sökningen" : "Inga låtar ännu — skapa din första!"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((song: any) => (
              <div
                key={song.id}
                onClick={() => setLocation(`/editor/${song.id}`)}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4
                           flex items-center justify-between group hover:border-indigo-200
                           hover:shadow-md transition-all cursor-pointer"
              >
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-900 truncate">{song.title}</h2>
                  <p className="text-sm text-gray-400 truncate">
                    {[song.artist, song.key, song.style, song.tempo && `♩${song.tempo}`]
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSong.mutate(song.id); }}
                    className="text-xs text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Radera
                  </button>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showImport && <ImportDialog onClose={() => setShowImport(false)} />}
    </div>
  );
}
