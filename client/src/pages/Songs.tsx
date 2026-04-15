import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Music, Plus, LogOut, ChevronRight, Search, Upload, ListMusic, Users, ShieldCheck } from "lucide-react";
import { apiFetch } from "../lib/api";
import type { Song } from "../../shared/types";
import ImportDialog from "../components/ImportDialog";
import { Logo } from "../components/Logo";

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

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<{ user: { id: number; email: string; isAdmin?: boolean } }>("/api/auth/me"),
    staleTime: 5 * 60_000,
  });
  const isAdmin = !!me?.user?.isAdmin;

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
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-cream2 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <Logo size="md" />
        <button onClick={logout}
          className="flex items-center gap-1.5 text-sm text-ink-faint hover:text-ink-soft transition-colors">
          <LogOut size={15} /> Logga ut
        </button>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-display text-3xl font-extrabold text-ink">Mina låtar</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setLocation("/setlists")}
              className="flex items-center gap-1.5 px-3 py-2 border border-cream2 bg-white text-ink-soft
                         text-sm rounded-xl hover:bg-cream2 hover:text-ink transition-colors"
            >
              <ListMusic size={15} /> Spellistor
            </button>
            <button
              onClick={() => setLocation("/groups")}
              className="flex items-center gap-1.5 px-3 py-2 border border-cream2 bg-white text-ink-soft
                         text-sm rounded-xl hover:bg-cream2 hover:text-ink transition-colors"
            >
              <Users size={15} /> Bandspaces
            </button>
            {isAdmin && (
              <button
                onClick={() => setLocation("/admin/pilot")}
                title="Pilot-admin"
                className="flex items-center gap-1.5 px-3 py-2 border border-amber-300 bg-amber-50 text-amber-800
                           text-sm rounded-xl hover:bg-amber-100 transition-colors"
              >
                <ShieldCheck size={15} /> Pilot
              </button>
            )}
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-amber-300 bg-white text-amber-700
                         text-sm rounded-xl hover:bg-amber-50 transition-colors"
            >
              <Upload size={15} /> Importera
            </button>
            <button
              onClick={() => setShowNew(!showNew)}
              className="flex items-center gap-1.5 px-4 py-2 bg-steel-600 text-white text-sm font-semibold
                         rounded-xl hover:bg-steel-700 transition-colors shadow-soft"
            >
              <Plus size={15} /> Ny låt
            </button>
          </div>
        </div>

        {/* Search */}
        {songs.length > 3 && (
          <div className="relative mb-5">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Sök låtar…"
              className="w-full pl-10 pr-4 py-2.5 border border-cream2 rounded-xl text-sm
                         focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white bg-white/70"
            />
          </div>
        )}

        {/* New song form */}
        {showNew && (
          <div className="bg-white rounded-3xl border border-cream2 shadow-lift p-6 mb-5">
            <h2 className="font-display font-bold text-ink mb-4">Ny låt</h2>
            <div className="flex flex-col gap-3">
              <input placeholder="Titel *" value={title} onChange={(e) => setTitle(e.target.value)}
                className="px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
                autoFocus />
              <input placeholder="Artist" value={artist} onChange={(e) => setArtist(e.target.value)}
                className="px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" />
              <div className="flex gap-2">
                <select value={key} onChange={(e) => setKey(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all">
                  {KEYS.map((k) => <option key={k}>{k}</option>)}
                </select>
                <input placeholder="Stil (Jazz, Pop…)" value={style} onChange={(e) => setStyle(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all" />
              </div>
              <select value={preferredFormat} onChange={(e) => setPreferredFormat(e.target.value as "ireal" | "songbook" | "notation")}
                className="px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all">
                <option value="ireal">iReal Grid</option>
                <option value="songbook">Songbook</option>
                <option value="notation">Notation</option>
              </select>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => createSong.mutate()}
                  disabled={createSong.isPending}
                  className="flex-1 py-2.5 bg-steel-600 text-white text-sm font-semibold rounded-xl
                             hover:bg-steel-700 disabled:opacity-40 transition-colors shadow-soft"
                >
                  {createSong.isPending ? "Skapar…" : "Skapa och öppna editor"}
                </button>
                <button onClick={() => setShowNew(false)}
                  className="px-5 text-sm text-ink-faint hover:text-ink-soft transition-colors">
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
              <div key={i} className="h-18 bg-cream2 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-ink-faint bg-white/60 rounded-3xl border border-cream2">
            <Music size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">{search ? "Inga låtar matchar sökningen" : "Inga låtar ännu — skapa din första!"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((song: any) => (
              <div
                key={song.id}
                onClick={() => setLocation(`/editor/${song.id}`)}
                className="bg-white rounded-2xl border border-cream2 shadow-soft px-5 py-4
                           flex items-center justify-between group hover:border-amber-200
                           hover:shadow-lift hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                <div className="min-w-0">
                  <h2 className="font-display font-bold text-ink truncate">{song.title}</h2>
                  <p className="text-sm text-ink-faint truncate mt-0.5">
                    {[song.artist, song.key, song.style, song.tempo && `♩${song.tempo}`]
                      .filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteSong.mutate(song.id); }}
                    className="text-xs text-rose/70 hover:text-rose font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Radera
                  </button>
                  <ChevronRight size={18} className="text-ink-faint group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all" />
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
