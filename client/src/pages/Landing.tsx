/**
 * DAJO Landing — Klevgrand-inspired warm hand-crafted feel,
 * anchored to the cartoon logo (steel blue + warm amber + cream).
 */
import { Link } from "wouter";
import { useState } from "react";
import {
  Upload, Music2, FileDown, ListMusic, Share2, Smartphone,
  ChevronDown, ChevronUp, Sparkles, Check, Moon, Play,
} from "lucide-react";
import { Logo, DajoCartoon } from "../components/Logo";

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-cream2 py-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left gap-4 group"
      >
        <span className="font-medium text-ink group-hover:text-steel-600 transition-colors">{q}</span>
        {open
          ? <ChevronUp size={18} className="text-ink-soft shrink-0" />
          : <ChevronDown size={18} className="text-ink-soft shrink-0" />}
      </button>
      {open && <p className="mt-3 text-ink-soft leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Feature card ─────────────────────────────────────────────────────────────

function Feature({
  icon, title, desc, accent,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: "sage" | "peach" | "rose" | "lavender" | "butter" | "pistachio";
}) {
  const bg = {
    sage: "bg-sage/30",
    peach: "bg-peach/40",
    rose: "bg-rose/40",
    lavender: "bg-lavender/40",
    butter: "bg-butter/60",
    pistachio: "bg-pistachio/40",
  }[accent];

  return (
    <div className="p-6 rounded-3xl bg-white border border-cream2 hover:shadow-lift transition-all duration-300 hover:-translate-y-0.5">
      <div className={`w-12 h-12 ${bg} rounded-2xl flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="font-display font-bold text-ink mb-2 text-lg">{title}</h3>
      <p className="text-ink-soft text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [instrument, setInstrument] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handlePilot(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/pilot/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, instrument }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Något gick fel");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || "Kunde inte skicka anmälan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream text-ink overflow-x-hidden font-sans">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-cream/85 backdrop-blur border-b border-cream2">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Logo size="md" />
          <div className="flex items-center gap-5">
            <a href="#features" className="hidden sm:block text-sm text-ink-soft hover:text-ink transition-colors">
              Funktioner
            </a>
            <a href="#story" className="hidden sm:block text-sm text-ink-soft hover:text-ink transition-colors">
              Vår historia
            </a>
            <a href="#faq" className="hidden sm:block text-sm text-ink-soft hover:text-ink transition-colors">
              FAQ
            </a>
            <Link href="/login">
              <a className="px-4 py-2 text-sm font-semibold text-steel-600 border-2 border-steel-200 rounded-xl hover:bg-steel-50 transition-colors">
                Logga in
              </a>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-5 bg-sunburst">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="text-center md:text-left animate-fade-up">
            <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-amber-200 shadow-soft">
              <Sparkles size={12} /> Pilot öppen — välkommen ombord
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-ink leading-[1.05]">
              Din kompis<br />
              <span className="text-steel-600">på scenen.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-ink-soft max-w-xl leading-relaxed">
              Kompskisser, setlistor och bandet — på ett ställe.
              Byggd av musiker som spelar varje vecka,
              för musiker som vill <em className="text-amber-700 not-italic font-semibold">spela</em> —
              inte rota efter noterna.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <Link href="/login">
                <a className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-steel-600 text-white font-semibold rounded-2xl hover:bg-steel-700 transition-all hover:shadow-lift hover:-translate-y-0.5 text-base">
                  Kom igång gratis
                </a>
              </Link>
              <a
                href="#pilot"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white border-2 border-cream2 text-ink font-semibold rounded-2xl hover:border-amber-300 hover:bg-amber-50 transition-all text-base"
              >
                Bli pilotanvändare
              </a>
            </div>
            <p className="mt-4 text-xs text-ink-faint">Gratis under beta · Inget kreditkort · Avregistrera när du vill</p>

            {/* Mini trust strip */}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 justify-center md:justify-start text-xs text-ink-faint">
              <span className="flex items-center gap-1.5"><Check size={12} className="text-pistachio" /> Svenskbyggt</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-pistachio" /> Ingen annonsspårning</span>
              <span className="flex items-center gap-1.5"><Check size={12} className="text-pistachio" /> Data stannar i EU</span>
            </div>
          </div>

          {/* Right: cartoon */}
          <div className="relative animate-fade-up" style={{ animationDelay: "150ms" }}>
            <DajoCartoon className="max-w-md mx-auto" />
            {/* Floating chord-card decoration */}
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-lift p-3 border border-cream2 animate-float-slow">
              <div className="grid grid-cols-2 gap-1.5 w-32">
                {["Cmaj7", "Am7", "Dm7", "G7"].map((c) => (
                  <div key={c} className="bg-cream rounded-lg px-2 py-1.5 text-xs font-bold text-steel-700 text-center">
                    {c}
                  </div>
                ))}
              </div>
            </div>
            <div className="hidden md:block absolute -top-4 -right-4 bg-amber-500 text-white rounded-2xl shadow-sun px-4 py-2 text-sm font-bold animate-float-rev">
              ♪ Spela direkt
            </div>
          </div>
        </div>

        {/* Editor preview */}
        <div className="max-w-5xl mx-auto mt-20 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="bg-white rounded-3xl shadow-lift border border-cream2 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-cream2/60 border-b border-cream2">
              <div className="w-3 h-3 rounded-full bg-rose" />
              <div className="w-3 h-3 rounded-full bg-butter" />
              <div className="w-3 h-3 rounded-full bg-pistachio" />
              <div className="ml-4 flex-1 bg-cream rounded-lg px-3 py-1 text-xs text-ink-faint">
                dajo.app/editor/autumn-leaves
              </div>
            </div>
            <div className="p-6 bg-cream-fade">
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                <span className="font-display font-bold text-ink text-xl">Autumn Leaves</span>
                <span className="text-sm text-ink-soft">· Joseph Kosma</span>
                <span className="px-2 py-0.5 bg-steel-100 text-steel-700 rounded text-xs font-semibold">G</span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs font-semibold">Jazz</span>
                <span className="text-xs text-ink-faint">♩ 120</span>
                <div className="ml-auto flex gap-2">
                  <span className="px-3 py-1.5 bg-white border border-cream2 rounded-lg text-xs text-ink-soft">Dela</span>
                  <span className="px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-soft">Exportera</span>
                </div>
              </div>
              {[
                { name: "A", bars: [["Am7", "D7"], ["Gmaj7"], ["Cmaj7"], ["F#m7♭5", "B7"]], active: 1 },
                { name: "B", bars: [["Em7"], ["Em7"], ["Am7", "D7"], ["Gmaj7"]], active: -1 },
              ].map((sec) => (
                <div key={sec.name} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-steel-700 text-white text-xs font-bold rounded-lg shadow-soft">{sec.name}</span>
                    <span className="text-xs text-ink-faint">4 takter</span>
                    {sec.active >= 0 && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 ml-1">
                        <Play size={10} fill="currentColor" /> spelar
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {sec.bars.map((bar, i) => {
                      const isActive = i === sec.active;
                      return (
                        <div
                          key={i}
                          className={`rounded-2xl p-3 min-h-[56px] flex items-center justify-center transition-all
                            ${isActive
                              ? "bg-amber-50 border-2 border-amber-400 ring-2 ring-amber-200 animate-pulse-glow"
                              : "bg-white border border-cream2"}`}
                        >
                          <span className={`font-bold text-sm text-center ${isActive ? "text-amber-800" : "text-ink"}`}>
                            {bar.join("  ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Story / Origin ── */}
      <section id="story" className="py-20 px-5 bg-cream2/40">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">Vår historia</p>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-ink mb-6">
            Två musiker, en irriterande mapp med PDF:er
          </h2>
          <p className="text-ink-soft text-lg leading-relaxed">
            DAJO började när <strong className="text-ink">David</strong> visade <strong className="text-ink">Jonas</strong> sin "system":
            en mapp med 200 fotograferade ackordscheman, döpta efter datum,
            sökta via "kanske var det den från Skogås?". Efter en gigkväll med fel tonart
            och tre fumlanden mitt i refrängen var det dags. <strong className="text-ink">David</strong> hade idén,{" "}
            <strong className="text-ink">Jonas</strong> började bygga.
            Resten är pågående repetition.
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-5 bg-cream">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">Vad du får</p>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold text-ink">
              Allt du behöver.<br />
              <span className="text-steel-600">Inget du inte behöver.</span>
            </h2>
            <p className="mt-4 text-ink-soft text-lg max-w-xl mx-auto">
              Vi byggde det vi själva ville ha. Sen tog vi bort allt som vi insåg
              att vi egentligen inte använde.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature
              accent="butter"
              icon={<Upload size={22} className="text-amber-700" />}
              title="AI-import"
              desc="Fota ett ackordschema eller dra in en PDF — Claude läser av takter, sektioner och tonart åt dig. Du polerar."
            />
            <Feature
              accent="sage"
              icon={<Music2 size={22} className="text-steel-700" />}
              title="Musikteori inbyggd"
              desc="Transponera halvtonsvis, se diatoniska ackord, känn igen funktionsanalys. Tonal.js i botten."
            />
            <Feature
              accent="peach"
              icon={<FileDown size={22} className="text-amber-700" />}
              title="PDF i tre stilar"
              desc="iReal-grid för fakebooken, Songbook med text och ackord, Notation med riktigt notsystem. Skriv ut eller maila bandet."
            />
            <Feature
              accent="lavender"
              icon={<ListMusic size={22} className="text-steel-700" />}
              title="Setlistor som funkar"
              desc="Drag-and-drop. Försättsblad. Tonart och tempo per låt. En PDF — hela kvällen."
            />
            <Feature
              accent="rose"
              icon={<Share2 size={22} className="text-steel-700" />}
              title="Bandspaces"
              desc="Samla bandet på en plats. Kapellmästaren delar setlisten, alla ser samma sak — i sin egen tonart om de vill."
            />
            <Feature
              accent="pistachio"
              icon={<Smartphone size={22} className="text-steel-700" />}
              title="Mobil och iPad"
              desc="Mörkt scenläge när lampan är släckt. Stora ackord när du står tre meter bort. Inget zoomande mitt i låten."
            />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-5 bg-steel-50">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-amber-600 font-semibold text-sm uppercase tracking-wider mb-3">Så funkar det</p>
          <h2 className="font-display text-4xl font-extrabold text-ink mb-14">
            Från idé till scen på fem minuter
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Fota eller skriv", desc: "Ladda upp en PDF, fota ett blad, eller börja från noll med tomma takter." },
              { step: "2", title: "Putsa", desc: "Klicka på en takt, ändra ackord, transponera hela låten med en knapp. Lägg till anteckningar." },
              { step: "3", title: "Spela", desc: "Mörkt scenläge, stora ackord, swipe mellan låtar. Eller skriv ut. Eller maila bandet. Eller alla tre." },
            ].map((s) => (
              <div key={s.step} className="bg-white p-6 rounded-3xl shadow-soft border border-cream2">
                <div className="w-14 h-14 rounded-2xl bg-amber-500 text-white text-2xl font-display font-extrabold flex items-center justify-center mx-auto mb-5 shadow-sun">
                  {s.step}
                </div>
                <h3 className="font-display font-bold text-ink text-lg mb-2">{s.title}</h3>
                <p className="text-ink-soft text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stage mode teaser ── */}
      <section className="py-20 px-5 bg-stage-fade text-white overflow-hidden relative">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-amber-400/20">
              <Moon size={12} /> Scenläge
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold mb-5 leading-tight">
              När lampan är<br />
              <span className="text-amber-400">släckt.</span>
            </h2>
            <p className="text-steel-100 text-lg leading-relaxed mb-6">
              Stora ackord. Hög kontrast. Autopilot genom låten. Swipe mellan
              nummer med en fot. iPaden ligger på stativet, du tittar upp på
              publiken — inte ner i en mapp.
            </p>
            <ul className="space-y-3 text-steel-100">
              {[
                "Mörk bakgrund med varm orange highlight",
                "Auto-bläddring synkad till tempot",
                "Markera aktuell takt stort — syns på 3 meter",
                "Snabb transponering mellan låtar",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Check size={18} className="text-amber-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stage mockup */}
          <div className="relative">
            <div className="bg-steel-900 rounded-3xl border border-steel-700 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 border-b border-steel-800">
                <span className="text-xs text-steel-300 font-medium">Scenläge · Autumn Leaves</span>
                <div className="flex items-center gap-2 text-xs text-amber-400">
                  <Play size={10} fill="currentColor" /> ♩ 120
                </div>
              </div>
              <div className="p-6">
                <div className="text-center mb-6">
                  <p className="text-xs text-steel-400 uppercase tracking-widest mb-2">Sektion A · takt 2 / 8</p>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { c: "Am7  D7", active: false },
                    { c: "Gmaj7",   active: true  },
                    { c: "Cmaj7",   active: false },
                    { c: "F♯m7♭5 B7", active: false },
                  ].map((bar, i) => (
                    <div
                      key={i}
                      className={`rounded-xl p-4 min-h-[72px] flex items-center justify-center transition-all
                        ${bar.active
                          ? "bg-amber-500/20 border-2 border-amber-400 shadow-sun animate-pulse-glow"
                          : "bg-steel-800/50 border border-steel-700"}`}
                    >
                      <span className={`font-display font-bold text-center ${bar.active ? "text-amber-300 text-2xl" : "text-steel-300 text-lg"}`}>
                        {bar.c}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between text-xs text-steel-400">
                  <span>← Föregående</span>
                  <span className="text-amber-400 font-semibold">Nästa: Blue Bossa →</span>
                </div>
              </div>
            </div>
            {/* Floating "pedal ready" hint */}
            <div className="hidden md:block absolute -bottom-6 -right-6 bg-amber-500 text-steel-900 rounded-2xl shadow-sun px-4 py-2 text-sm font-bold animate-float-slow">
              🦶 Pedal redo
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-5 bg-cream">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-4xl font-extrabold text-ink mb-3 text-center">
            Frågor vi får ofta
          </h2>
          <p className="text-center text-ink-soft mb-10">Saknar du något? Hör av dig.</p>
          <div>
            {[
              { q: "Är DAJO gratis?", a: "Ja, under pilotperioden är allt gratis. Vi tar betalt först när det är värt att betala för." },
              { q: "Vilka filer kan jag importera?", a: "PDF, JPEG, PNG och WebP. Claude Vision läser av ackordscheman, lead sheets och kompskisser och skapar redigerbara takter." },
              { q: "Hur bra är AI-importen?", a: "Riktigt bra på rena lead sheets, oftast bra på fotograferade scheman, ibland kämpig med handskrivet. Du ser alltid resultatet och rättar det som blivit fel — och appen lär sig av dina rättningar." },
              { q: "Kan jag dela med bandet?", a: "Ja. Skapa ett bandspace, bjud in via länk, dela låtar och setlistor. Varje medlem kan se i sin egen tonart utan att originalet ändras." },
              { q: "Vilka exportformat finns?", a: "Tre stilar: iReal-grid (fakebook), Songbook (text + ackord) och Notation (notsystem med ackord). Plus setlist-PDF med försättsblad." },
              { q: "Var sparas mina låtar?", a: "I vår databas, så de följer med oavsett vilken enhet du loggar in från. Vi backar upp regelbundet och du kan exportera allt när du vill." },
              { q: "Funkar det offline?", a: "Inte än. Just nu krävs nätverk — men det är på roadmapen för framtiden." },
            ].map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pilot signup ── */}
      <section id="pilot" className="py-20 px-5 bg-steel-fade text-white">
        <div className="max-w-xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-butter text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-white/20">
            <Sparkles size={12} /> Begränsade platser
          </div>
          <h2 className="font-display text-4xl sm:text-5xl font-extrabold mb-4">
            Bli pilotanvändare
          </h2>
          <p className="text-steel-100 mb-8 text-lg leading-relaxed">
            Få tidig tillgång. Påverka funktioner. Hjälp oss bygga den bästa appen
            för spelande musiker. Vi hör av oss när din plats är klar.
          </p>
          {submitted ? (
            <div className="bg-white/10 rounded-3xl py-8 px-8 backdrop-blur border border-white/20">
              <div className="w-14 h-14 rounded-full bg-amber-500 mx-auto mb-4 flex items-center justify-center shadow-sun">
                <Check size={26} className="text-white" />
              </div>
              <p className="text-2xl font-display font-bold mb-2">Tack — vi hör av oss!</p>
              <p className="text-steel-100">
                Du står nu på listan. Välkommen ombord, spelkompis. 🎵
              </p>
            </div>
          ) : (
            <form onSubmit={handlePilot} className="flex flex-col gap-3 text-left">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ditt namn"
                className="px-4 py-3 rounded-xl text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-ink-faint"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se *"
                className="px-4 py-3 rounded-xl text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-ink-faint"
              />
              <input
                type="text"
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                placeholder="Vad spelar du? (ex. piano, saxofon, kapellmästare)"
                className="px-4 py-3 rounded-xl text-ink text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-ink-faint"
              />
              {error && (
                <div className="bg-rose/30 border border-rose rounded-xl px-4 py-2.5 text-sm text-white">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || !email}
                className="mt-1 px-6 py-3.5 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors shadow-sun disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Skickar…" : "Anmäl mig till piloten"}
              </button>
            </form>
          )}
          <p className="mt-4 text-xs text-steel-200">
            Vi mailar bara om DAJO. Inga spam, inga partners.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 px-5 bg-cream2 text-ink-soft border-t border-cream2/80">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
            <Logo size="md" />
            <div className="flex items-center gap-6 text-sm">
              <a href="#features" className="hover:text-steel-700 transition-colors">Funktioner</a>
              <a href="#story" className="hover:text-steel-700 transition-colors">Historia</a>
              <a href="#faq" className="hover:text-steel-700 transition-colors">FAQ</a>
              <Link href="/login">
                <a className="text-steel-600 hover:text-steel-700 font-semibold transition-colors">
                  Logga in →
                </a>
              </Link>
            </div>
          </div>
          <div className="pt-6 border-t border-cream2/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-ink-faint">
            <p>© {new Date().getFullYear()} DAJO · Combined AB</p>
            <p>Byggt i Sverige med ♥ för musiker som vill spela.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
