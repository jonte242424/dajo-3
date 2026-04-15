/**
 * Publik visning av en delad låt — ingen inloggning krävs
 */
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Music, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { Song, Section, Bar, NoteColor } from "../../shared/types";
import { ChordPlayerButton } from "../components/ChordPlayer";
import { Logo } from "../components/Logo";

async function fetchPublicSong(id: string): Promise<Song> {
  const res = await fetch(`/api/songs/public/${id}`);
  if (!res.ok) throw new Error("Låten hittades inte eller är inte offentlig");
  return res.json();
}

// Color palette matching Editor.tsx
const NOTE_COLOR_CLASSES: Record<NoteColor, { bg: string; border: string; text: string }> = {
  default: { bg: "bg-gray-50",    border: "border-gray-300",    text: "text-gray-700" },
  yellow:  { bg: "bg-yellow-50",  border: "border-yellow-400",  text: "text-yellow-900" },
  blue:    { bg: "bg-sky-50",     border: "border-sky-400",     text: "text-sky-900" },
  green:   { bg: "bg-emerald-50", border: "border-emerald-400", text: "text-emerald-900" },
  red:     { bg: "bg-rose-50",    border: "border-rose-400",    text: "text-rose-900" },
  purple:  { bg: "bg-purple-50",  border: "border-purple-400",  text: "text-purple-900" },
  orange:  { bg: "bg-orange-50",  border: "border-orange-400",  text: "text-orange-900" },
};

function PublicBarCell({ bar }: { bar: Bar }) {
  const ch = bar.chords ?? [];
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-3 min-h-[56px] flex flex-col justify-center">
      {/* Repeat markers */}
      {bar.repeat && bar.repeat !== "none" && (
        <span
          className="absolute top-1 left-1 text-steel-500 font-bold text-xs"
          title="Repris"
        >
          {bar.repeat === "start" ? "‖:" : bar.repeat === "end" ? ":‖" : "‖:‖"}
        </span>
      )}
      {/* Volta bracket */}
      {typeof bar.ending === "number" && bar.ending > 0 && (
        <span
          className="absolute top-1 right-1 text-[10px] font-bold text-steel-600 border-t-2 border-l-2 border-steel-600 px-1"
          title={`Volta ${bar.ending}`}
        >
          {bar.ending}.
        </span>
      )}

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
      {/* Navigation marker (D.S., Fine, Coda, Segno) */}
      {bar.navigation && (
        <span
          className="block text-center text-[10px] font-bold text-amber-700 mt-0.5 uppercase tracking-wide"
          title="Navigationsmarkering"
        >
          {bar.navigation}
        </span>
      )}
      {/* Play-count indicator */}
      {bar.repeatCount && bar.repeatCount > 1 && (
        <span className="absolute bottom-0.5 right-1 text-[9px] text-gray-400">
          ×{bar.repeatCount}
        </span>
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
    <div className="min-h-screen flex items-center justify-center text-ink-faint bg-cream">
      Laddar låt…
    </div>
  );

  if (isError || !song) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cream text-ink-soft">
      <Music size={40} className="mb-4 opacity-40" />
      <p className="font-display font-bold text-ink">Låten hittades inte</p>
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
    <div className="min-h-screen bg-sunburst">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-cream2 px-6 py-4 flex items-center justify-between">
        <Logo size="sm" />
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-steel-600 transition-colors"
        >
          {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
          {copied ? "Kopierad!" : "Kopiera länk"}
        </button>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Song header */}
        <div className="mb-8">
          <h1 className="font-display text-4xl font-extrabold text-ink">{song.title}</h1>
          {song.artist && <p className="text-ink-soft mt-1.5 text-lg">{song.artist}</p>}
          <div className="flex flex-wrap gap-2 mt-4">
            {song.key && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold">
                Tonart: {song.key}
              </span>
            )}
            {song.tempo && (
              <span className="px-3 py-1 bg-cream2 text-ink-soft rounded-full text-sm">
                ♩ = {song.tempo}
              </span>
            )}
            {(song as any).timeSignature && (
              <span className="px-3 py-1 bg-cream2 text-ink-soft rounded-full text-sm">
                {(song as any).timeSignature}
              </span>
            )}
            {song.style && (
              <span className="px-3 py-1 bg-cream2 text-ink-soft rounded-full text-sm">
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
                <span className="px-3 py-1 bg-steel-600 text-white text-sm font-bold rounded-xl shadow-soft">
                  {section.name}
                </span>
                {section.type === "bars" && section.bars && (
                  <ChordPlayerButton
                    chords={section.bars.flatMap((b) => b.chords.map((c) => c.symbol)).filter(Boolean)}
                    className="opacity-60 hover:opacity-100"
                  />
                )}
              </div>

              {section.type === "note" ? (() => {
                const color: NoteColor = section.noteColor ?? "yellow";
                const cls = NOTE_COLOR_CLASSES[color];
                return (
                  <div className={`rounded-lg border-l-4 ${cls.border} ${cls.bg} p-3`}>
                    <p className={`${cls.text} text-sm whitespace-pre-wrap`}>
                      {section.noteText}
                    </p>
                  </div>
                );
              })() : (
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
          <div className="mt-8 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
            <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-1.5">Anteckningar</p>
            <p className="text-ink text-sm">{song.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-ink-faint">Delad via</p>
          <p className="font-display text-sm font-bold text-steel-700 mt-0.5">DAJO — ackord utan strul</p>
        </div>
      </div>
    </div>
  );
}
