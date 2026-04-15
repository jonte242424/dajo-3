import { useState } from "react";
import { Download, FileText, Music, AlignLeft, X } from "lucide-react";

type ExportStyle = "ireal" | "songbook" | "notation";

interface ExportDialogProps {
  songId: number;
  songTitle: string;
  onClose: () => void;
}

const STYLES: { id: ExportStyle; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    id: "ireal",
    label: "iReal Grid",
    desc: "Proffsigt ackordschema i rutnät — som iReal Pro. Perfekt för musiker.",
    icon: <Music size={22} />,
  },
  {
    id: "songbook",
    label: "Songbook",
    desc: "Ackord ovanför textrader — som Real Book. Bra om du sjunger med.",
    icon: <AlignLeft size={22} />,
  },
  {
    id: "notation",
    label: "Notation",
    desc: "Ackordsymboler på notrader. Stilren och musikalisk layout.",
    icon: <FileText size={22} />,
  },
];

export function ExportDialog({ songId, songTitle, onClose }: ExportDialogProps) {
  const [selected, setSelected] = useState<ExportStyle>("ireal");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token") ?? "";
      const res = await fetch(`/api/songs/${songId}/export?style=${selected}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Kunde inte exportera");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = songTitle.replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, "").trim().replace(/\s+/g, "_");
      a.download = `${safeName}_${selected}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err: any) {
      setError(err.message || "Okänt fel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-lift border border-cream2 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cream2">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Exportera PDF</h2>
            <p className="text-sm text-ink-soft truncate max-w-xs">{songTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-faint hover:text-ink-soft transition-colors p-1.5 rounded-lg hover:bg-cream2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Style picker */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-2">Välj layout</p>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                selected === s.id
                  ? "border-amber-400 bg-amber-50 shadow-soft"
                  : "border-cream2 bg-white hover:border-amber-200 hover:bg-cream"
              }`}
            >
              <div
                className={`mt-0.5 flex-shrink-0 ${
                  selected === s.id ? "text-amber-600" : "text-ink-faint"
                }`}
              >
                {s.icon}
              </div>
              <div>
                <p
                  className={`font-display font-bold text-sm ${
                    selected === s.id ? "text-amber-800" : "text-ink"
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-xs text-ink-soft mt-0.5">{s.desc}</p>
              </div>
              {selected === s.id && (
                <div className="ml-auto flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-6 mb-3 rounded-xl bg-rose/20 border border-rose/40 px-4 py-3 text-sm text-amber-900">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-cream flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-cream2 bg-white text-ink-soft text-sm font-medium hover:bg-cream2 transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-steel-600 text-white text-sm font-semibold hover:bg-steel-700 active:bg-steel-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-soft"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Genererar…
              </>
            ) : (
              <>
                <Download size={16} />
                Ladda ner PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
