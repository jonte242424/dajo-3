/**
 * Publik visning av en delad låt — ingen inloggning krävs
 */
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Music, Share2, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Song, Section, Bar } from "../../shared/types";
import { ChordPlayerButton } from "../components/ChordPlayer";

async function fetchPublicSong(id: string): Promise<Song> {
  const res = await fetch(`/api/songs/public/${id}`);
  if (!res.ok) throw new Error("Låten hittades inte eller är inte offentlig");
  return res.json();
}

function PublicBarCell({ bar }: { bar: Bar }) {
  const ch = bar.chords ?? [];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 min-h-[56px] flex flex-col justify-center">
      {ch.length === 0 ? (
        <span className="text-gray-300 text-lg text-center">%</span>
      ) : ch.length === 1 ? (
        <span className="font-bold text-gray-900 text-lg text-center">{ch[0].symbol}</span>
      ) : (
        <div className="flex gap-1">
          {ch.map((c, i) => (
            <span key={i} className="font-bold text-gray-900 text-sm flex-1 text-center">{c.symbol}</span>
          ))}
        </div>
      )}
      {bar.lyrics && (
        <p className="text-xs text-gray-400 italic mt-1 truncate text-center">{bar.lyrics}</p>
      )}
    </div>
  );
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

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400 bg-gray-50">
      Laddar låt…
    </div>
  );

  if (isError || !song) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
      <Music size={40} className="mb-4 opacity-30" />
      <p className="font-semibold">Låten hittades inte</p>
      <p className="text-sm mt-1">Den kanske inte är offentlig längre</p>
    </div>
  );

  // Samla alla ackord för uppspelning
  const allChords: string[] = [];
  (song.sections ?? []).forEach((sec: Section) => {
    (sec.bars ?? []).forEach((bar) => {
      (bar.chords ?? []).forEach((c) => {
        if (c.symbol) allChords.push(c.symbol);
      });
    });
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-gray-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Music size={14} className="text-white" />
          </div>
          <span className="font-bold text-gray-800 text-sm">DAJO 3.0</span>
        </div>
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          {copied ? "Kopierad!" : "Kopiera länk"}
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Song header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{song.title}</h1>
          {song.artist && <p className="text-gray-500 mt-1 text-lg">{song.artist}</p>}
          <div className="flex flex-wrap gap-3 mt-3">
            {song.key && (
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                Tonart: {song.key}
              </span>
            )}
            {song.tempo && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                ♩ = {song.tempo}
              </span>
            )}
            {(song as any).timeSignature && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {(song as any).timeSignature}
              </span>
            )}
            {song.style && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                {song.style}
              </span>
            )}
          </div>

          {/* Spela hela låten */}
          {allChords.length > 0 && (
            <div className="mt-4">
              <ChordPlayerButton chords={allChords} />
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="space-y-8">
          {(song.sections ?? []).map((section: Section) => (
            <div key={section.id}>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-indigo-600 text-white text-sm font-bold rounded-lg">
                  {section.name}
                </span>
                {section.type === "bars" && section.bars && (
                  <ChordPlayerButton
                    chords={section.bars.flatMap((b) => b.chords.map((c) => c.symbol)).filter(Boolean)}
                    className="opacity-60 hover:opacity-100"
                  />
                )}
              </div>

              {section.type === "note" ? (
                <p className="text-gray-500 italic text-sm pl-2 border-l-2 border-gray-200">
                  {section.noteText}
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {(section.bars ?? []).map((bar, i) => (
                    <PublicBarCell key={i} bar={bar} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {song.notes && (
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-xs text-amber-700 font-medium uppercase tracking-wide mb-1">Anteckningar</p>
            <p className="text-gray-700 text-sm">{song.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400">Delad via</p>
          <p className="text-sm font-semibold text-indigo-600 mt-0.5">DAJO 3.0 — Music chord charts</p>
        </div>
      </div>
    </div>
  );
}
