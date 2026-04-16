/**
 * ImportDialog — AI-powered file import
 * Supports: PDF, PNG, JPEG, WebP
 * Uses Claude Vision to detect chords, sections, and song structure
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Upload, X, FileText, Image, Loader2,
  CheckCircle2, AlertCircle, Music, ChevronRight,
  Grid3x3, BookOpen, Music2, Volume2, Mic, Clock,
} from "lucide-react";
import { apiFetch } from "../lib/api";

type Step = "idle" | "uploading" | "audio-confirm" | "analyzing" | "preview" | "saving" | "done" | "error";
type Format = "ireal" | "songbook" | "notation";

interface ImportedSong {
  title: string;
  artist: string;
  key: string;
  tempo: number;
  timeSignature: string;
  style: string;
  preferredFormat: Format;
  sections: any[];
}

const FORMAT_LABELS: Record<Format, { label: string; desc: string; icon: React.ReactNode }> = {
  ireal:    { label: "iReal",    desc: "Ackordschema i rutnät",         icon: <Grid3x3 size={14} /> },
  songbook: { label: "Songbook", desc: "Text + ackord (ChordPro)",      icon: <BookOpen size={14} /> },
  notation: { label: "Notation", desc: "Notlinjer + leadsheet",         icon: <Music2 size={14} /> },
};

interface Props {
  onClose: () => void;
}

// Formaten delas upp så vi kan stänga av audio-knappen i prod tills Flask-
// backenden faktiskt är deployad (se /api/import/capabilities).
const ACCEPTED_CORE = [
  "application/pdf",
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "text/plain", "text/x-chordpro", "application/x-chordpro",
];
const ACCEPTED_AUDIO = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4"];
const ACCEPTED_EXT_CORE = ".pdf,.jpg,.jpeg,.png,.webp,.gif,.pro,.cho,.chopro";
const ACCEPTED_EXT_AUDIO = ",.mp3,.wav,.ogg,.m4a";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix: "data:application/pdf;base64,..."
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function FileIcon({ type }: { type: string }) {
  if (type === "application/pdf") return <FileText size={20} className="text-red-400" />;
  if (type.startsWith("audio/")) return <Volume2 size={20} className="text-green-400" />;
  return <Image size={20} className="text-blue-400" />;
}

export default function ImportDialog({ onClose }: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [songs, setSongs] = useState<ImportedSong[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const [tokens, setTokens] = useState(0);
  const [detectedFormat, setDetectedFormat] = useState<Format>("ireal");
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [detectionSignals, setDetectionSignals] = useState<string[]>([]);
  const [overrideFormat, setOverrideFormat] = useState<Format | null>(null);
  const [fileBase64, setFileBase64] = useState<string>("");
  const [fileMediaType, setFileMediaType] = useState<string>("");
  const [transcribeLyrics, setTranscribeLyrics] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [audioEnabled, setAudioEnabled] = useState(false);

  // Fråga servern om ljudimport är reellt tillgängligt (Flask-tjänsten
  // behöver vara uppe). Tyst fail = audio blir dolt, vilket är rätt default.
  useEffect(() => {
    fetch("/api/import/capabilities")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setAudioEnabled(Boolean(j?.audio)))
      .catch(() => setAudioEnabled(false));
  }, []);

  const ACCEPTED = audioEnabled ? [...ACCEPTED_CORE, ...ACCEPTED_AUDIO] : ACCEPTED_CORE;
  const ACCEPTED_EXT = audioEnabled ? ACCEPTED_EXT_CORE + ACCEPTED_EXT_AUDIO : ACCEPTED_EXT_CORE;

  const runAnalysis = useCallback(async (
    f: File,
    base64: string,
    opts: { transcribeLyrics: boolean }
  ) => {
    setStep("analyzing");
    try {
      const result = await apiFetch<{
        songs: ImportedSong[];
        tokensUsed: number;
        model: string;
        detectedFormat: Format;
        detectionConfidence: number;
        detectionSignals: string[];
      }>(
        "/api/import/analyze",
        {
          method: "POST",
          body: JSON.stringify({
            base64,
            mediaType: f.type,
            filename: f.name,
            transcribeLyrics: opts.transcribeLyrics,
          }),
        }
      );

      setSongs(result.songs);
      setModel(result.model);
      setTokens(result.tokensUsed);
      setDetectedFormat(result.detectedFormat ?? result.songs[0]?.preferredFormat ?? "ireal");
      setDetectionConfidence(result.detectionConfidence ?? 0);
      setDetectionSignals(result.detectionSignals ?? []);
      setOverrideFormat(null);
      setSelected(new Set(result.songs.map((_, i) => i)));
      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Analysen misslyckades");
      setStep("error");
    }
  }, []);

  const processFile = useCallback(async (f: File) => {
    // Check file extension for .pro files
    const ext = f.name.split('.').pop()?.toLowerCase();
    const isProFile = ['pro', 'cho', 'chopro', 'chordpro'].includes(ext || '');

    if (!ACCEPTED.includes(f.type) && !isProFile) {
      setError(
        audioEnabled
          ? "Filtypen stöds inte. Använd PDF, PNG, JPEG, WebP, ChordPro (.pro) eller audio (MP3/WAV)."
          : "Filtypen stöds inte. Använd PDF, PNG, JPEG, WebP eller ChordPro (.pro)."
      );
      setStep("error");
      return;
    }

    setFile(f);
    setError("");
    setStep("uploading");

    try {
      const base64 = await fileToBase64(f);
      setFileBase64(base64);
      setFileMediaType(f.type);

      // For audio files, pause and ask about lyrics transcription before starting analysis.
      // For PDFs/images/ChordPro, go straight to analysis.
      if (f.type.startsWith("audio/")) {
        setTranscribeLyrics(false);
        setStep("audio-confirm");
        return;
      }

      await runAnalysis(f, base64, { transcribeLyrics: false });
    } catch (err: any) {
      setError(err.message || "Analysen misslyckades");
      setStep("error");
    }
  }, [runAnalysis]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  }, [processFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
  };

  const toggleSelect = (i: number) => {
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
    if (toSave.length === 0) return;

    setStep("saving");
    try {
      // Include original file data for side-by-side view in editor
      const isImageOrPdf = !file?.type.startsWith("audio/");
      const result = await apiFetch<{ saved: { id: number; title: string }[] }>(
        "/api/import/save",
        { method: "POST", body: JSON.stringify({
          songs: toSave,
          originalFileData: isImageOrPdf ? fileBase64 : undefined,
          originalFileType: isImageOrPdf ? fileMediaType : undefined,
        }) }
      );

      await queryClient.invalidateQueries({ queryKey: ["songs"] });
      setStep("done");

      // If only one song saved, navigate to it
      if (result.saved.length === 1) {
        setTimeout(() => {
          onClose();
          setLocation(`/editor/${result.saved[0].id}`);
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || "Kunde inte spara låtar");
      setStep("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-lift border border-cream2 w-full max-w-lg overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream2">
          <div className="flex items-center gap-2">
            <Music size={18} className="text-amber-600" />
            <h2 className="font-display font-bold text-ink">Importera med AI</h2>
          </div>
          <button onClick={onClose} className="text-ink-faint hover:text-ink-soft transition-colors p-1.5 rounded-lg hover:bg-cream2">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {/* IDLE / DROP ZONE */}
          {(step === "idle" || step === "error") && (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
                  ${dragOver
                    ? "border-amber-400 bg-amber-50"
                    : "border-cream2 hover:border-amber-300 hover:bg-cream"}`}
              >
                <Upload size={32} className={`mx-auto mb-3 transition-colors ${dragOver ? "text-amber-500" : "text-ink-faint"}`} />
                <p className="font-display font-bold text-ink mb-1">Dra hit eller klicka för att välja fil</p>
                <p className="text-sm text-ink-soft">
                  {audioEnabled
                    ? "PDF, PNG, JPEG, WebP, ChordPro (.pro), MP3, WAV — upp till 100MB"
                    : "PDF, PNG, JPEG, WebP, ChordPro (.pro) — upp till 100MB"}
                </p>
                <p className="text-xs text-amber-700 mt-3">
                  {audioEnabled
                    ? "Claude AI analyserar noter, ackordscheman, inspelningar och kompskisser"
                    : "Claude AI analyserar noter, ackordscheman och kompskisser"}
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={ACCEPTED_EXT}
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {step === "error" && (
                <div className="mt-4 flex items-start gap-2 text-red-600 bg-red-50 rounded-lg p-3">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </>
          )}

          {/* UPLOADING */}
          {step === "uploading" && (
            <div className="text-center py-10">
              <Loader2 size={36} className="mx-auto mb-4 text-steel-400 animate-spin" />
              <p className="font-medium text-gray-700">Laddar upp {file?.name}…</p>
            </div>
          )}

          {/* AUDIO CONFIRM — gate before heavy analysis so user can opt into lyrics */}
          {step === "audio-confirm" && file && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <Volume2 size={20} className="text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm text-gray-900 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(1)} MB · ljudfil
                  </p>
                </div>
              </div>

              <label
                className={`block rounded-xl border p-3 cursor-pointer transition-colors
                  ${transcribeLyrics
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-gray-200 hover:border-emerald-300"}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors
                    ${transcribeLyrics ? "border-emerald-500 bg-emerald-500" : "border-gray-300"}`}>
                    {transcribeLyrics && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Mic size={14} className="text-emerald-600" />
                      <span className="font-medium text-sm text-gray-800">
                        Filen innehåller sångtext
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">
                      Isolerar rösten (Demucs) och transkriberar med Whisper. Texten placeras
                      automatiskt under rätt takt.
                    </p>
                    {transcribeLyrics && (
                      <p className="flex items-center gap-1 text-xs text-amber-700">
                        <Clock size={11} />
                        Tar längre tid — räkna med ca 1–2 minuter istället för 10 sek
                      </p>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={transcribeLyrics}
                    onChange={(e) => setTranscribeLyrics(e.target.checked)}
                  />
                </div>
              </label>

              <div className="flex gap-2">
                <button
                  onClick={() => runAnalysis(file, fileBase64, { transcribeLyrics })}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600
                             text-white text-sm rounded-xl hover:bg-emerald-700
                             transition-colors font-medium"
                >
                  Starta analys
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => { setStep("idle"); setFile(null); setFileBase64(""); }}
                  className="px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          )}

          {/* ANALYZING */}
          {step === "analyzing" && (
            <div className="text-center py-10">
              <div className="relative mx-auto mb-4 w-12 h-12">
                <Loader2 size={48} className={`${file?.type.startsWith("audio/") ? "text-emerald-400" : "text-steel-400"} animate-spin`} />
                {file?.type.startsWith("audio/") ? (
                  <Volume2 size={20} className="absolute inset-0 m-auto text-emerald-600" />
                ) : (
                  <Music size={20} className="absolute inset-0 m-auto text-steel-600" />
                )}
              </div>
              {file?.type.startsWith("audio/") ? (
                <>
                  <p className="font-medium text-gray-700 mb-2">
                    {transcribeLyrics ? "Analyserar ljud + sångtext…" : "Analyserar ljud…"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {transcribeLyrics
                      ? "Ackord, tempo, tonart + isolerar röst och transkriberar text"
                      : "Detekterar tempo, tonart och ackordprogression"}
                  </p>
                  <p className="text-xs text-gray-300 mt-2">
                    {transcribeLyrics
                      ? "Demucs + Whisper medium · ~1–2 min"
                      : "Beat-synkronisering · template-matchning · tar ~10-30 sek"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-700 mb-2">Claude analyserar filen…</p>
                  <p className="text-sm text-gray-400">Identifierar ackord, sektioner och struktur</p>
                </>
              )}
              <div className="mt-4 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full animate-bounce ${file?.type.startsWith("audio/") ? "bg-emerald-300" : "bg-steel-300"}`}
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* PREVIEW */}
          {step === "preview" && (
            <>
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" />
                <span className="text-sm text-gray-600">
                  {songs.length === 1 ? "1 låt hittad" : `${songs.length} låtar hittade`}
                </span>
                <span className="ml-auto text-xs text-gray-300">{tokens.toLocaleString()} tokens</span>
              </div>

              {/* Attribution for audio files */}
              {file?.type.startsWith("audio/") && (() => {
                const hasWarning = detectionSignals?.some(s => s.startsWith("warning:"));
                return (
                  <div className={`mb-4 rounded-xl border p-3 ${hasWarning ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                    <div className="flex items-start gap-2">
                      <Volume2 size={16} className={`shrink-0 mt-0.5 ${hasWarning ? "text-amber-600" : "text-emerald-600"}`} />
                      <div className="flex-1 min-w-0">
                        {hasWarning ? (
                          <>
                            <p className="text-xs font-semibold text-amber-900 mb-1">
                              Ackorddetektering ej tillgänglig
                            </p>
                            {detectionSignals
                              .filter(s => s.startsWith("warning:") || s.startsWith("lösning:") || s.includes("manuellt"))
                              .map((s, i) => (
                                <p key={i} className="text-xs text-amber-800 mb-0.5">
                                  {s.replace(/^(warning|lösning):\s*/, "")}
                                </p>
                              ))}
                          </>
                        ) : (
                          <>
                            <p className="text-xs font-semibold text-emerald-900 mb-1">
                              Ackorddetektering från ljud
                            </p>
                            <p className="text-xs text-emerald-700 mb-2">
                              Använder <a
                                href="https://github.com/ptnghia-j/ChordMiniApp"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold hover:underline"
                              >
                                ChordMiniApp
                              </a> för ackordanalys (MIT licensed)
                            </p>
                            {detectionSignals && detectionSignals.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {detectionSignals
                                  .filter(s => !s.startsWith("warning:") && !s.startsWith("attribution:"))
                                  .map((signal, i) => (
                                    <span key={i} className="inline-block text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                                      {signal
                                        .replace("audio-detected: ", "🎵 ")
                                        .replace("unique chords: ", "🎹 ")
                                        .replace("key: ", "🔑 ")
                                        .replace("tempo: ", "♩ ")
                                        .replace("duration: ", "⏱ ")
                                        .replace("bars: ", "🎼 ")
                                        .replace(" bpm", "")}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Format-detektion + väljare */}
              <div className="mb-4 rounded-xl border border-gray-200 p-3 bg-gray-50">
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Detekterat format
                  {detectionConfidence > 0 && (
                    <span className="ml-1 text-gray-400">
                      ({Math.round(detectionConfidence * 100)}% säkerhet)
                    </span>
                  )}
                </p>
                <div className="flex gap-2">
                  {(Object.entries(FORMAT_LABELS) as [Format, typeof FORMAT_LABELS[Format]][]).map(([fmt, info]) => (
                    <button
                      key={fmt}
                      onClick={() => setOverrideFormat(fmt === detectedFormat ? null : fmt)}
                      className={`flex-1 flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all
                        ${activeFormat === fmt
                          ? "border-steel-400 bg-steel-50 text-steel-700 font-medium"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
                    >
                      {info.icon}
                      <span>{info.label}</span>
                    </button>
                  ))}
                </div>
                {overrideFormat && (
                  <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                    <AlertCircle size={11} />
                    Format ändrat manuellt — låten extraheras om vid sparning
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto mb-4">
                {songs.map((song, i) => (
                  <div
                    key={i}
                    onClick={() => toggleSelect(i)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all
                      ${selected.has(i)
                        ? "border-steel-300 bg-steel-50"
                        : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                      ${selected.has(i) ? "border-steel-500 bg-steel-500" : "border-gray-300"}`}>
                      {selected.has(i) && <CheckCircle2 size={12} className="text-white" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm text-gray-900 truncate">{song.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {[song.artist, song.key, song.style, `♩${song.tempo}`,
                          `${song.sections.length} sektioner`].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <FileIcon type={file?.type || ""} />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={saveSelected}
                  disabled={selected.size === 0}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-steel-600
                             text-white text-sm rounded-xl hover:bg-steel-700
                             disabled:opacity-40 transition-colors font-medium"
                >
                  Importera {selected.size > 0 ? `(${selected.size})` : ""}
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => { setStep("idle"); setFile(null); setSongs([]); setOverrideFormat(null); }}
                  className="px-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Ny fil
                </button>
              </div>
            </>
          )}

          {/* SAVING */}
          {step === "saving" && (
            <div className="text-center py-10">
              <Loader2 size={36} className="mx-auto mb-4 text-steel-400 animate-spin" />
              <p className="font-medium text-gray-700">Sparar låtar…</p>
            </div>
          )}

          {/* DONE */}
          {step === "done" && (
            <div className="text-center py-10">
              <CheckCircle2 size={40} className="mx-auto mb-4 text-green-500" />
              <p className="font-semibold text-gray-800 mb-1">Importerat!</p>
              <p className="text-sm text-gray-400">Öppnar i editorn…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
