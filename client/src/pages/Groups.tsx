/**
 * Bandspaces (groups) — list, create and invite members
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users, Plus, ArrowLeft, Copy, Check, UserPlus, Music,
} from "lucide-react";
import { apiFetch } from "../lib/api";
import { Logo } from "../components/Logo";

interface Group {
  id: number;
  name: string;
  memberCount: number;
}

interface InviteResponse {
  token: string;
  url: string;
}

interface Member {
  id: number;
  email?: string;
  name?: string;
}

export default function Groups() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState("");
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);
  const [invite, setInvite] = useState<{ groupId: number; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: () => apiFetch<Group[]>("/api/groups"),
  });

  const createGroup = useMutation({
    mutationFn: () =>
      apiFetch<Group>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name: name.trim() }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setShowNew(false);
      setName("");
    },
  });

  const createInvite = useMutation({
    mutationFn: (groupId: number) =>
      apiFetch<InviteResponse>(`/api/groups/${groupId}/invite`, { method: "POST" }),
    onSuccess: (data, groupId) => {
      const fullUrl = `${window.location.origin}/join/${data.token}`;
      setInvite({ groupId, url: fullUrl });
    },
  });

  function copyInviteLink() {
    if (!invite) return;
    navigator.clipboard.writeText(invite.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <Users className="text-amber-600" size={24} />
            <h1 className="font-display text-3xl font-extrabold text-ink">Bandspaces</h1>
          </div>
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-1.5 px-4 py-2 bg-steel-600 text-white text-sm font-semibold
                       rounded-xl hover:bg-steel-700 transition-colors shadow-soft"
          >
            <Plus size={15} /> Nytt band
          </button>
        </div>

        <p className="text-sm text-ink-soft mb-7">
          Samla bandet på en plats. Dela låtar och setlistor med kapellmästaren.
        </p>

        {/* Create form */}
        {showNew && (
          <div className="bg-white rounded-3xl border border-cream2 shadow-lift p-6 mb-5">
            <h2 className="font-display font-bold text-ink mb-4">Nytt bandspace</h2>
            <div className="flex flex-col gap-3">
              <input
                autoFocus
                placeholder="Bandnamn (t.ex. Jonas kvartett) *"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) createGroup.mutate();
                  if (e.key === "Escape") setShowNew(false);
                }}
                className="px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => createGroup.mutate()}
                  disabled={!name.trim() || createGroup.isPending}
                  className="px-5 py-2.5 bg-steel-600 text-white text-sm font-semibold rounded-xl
                             hover:bg-steel-700 disabled:bg-ink-faint transition-colors shadow-soft"
                >
                  {createGroup.isPending ? "Skapar…" : "Skapa"}
                </button>
                <button
                  onClick={() => { setShowNew(false); setName(""); }}
                  className="px-4 py-2 text-sm text-ink-faint hover:text-ink-soft transition-colors"
                >
                  Avbryt
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="text-center text-ink-faint py-12">Laddar bandspaces…</div>
        ) : groups.length === 0 ? (
          <div className="text-center py-20 bg-white/60 rounded-3xl border border-cream2">
            <Users size={36} className="mx-auto text-ink-faint mb-3" />
            <p className="font-display font-bold text-ink">Inga bandspaces ännu</p>
            <p className="text-sm text-ink-soft mt-1.5 max-w-xs mx-auto">
              Skapa ett band för att dela låtar och setlistor med dina musiker.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                isOpen={openGroupId === g.id}
                onToggle={() => setOpenGroupId(openGroupId === g.id ? null : g.id)}
                onInvite={() => createInvite.mutate(g.id)}
                inviting={createInvite.isPending && createInvite.variables === g.id}
              />
            ))}
          </div>
        )}

        {/* Invite link modal */}
        {invite && (
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setInvite(null)}
          >
            <div
              className="bg-white rounded-3xl shadow-lift max-w-md w-full p-7 border border-cream2"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <UserPlus className="text-amber-600" size={22} />
                <h3 className="font-display font-bold text-ink text-lg">Inbjudningslänk</h3>
              </div>
              <p className="text-sm text-ink-soft mb-5">
                Skicka denna länk till bandmedlemmen. Länken kan användas en gång.
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={invite.url}
                  className="flex-1 px-3 py-2.5 border border-cream2 rounded-xl text-xs bg-cream"
                  onFocus={(e) => e.target.select()}
                />
                <button
                  onClick={copyInviteLink}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-steel-600 text-white text-sm font-semibold rounded-xl hover:bg-steel-700 shadow-soft"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Kopierad" : "Kopiera"}
                </button>
              </div>
              <button
                onClick={() => setInvite(null)}
                className="mt-5 w-full text-sm text-ink-faint hover:text-ink-soft transition-colors"
              >
                Stäng
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Group card with member-list expand ──────────────────────────────────────

function GroupCard({
  group,
  isOpen,
  onToggle,
  onInvite,
  inviting,
}: {
  group: Group;
  isOpen: boolean;
  onToggle: () => void;
  onInvite: () => void;
  inviting: boolean;
}) {
  const { data: members = [], isLoading } = useQuery({
    queryKey: ["group-members", group.id],
    queryFn: () => apiFetch<Member[]>(`/api/groups/${group.id}/members`),
    enabled: isOpen,
  });

  return (
    <div className="bg-white rounded-2xl border border-cream2 shadow-soft hover:shadow-lift transition-shadow overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="font-display font-bold text-ink">{group.name}</div>
          <div className="text-xs text-ink-faint mt-0.5">
            {group.memberCount} medlem{group.memberCount === 1 ? "" : "mar"}
          </div>
        </button>
        <button
          onClick={onInvite}
          disabled={inviting}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-amber-300
                     text-amber-700 bg-white rounded-xl hover:bg-amber-50 disabled:opacity-50 transition-colors"
        >
          <UserPlus size={13} /> {inviting ? "Skapar…" : "Bjud in"}
        </button>
      </div>

      {isOpen && (
        <div className="border-t border-cream2 px-5 py-4 bg-cream">
          <p className="text-xs font-bold text-ink-soft uppercase tracking-wider mb-3">
            Medlemmar
          </p>
          {isLoading ? (
            <p className="text-xs text-ink-faint">Laddar…</p>
          ) : (
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li key={m.id} className="text-sm text-ink flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">
                    {(m.name || m.email || "?")[0]?.toUpperCase()}
                  </span>
                  {m.name || m.email || `Användare ${m.id}`}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
