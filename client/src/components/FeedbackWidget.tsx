/**
 * FeedbackWidget — in-app annotate & review
 *
 * Jonas-mode: logga in som admin i prod, klicka på något som behöver fixas,
 * skriv ett kort meddelande, spara. Senare kan man gå till "Inbox" och
 * markera som done/in_progress/wontfix.
 *
 * Endast synlig för admins (gatad via /api/auth/me → isAdmin). Vanliga
 * användare ser aldrig widget:en, och servern avvisar ändå deras anrop
 * med 403 eftersom /api/feedback är admin-only.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bug, X, Crosshair, Inbox, Check, Clock, Ban,
  Trash2, ChevronRight, ArrowUp, ArrowDown, Minus, ArrowLeft,
} from "lucide-react";
import { apiFetch } from "../lib/api";

type Status = "open" | "in_progress" | "done" | "wontfix";
type Priority = "low" | "normal" | "high";

interface FeedbackItem {
  id: number;
  url: string;
  selector: string | null;
  element_text: string | null;
  comment: string;
  status: Status;
  priority: Priority;
  created_at: string;
  user_email?: string;
}

type View = "closed" | "menu" | "picking" | "composing" | "inbox";

/**
 * Bygg en relativt läsbar, men unik, CSS-selektor för ett element.
 * Inte 100% säker mot DOM-ändringar men tillräcklig för att hitta
 * tillbaka till "den där knappen på editor-sidan".
 */
function buildSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && parts.length < 5 && node.nodeType === 1) {
    let part = node.tagName.toLowerCase();
    // Lägg till aria-label eller data-testid om finns (mest stabilt)
    const aria = node.getAttribute("aria-label");
    const testid = node.getAttribute("data-testid");
    if (aria) { part += `[aria-label="${aria.slice(0, 40)}"]`; parts.unshift(part); break; }
    if (testid) { part += `[data-testid="${testid}"]`; parts.unshift(part); break; }
    // nth-child för unikhet
    const parent = node.parentElement;
    if (parent) {
      const idx = Array.from(parent.children).indexOf(node);
      part += `:nth-child(${idx + 1})`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

export default function FeedbackWidget() {
  const [view, setView] = useState<View>("closed");
  const [picked, setPicked] = useState<{ selector: string; elementText: string } | null>(null);
  const [hovered, setHovered] = useState<Element | null>(null);
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [openCount, setOpenCount] = useState<number>(0);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Hämta räkning av öppna items för notifikations-badge
  const refreshOpenCount = useCallback(async () => {
    try {
      const data = await apiFetch<{ items: FeedbackItem[] }>("/api/feedback?status=open");
      setOpenCount(data.items.length);
    } catch {
      // tyst — kan vara att användaren inte är admin
    }
  }, []);

  useEffect(() => {
    refreshOpenCount();
  }, [refreshOpenCount]);

  // Pick-mode: lyssna globalt på mouseover/click för att välja element
  useEffect(() => {
    if (view !== "picking") return;

    function onMove(e: MouseEvent) {
      const el = e.target as Element;
      // Ignorera widget:ens egna element
      if (overlayRef.current?.contains(el)) return;
      setHovered(el);
    }
    function onClick(e: MouseEvent) {
      const el = e.target as Element;
      if (overlayRef.current?.contains(el)) return;
      e.preventDefault();
      e.stopPropagation();
      const sel = buildSelector(el);
      const text = (el.textContent ?? "").trim().slice(0, 120);
      setPicked({ selector: sel, elementText: text });
      setHovered(null);
      setView("composing");
    }

    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", onClick, true);
    document.body.style.cursor = "crosshair";
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", onClick, true);
      document.body.style.cursor = "";
      setHovered(null);
    };
  }, [view]);

  async function saveFeedback() {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          url: window.location.href,
          selector: picked?.selector ?? null,
          elementText: picked?.elementText ?? null,
          comment: comment.trim(),
          priority,
        }),
      });
      setComment("");
      setPicked(null);
      setPriority("normal");
      setView("menu");
      refreshOpenCount();
    } catch (err) {
      console.error("Kunde inte spara feedback", err);
      alert("Kunde inte spara. Se konsollen.");
    } finally {
      setSaving(false);
    }
  }

  async function openInbox() {
    setView("inbox");
    setLoadingInbox(true);
    try {
      const data = await apiFetch<{ items: FeedbackItem[] }>("/api/feedback");
      setItems(data.items);
    } catch (err) {
      console.error("Kunde inte hämta feedback", err);
    } finally {
      setLoadingInbox(false);
    }
  }

  async function updateItem(id: number, patch: Partial<FeedbackItem>) {
    try {
      const { item } = await apiFetch<{ item: FeedbackItem }>(`/api/feedback/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setItems((prev) => prev.map((it) => (it.id === id ? item : it)));
      refreshOpenCount();
    } catch (err) {
      console.error("Kunde inte uppdatera", err);
    }
  }

  async function deleteItem(id: number) {
    if (!confirm("Radera denna feedback-anteckning?")) return;
    try {
      await fetch(`/api/feedback/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
      });
      setItems((prev) => prev.filter((it) => it.id !== id));
      refreshOpenCount();
    } catch (err) {
      console.error("Kunde inte radera", err);
    }
  }

  // ─── Renderingsblock ────────────────────────────────────────────────────────

  // Highlight på hovrat element under pick-mode
  const highlight = hovered ? (() => {
    const r = hovered.getBoundingClientRect();
    return (
      <div
        className="fixed pointer-events-none border-2 border-amber-500 bg-amber-500/10 z-[9998] rounded transition-all"
        style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
      />
    );
  })() : null;

  return (
    <div ref={overlayRef}>
      {/* Floating toggle button */}
      {view === "closed" && (
        <button
          onClick={() => setView("menu")}
          className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-full shadow-lift hover:bg-rose-700 transition-colors"
          title="Feedback-läge"
        >
          <Bug size={16} />
          <span className="text-sm font-semibold">Feedback</span>
          {openCount > 0 && (
            <span className="min-w-[20px] h-5 px-1.5 bg-white text-rose-600 rounded-full text-xs font-bold flex items-center justify-center">
              {openCount}
            </span>
          )}
        </button>
      )}

      {/* Pick-mode banner */}
      {view === "picking" && (
        <>
          <div className="fixed top-0 inset-x-0 z-[9999] bg-amber-500 text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-3 shadow-lg">
            <Crosshair size={15} />
            Klicka på elementet du vill kommentera
            <button
              onClick={() => setView("menu")}
              className="ml-4 px-3 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs"
            >
              Avbryt (Esc)
            </button>
          </div>
          {highlight}
        </>
      )}

      {/* Menu modal */}
      {view === "menu" && (
        <div
          className="fixed inset-0 z-[9999] flex items-end justify-end p-4 bg-ink/10 backdrop-blur-[2px]"
          onClick={() => setView("closed")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-lift border border-cream2 w-72 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-cream2 bg-cream">
              <div className="flex items-center gap-2">
                <Bug size={15} className="text-rose-600" />
                <span className="font-display font-bold text-ink text-sm">Feedback-läge</span>
              </div>
              <button onClick={() => setView("closed")} className="text-ink-faint hover:text-ink-soft">
                <X size={16} />
              </button>
            </div>
            <div className="p-2">
              <button
                onClick={() => setView("picking")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-left transition-colors"
              >
                <Crosshair size={16} className="text-amber-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink">Markera element</p>
                  <p className="text-xs text-ink-faint">Klicka på något som ska fixas</p>
                </div>
                <ChevronRight size={14} className="text-ink-faint" />
              </button>
              <button
                onClick={() => { setPicked(null); setView("composing"); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-left transition-colors"
              >
                <Bug size={16} className="text-rose-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink">Allmän kommentar</p>
                  <p className="text-xs text-ink-faint">Utan specifikt element</p>
                </div>
                <ChevronRight size={14} className="text-ink-faint" />
              </button>
              <button
                onClick={openInbox}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-amber-50 text-left transition-colors"
              >
                <Inbox size={16} className="text-steel-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-ink">Inbox {openCount > 0 && <span className="text-rose-600">({openCount})</span>}</p>
                  <p className="text-xs text-ink-faint">Se alla anteckningar</p>
                </div>
                <ChevronRight size={14} className="text-ink-faint" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose modal */}
      {view === "composing" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
          onClick={() => setView("menu")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-lift border border-cream2 w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream2">
              <div className="flex items-center gap-2">
                <Bug size={16} className="text-rose-600" />
                <h3 className="font-display font-bold text-ink">Ny feedback</h3>
              </div>
              <button onClick={() => setView("menu")} className="text-ink-faint hover:text-ink-soft">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {picked && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1">Markerat element</p>
                  {picked.elementText && (
                    <p className="text-sm text-ink italic truncate">"{picked.elementText}"</p>
                  )}
                  <p className="text-xs text-ink-faint font-mono truncate mt-1">{picked.selector}</p>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">
                  Vad behöver fixas?
                </label>
                <textarea
                  autoFocus
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="T.ex. 'Byt färg på knappen', 'Fel tempo sparas'..."
                  className="w-full px-3 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all resize-none"
                  maxLength={4000}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-ink-soft uppercase tracking-wider block mb-1.5">Prioritet</label>
                <div className="flex gap-2">
                  {(["low", "normal", "high"] as Priority[]).map((p) => {
                    const selected = priority === p;
                    const icon = p === "high" ? <ArrowUp size={13} /> : p === "low" ? <ArrowDown size={13} /> : <Minus size={13} />;
                    const label = p === "high" ? "Hög" : p === "low" ? "Låg" : "Normal";
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs transition-all ${
                          selected ? "border-amber-400 bg-amber-50 text-amber-900 font-semibold" : "border-cream2 text-ink-soft hover:border-cream2"
                        }`}
                      >
                        {icon} {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-ink-faint">
                URL: <span className="font-mono">{window.location.pathname}</span>
              </p>
            </div>

            <div className="px-5 py-4 bg-cream flex gap-3">
              <button
                onClick={() => setView("menu")}
                className="flex-1 px-4 py-2.5 rounded-xl border border-cream2 bg-white text-ink-soft text-sm font-medium hover:bg-cream2 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={saveFeedback}
                disabled={!comment.trim() || saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-40 transition-colors"
              >
                {saving ? "Sparar..." : "Spara feedback"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox modal */}
      {view === "inbox" && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
          onClick={() => setView("menu")}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-lift border border-cream2 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream2">
              <div className="flex items-center gap-2">
                <button onClick={() => setView("menu")} className="text-ink-faint hover:text-ink-soft mr-1">
                  <ArrowLeft size={16} />
                </button>
                <Inbox size={16} className="text-steel-600" />
                <h3 className="font-display font-bold text-ink">Feedback inbox</h3>
                <span className="text-xs text-ink-faint">({items.length})</span>
              </div>
              <button onClick={() => setView("closed")} className="text-ink-faint hover:text-ink-soft">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingInbox ? (
                <p className="text-center text-ink-faint py-10 text-sm">Laddar...</p>
              ) : items.length === 0 ? (
                <p className="text-center text-ink-faint py-10 text-sm">Inga feedback-anteckningar ännu</p>
              ) : (
                items.map((item) => (
                  <FeedbackRow key={item.id} item={item} onUpdate={updateItem} onDelete={deleteItem} />
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackRow({
  item,
  onUpdate,
  onDelete,
}: {
  item: FeedbackItem;
  onUpdate: (id: number, patch: Partial<FeedbackItem>) => void;
  onDelete: (id: number) => void;
}) {
  const statusConfig: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
    open:        { label: "Öppen",      color: "bg-rose-100 text-rose-700",        icon: <Bug size={11} /> },
    in_progress: { label: "Pågår",      color: "bg-amber-100 text-amber-700",      icon: <Clock size={11} /> },
    done:        { label: "Klar",       color: "bg-emerald-100 text-emerald-700",  icon: <Check size={11} /> },
    wontfix:     { label: "Skippas",    color: "bg-gray-100 text-gray-600",        icon: <Ban size={11} /> },
  };
  const prioConfig: Record<Priority, { label: string; color: string }> = {
    high:   { label: "Hög",    color: "text-rose-600" },
    normal: { label: "Normal", color: "text-ink-soft" },
    low:    { label: "Låg",    color: "text-ink-faint" },
  };
  const cfg = statusConfig[item.status];
  const p = prioConfig[item.priority];
  const date = new Date(item.created_at).toLocaleDateString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="rounded-xl border border-cream2 p-3 bg-white hover:bg-cream/50 transition-colors">
      <div className="flex items-start gap-2 mb-2">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${cfg.color}`}>
          {cfg.icon} {cfg.label}
        </span>
        <span className={`text-xs font-semibold ${p.color}`}>{p.label}</span>
        <span className="text-xs text-ink-faint ml-auto">{date}</span>
      </div>

      <p className="text-sm text-ink mb-2 whitespace-pre-wrap">{item.comment}</p>

      {(item.element_text || item.selector) && (
        <div className="text-xs text-ink-faint border-l-2 border-cream2 pl-2 mb-2 space-y-0.5">
          {item.element_text && <p className="italic truncate">"{item.element_text}"</p>}
          {item.selector && <p className="font-mono truncate">{item.selector}</p>}
        </div>
      )}

      <div className="text-xs text-ink-faint mb-2 truncate">
        <a href={item.url} className="hover:text-amber-600 hover:underline font-mono">{new URL(item.url).pathname + new URL(item.url).search}</a>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {(["open", "in_progress", "done", "wontfix"] as Status[]).map((s) => (
          <button
            key={s}
            onClick={() => onUpdate(item.id, { status: s })}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              item.status === s ? statusConfig[s].color + " font-semibold" : "text-ink-faint hover:bg-cream2"
            }`}
          >
            {statusConfig[s].label}
          </button>
        ))}
        <button
          onClick={() => onDelete(item.id)}
          className="ml-auto p-1.5 text-ink-faint hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
