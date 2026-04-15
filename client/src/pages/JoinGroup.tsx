/**
 * Join a bandspace via invitation token (/join/:token)
 * Requires login — if not logged in, redirect to login first.
 */
import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Users, Check, X } from "lucide-react";
import { apiFetch } from "../lib/api";
import { Logo } from "../components/Logo";

export default function JoinGroup() {
  const [, params] = useRoute("/join/:token");
  const [, setLocation] = useLocation();
  const token = params?.token ?? "";
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [groupName, setGroupName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!token) return;

    // Save the join URL so we can come back after login
    if (!localStorage.getItem("token")) {
      sessionStorage.setItem("postLoginRedirect", `/join/${token}`);
      setLocation("/login");
      return;
    }

    apiFetch<{ id: number; name: string }>(`/api/groups/join/${token}`, { method: "POST" })
      .then((g) => {
        setGroupName(g.name);
        setStatus("success");
      })
      .catch((err) => {
        setErrorMsg(err.message || "Kunde inte gå med i bandet");
        setStatus("error");
      });
  }, [token, setLocation]);

  return (
    <div className="min-h-screen bg-sunburst flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-lift border border-cream2 max-w-md w-full p-8 text-center">
        <div className="flex items-center justify-center mb-6">
          <Logo size="md" />
        </div>

        {status === "loading" && (
          <>
            <Users className="mx-auto text-steel-300 mb-4" size={48} />
            <p className="text-ink-soft">Går med i bandspace…</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-pistachio/30 flex items-center justify-center mb-4 shadow-soft">
              <Check className="text-emerald-700" size={36} />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-ink mb-2">Välkommen!</h2>
            <p className="text-ink-soft mb-7">
              Du är nu medlem i <strong className="text-ink">{groupName}</strong>.
            </p>
            <button
              onClick={() => setLocation("/groups")}
              className="px-6 py-2.5 bg-steel-600 text-white text-sm font-semibold rounded-xl hover:bg-steel-700 shadow-soft transition-colors"
            >
              Visa bandspaces
            </button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 mx-auto rounded-full bg-rose/30 flex items-center justify-center mb-4 shadow-soft">
              <X className="text-rose-700" size={36} />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-ink mb-2">Kunde inte gå med</h2>
            <p className="text-ink-soft mb-7">{errorMsg}</p>
            <button
              onClick={() => setLocation("/songs")}
              className="px-6 py-2.5 border border-cream2 bg-white text-ink-soft text-sm rounded-xl hover:bg-cream transition-colors"
            >
              Tillbaka till mina låtar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
