/**
 * Pilot admin — se, sök, kopiera och exportera pilotanmälningar.
 * Endast tillgänglig för admin-mailadresser (PILOT_ADMIN_EMAILS på servern).
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft, Download, Search, Copy, Check, Users,
  Lock, Unlock, ShieldAlert, Mail,
} from "lucide-react";
import { apiFetch, authFetch } from "../lib/api";
import { Logo } from "../components/Logo";

interface PilotSignup {
  id: number;
  email: string;
  name?: string | null;
  instrument?: string | null;
  created_at?: string;
  createdAt?: string;
}

interface Me {
  user: { id: number; email: string; isAdmin?: boolean };
}

interface PilotStatus {
  open: boolean;
}

function formatDate(d?: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleString("sv-SE", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return d;
  }
}

export default function PilotAdmin() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<Me>("/api/auth/me"),
  });

  const isAdmin = !!me?.user?.isAdmin;

  const {
    data: signups = [],
    isLoading: listLoading,
    error: listError,
  } = useQuery({
    queryKey: ["pilot-signups"],
    queryFn: () => apiFetch<PilotSignup[]>("/api/pilot/signups"),
    enabled: isAdmin,
  });

  const { data: status } = useQuery({
    queryKey: ["pilot-status"],
    queryFn: () => apiFetch<PilotStatus>("/api/pilot/status"),
    enabled: isAdmin,
  });

  const toggleStatus = useMutation({
    mutationFn: (open: boolean) =>
      apiFetch<PilotStatus>("/api/pilot/status", {
        method: "POST",
        body: JSON.stringify({ open }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pilot-status"] }),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return signups;
    return signups.filter((s) =>
      [s.email, s.name ?? "", s.instrument ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [signups, query]);

  async function copyEmails() {
    const emails = filtered.map((s) => s.email).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  async function downloadCsv() {
    const res = await authFetch("/api/pilot/signups.csv");
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dajo-pilot-signups-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function mailtoAll() {
    const emails = filtered.map((s) => s.email).join(",");
    if (!emails) return;
    // BCC-mailto för att skydda mottagarnas adresser
    window.location.href = `mailto:?bcc=${encodeURIComponent(emails)}`;
  }

  // ─── Loading / ej admin ─────────────────────────────────────────────────────
  if (meLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-ink-faint text-sm">Laddar…</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-cream">
        <header className="bg-white/80 backdrop-blur-sm border-b border-cream2 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setLocation("/songs")}
            className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-steel-600 transition-colors"
          >
            <ArrowLeft size={15} /> Tillbaka
          </button>
          <Logo size="md" />
          <div className="w-20" />
        </header>
        <div className="max-w-lg mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose/30 mb-5">
            <ShieldAlert className="text-amber-700" size={28} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink mb-2">
            Endast för administratörer
          </h1>
          <p className="text-sm text-ink-soft">
            Det här verktyget är tillgängligt för DAJO-teamet. Logga in med
            en administratörs e-postadress för att se pilotanmälningarna.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-cream2 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button
          onClick={() => setLocation("/songs")}
          className="flex items-center gap-1.5 text-sm text-ink-soft hover:text-steel-600 transition-colors"
        >
          <ArrowLeft size={15} /> Tillbaka
        </button>
        <Logo size="md" />
        <div className="w-20" />
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <Users className="text-amber-600" size={24} />
            <h1 className="font-display text-3xl font-extrabold text-ink">
              Pilotanmälningar
            </h1>
          </div>
          <span className="text-sm text-ink-soft">
            {listLoading ? "…" : `${signups.length} st totalt`}
          </span>
        </div>
        <p className="text-sm text-ink-soft mb-6">
          Alla som anmält intresse för DAJO-piloten. Sök, kopiera e-post eller
          exportera som CSV.
        </p>

        {/* Status + åtgärder */}
        <div className="bg-white rounded-3xl border border-cream2 shadow-soft p-5 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {status?.open ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-pistachio animate-pulse" />
                <span className="text-sm font-semibold text-ink">Anmälan är öppen</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-ink-faint" />
                <span className="text-sm font-semibold text-ink">Anmälan är stängd</span>
              </>
            )}
          </div>

          <button
            onClick={() => toggleStatus.mutate(!status?.open)}
            disabled={toggleStatus.isPending}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cream2 bg-cream text-sm text-ink-soft hover:bg-cream2 hover:text-ink transition-colors disabled:opacity-60"
          >
            {status?.open ? <Lock size={14} /> : <Unlock size={14} />}
            {status?.open ? "Stäng anmälan" : "Öppna anmälan"}
          </button>

          <button
            onClick={mailtoAll}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cream2 bg-cream text-sm text-ink-soft hover:bg-cream2 hover:text-ink transition-colors disabled:opacity-50"
          >
            <Mail size={14} /> Mejla urval (BCC)
          </button>

          <button
            onClick={copyEmails}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-sm text-amber-800 hover:bg-amber-100 transition-colors disabled:opacity-50"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Kopierat!" : "Kopiera e-post"}
          </button>

          <button
            onClick={downloadCsv}
            disabled={signups.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-steel-600 text-white text-sm font-semibold hover:bg-steel-700 transition-colors shadow-soft disabled:opacity-60"
          >
            <Download size={14} /> CSV
          </button>
        </div>

        {/* Sök */}
        <div className="relative mb-5">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök på e-post, namn eller instrument…"
            className="w-full pl-11 pr-4 py-3 bg-white border border-cream2 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 transition-all shadow-soft"
          />
        </div>

        {/* Lista */}
        {listError ? (
          <div className="bg-rose/20 border border-rose/40 rounded-2xl p-5 text-sm text-amber-900">
            Kunde inte ladda anmälningar: {(listError as Error).message}
          </div>
        ) : listLoading ? (
          <div className="bg-white rounded-3xl border border-cream2 shadow-soft p-10 text-center text-ink-faint text-sm">
            Laddar anmälningar…
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-cream2 shadow-soft p-10 text-center">
            <p className="font-display text-lg font-bold text-ink mb-1">
              {signups.length === 0 ? "Inga anmälningar än" : "Inga träffar"}
            </p>
            <p className="text-sm text-ink-soft">
              {signups.length === 0
                ? "När någon anmäler sig från Landing-sidan dyker de upp här."
                : "Prova att rensa sökningen."}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-cream2 shadow-soft overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cream text-ink-soft">
                  <th className="text-left font-bold text-xs uppercase tracking-wider px-5 py-3">
                    E-post
                  </th>
                  <th className="text-left font-bold text-xs uppercase tracking-wider px-5 py-3">
                    Namn
                  </th>
                  <th className="text-left font-bold text-xs uppercase tracking-wider px-5 py-3">
                    Instrument
                  </th>
                  <th className="text-right font-bold text-xs uppercase tracking-wider px-5 py-3">
                    Anmäld
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`${i % 2 === 0 ? "bg-white" : "bg-cream/40"} border-t border-cream2`}
                  >
                    <td className="px-5 py-3 font-medium text-ink break-all">
                      {s.email}
                    </td>
                    <td className="px-5 py-3 text-ink-soft">{s.name || "—"}</td>
                    <td className="px-5 py-3 text-ink-soft">
                      {s.instrument ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                          {s.instrument}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3 text-ink-faint text-right whitespace-nowrap">
                      {formatDate(s.created_at ?? s.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-5 text-xs text-ink-faint text-center">
          Visar {filtered.length} av {signups.length} anmälningar
        </p>
      </div>
    </div>
  );
}
