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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Exportera PDF</h2>
            <p className="text-sm text-gray-500 truncate max-w-xs">{songTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <X size={20} />
          </button>
        </div>

        {/* Style picker */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm font-medium text-gray-700 mb-2">Välj layout</p>
          {STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full flex items-start gap-4 p-4 rounded-xl border-2 transition-all text-left ${
                selected === s.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <div
                className={`mt-0.5 flex-shrink-0 ${
                  selected === s.id ? "text-blue-600" : "text-gray-400"
                }`}
              >
                {s.icon}
              </div>
              <div>
                <p
                  className={`font-semibold text-sm ${
                    selected === s.id ? "text-blue-700" : "text-gray-800"
                  }`}
                >
                  {s.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
              </div>
              {selected === s.id && (
                <div className="ml-auto flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
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
          <div className="mx-6 mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Avbryt
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
