import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Logo } from "../components/Logo";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Något gick fel");
        return;
      }
      localStorage.setItem("token", data.token);
      const redirect = sessionStorage.getItem("postLoginRedirect");
      if (redirect) {
        sessionStorage.removeItem("postLoginRedirect");
        setLocation(redirect);
      } else {
        setLocation("/songs");
      }
    } catch {
      setError("Kunde inte ansluta till servern");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sunburst flex flex-col items-center justify-center px-4 py-12">

      {/* Logga (länk till landing) */}
      <Link href="/">
        <a className="mb-8 hover:scale-105 transition-transform">
          <Logo size="lg" />
        </a>
      </Link>

      <div className="bg-white rounded-3xl shadow-lift border border-cream2 w-full max-w-sm p-8">
        <h1 className="font-display text-3xl font-extrabold text-ink mb-1">
          {mode === "login" ? "Välkommen tillbaka" : "Hej, nya kompis"}
        </h1>
        <p className="text-ink-soft text-sm mb-7">
          {mode === "login"
            ? "Logga in för att komma åt dina låtar"
            : "Skapa ett konto — gratis under piloten"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "register" && (
            <div>
              <label className="text-xs text-ink-soft font-semibold uppercase tracking-wide block mb-1.5">
                Namn
              </label>
              <input
                type="text"
                placeholder="Ditt namn"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
              />
            </div>
          )}
          <div>
            <label className="text-xs text-ink-soft font-semibold uppercase tracking-wide block mb-1.5">
              E-post
            </label>
            <input
              type="email"
              placeholder="din@email.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="text-xs text-ink-soft font-semibold uppercase tracking-wide block mb-1.5">
              Lösenord
            </label>
            <input
              type="password"
              placeholder={mode === "register" ? "Minst 6 tecken" : "Ditt lösenord"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-cream border border-cream2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white transition-all"
              required
            />
          </div>

          {error && (
            <div className="bg-rose/20 border border-rose/40 rounded-xl px-4 py-2.5 text-sm text-amber-900">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 bg-steel-600 text-white font-semibold rounded-xl hover:bg-steel-700 disabled:opacity-50 transition-colors shadow-soft"
          >
            {loading ? "Laddar…" : mode === "login" ? "Logga in" : "Skapa konto"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-cream2 text-center">
          <p className="text-sm text-ink-soft">
            {mode === "login" ? "Inget konto än?" : "Har du redan ett konto?"}{" "}
            <button
              className="text-steel-600 font-semibold hover:text-steel-700 transition-colors"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            >
              {mode === "login" ? "Skapa här" : "Logga in"}
            </button>
          </p>
        </div>
      </div>

      <p className="mt-6 text-xs text-ink-faint text-center max-w-xs">
        Genom att skapa ett konto godkänner du att vi sparar dina låtar och inställningar.
      </p>
    </div>
  );
}
