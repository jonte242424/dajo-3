import { Link } from "wouter";
import { useState } from "react";
import {
  Music, Upload, Download, Share2, ListMusic,
  ChevronDown, ChevronUp, Star, Zap, Shield, Smartphone,
} from "lucide-react";

// ─── FAQ item ─────────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left gap-4"
      >
        <span className="font-medium text-gray-800">{q}</span>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0" /> : <ChevronDown size={16} className="text-gray-400 shrink-0" />}
      </button>
      {open && <p className="mt-3 text-gray-600 text-sm leading-relaxed">{a}</p>}
    </div>
  );
}

// ─── Landing ──────────────────────────────────────────────────────────────────

export default function Landing() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handlePilot(e: React.FormEvent) {
    e.preventDefault();
    // Spara lokalt — i produktion skicka till ett API
    const signups = JSON.parse(localStorage.getItem("pilot_signups") || "[]");
    signups.push({ email, ts: new Date().toISOString() });
    localStorage.setItem("pilot_signups", JSON.stringify(signups));
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Music size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg text-indigo-700">DAJO 3.0</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#features" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors">
              Funktioner
            </a>
            <a href="#faq" className="hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors">
              FAQ
            </a>
            <Link href="/login">
              <a className="px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors">
                Logga in
              </a>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-28 pb-20 px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Star size={12} fill="currentColor" /> Professionell app för musiker
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
            Dina ackordscheman —{" "}
            <span className="text-indigo-600">äntligen organiserade</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            DAJO är appen som förstår musik. Importera PDF, bild eller notera ackord
            direkt — och exportera proffsiga scheman på sekunder. Perfekt för jazzare,
            singers och låtskrivare.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/login">
              <a className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-base">
                <Zap size={18} /> Kom igång gratis
              </a>
            </Link>
            <a
              href="#pilot"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-base"
            >
              Bli pilotanvändare
            </a>
          </div>
          <p className="mt-4 text-xs text-gray-400">Inget kreditkort krävs · Gratis under beta</p>
        </div>

        {/* Hero UI preview */}
        <div className="max-w-4xl mx-auto mt-14">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="ml-4 flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200">
                dajo.app/editor/autumn-leaves
              </div>
            </div>
            {/* Fake editor */}
            <div className="p-5 bg-gray-50">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-bold text-gray-800 text-lg">Autumn Leaves</span>
                <span className="text-sm text-gray-400">· Joseph Kosma · G · Jazz · ♩120</span>
                <div className="ml-auto flex gap-2">
                  <span className="px-3 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 bg-white">Dela</span>
                  <span className="px-3 py-1 border border-indigo-300 rounded-lg text-xs text-indigo-600 bg-white">Exportera</span>
                  <span className="px-3 py-1 bg-indigo-600 rounded-lg text-xs text-white">Spara</span>
                </div>
              </div>
              {/* Section A */}
              <div className="mb-3">
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-indigo-700 text-white text-xs font-bold rounded-lg">A</span>
                  <span className="text-xs text-gray-400">4 takter</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    ["Am7", "D7"], ["Gmaj7"], ["Cmaj7"], ["F#m7b5", "B7"]
                  ].map((bar, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 min-h-[52px] flex items-center justify-center">
                      <span className="font-bold text-gray-800 text-sm text-center">{bar.join("  ")}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Section B */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-indigo-700 text-white text-xs font-bold rounded-lg">B</span>
                  <span className="text-xs text-gray-400">4 takter</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[["Em7"], ["Em7"], ["Am7", "D7"], ["Gmaj7"]].map((bar, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl p-3 min-h-[52px] flex items-center justify-center">
                      <span className="font-bold text-gray-800 text-sm">{bar.join("  ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              Allt du behöver. Inget du inte behöver.
            </h2>
            <p className="mt-3 text-gray-500 text-lg">
              Byggt av musiker, för musiker.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Upload size={22} className="text-indigo-600" />,
                title: "AI-import",
                desc: "Ladda upp en bild eller PDF av ett ackordschema — Claude AI läser av det och skapar ett redigerbart schema direkt.",
              },
              {
                icon: <Music size={22} className="text-indigo-600" />,
                title: "Musikteori inbyggd",
                desc: "Appen förstår tonarter, diatoniska ackord, transponering och Roman numeral-analys via Tonal.js.",
              },
              {
                icon: <Download size={22} className="text-indigo-600" />,
                title: "PDF-export · 3 stilar",
                desc: "Exportera som iReal Grid, Songbook eller Notation. Proffsiga PDF:er redo att skriva ut eller dela.",
              },
              {
                icon: <ListMusic size={22} className="text-indigo-600" />,
                title: "Spellistor",
                desc: "Sätt ihop spellistor för konserter och repetitioner. Drag-and-drop för att ordna låtarnas ordning.",
              },
              {
                icon: <Share2 size={22} className="text-indigo-600" />,
                title: "Dela med ett klick",
                desc: "Gör en låt offentlig och dela en länk med bandmedlemmar eller elever — ingen inloggning krävs för att läsa.",
              },
              {
                icon: <Smartphone size={22} className="text-indigo-600" />,
                title: "Fungerar på mobilen",
                desc: "Responsiv design som fungerar lika bra på telefon som på dator — på scen eller i repetitionslokalen.",
              },
            ].map((f, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20 px-4 bg-indigo-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-12">Så enkelt fungerar det</h2>
          <div className="flex flex-col sm:flex-row gap-8 justify-center items-start">
            {[
              { step: "1", title: "Importera eller skapa", desc: "Ladda upp en PDF, foto eller starta ett tomt schema från grunden." },
              { step: "2", title: "Redigera & transponera", desc: "Klicka på en takt för att redigera ackord. Transponera hela låten med ett knapptryck." },
              { step: "3", title: "Exportera & dela", desc: "Ladda ner en proffsig PDF eller dela en länk med ditt band." },
            ].map((s) => (
              <div key={s.step} className="flex-1">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white text-xl font-extrabold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-20 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold text-gray-900 mb-10 text-center">Vanliga frågor</h2>
          <div className="divide-y divide-gray-200">
            {[
              {
                q: "Är DAJO gratis?",
                a: "Ja, under betaperioden är DAJO helt gratis att använda. Alla funktioner är tillgängliga utan kostnad.",
              },
              {
                q: "Vilka filformat kan jag importera?",
                a: "Du kan importera PDF-filer, JPEG, PNG och WebP-bilder. AI:n (Claude från Anthropic) läser av ackordscheman och skapar ett redigerbart schema åt dig.",
              },
              {
                q: "Hur fungerar AI-importen?",
                a: "Du laddar upp en bild eller PDF av ett ackordschema. Claude Vision analyserar filen och extraherar tonart, tempo, sektioner och ackord automatiskt — du kan sedan redigera resultatet.",
              },
              {
                q: "Kan jag dela mina ackordscheman?",
                a: "Ja! Med ett knapptryck gör du ett schema offentligt och får en delbar länk. Mottagaren behöver inte ett DAJO-konto för att se schemat.",
              },
              {
                q: "Vilka PDF-stilar kan jag exportera?",
                a: "Tre stilar: iReal Grid (ackordschema i rutnät), Songbook (ackord ovanför textrader) och Notation (notradsutseende med ackordsymboler).",
              },
              {
                q: "Sparas mina låtar i molnet?",
                a: "Ja, alla låtar sparas i databasen och är tillgängliga oavsett vilken enhet du loggar in från.",
              },
            ].map((item, i) => (
              <FaqItem key={i} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pilot signup ── */}
      <section id="pilot" className="py-20 px-4 bg-gradient-to-br from-indigo-600 to-indigo-800">
        <div className="max-w-xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <Shield size={12} /> Begränsade platser
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">
            Bli pilotanvändare
          </h2>
          <p className="text-indigo-200 mb-8 text-lg">
            Få tidig tillgång, påverka funktioner och hjälp oss bygga den bästa
            appen för musiker. Vi kontaktar dig när beta öppnar.
          </p>
          {submitted ? (
            <div className="bg-white/20 rounded-2xl py-6 px-8">
              <p className="text-xl font-bold mb-2">Tack! 🎵</p>
              <p className="text-indigo-200 text-sm">
                Vi hör av oss när piloten öppnar. Välkommen ombord!
              </p>
            </div>
          ) : (
            <form onSubmit={handlePilot} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="din@email.se"
                className="flex-1 px-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors whitespace-nowrap text-sm"
              >
                Anmäl mig
              </button>
            </form>
          )}
          <p className="mt-4 text-xs text-indigo-300">Vi skickar inga spam — bara relevant information om DAJO.</p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <Music size={12} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">DAJO 3.0</span>
          </div>
          <p className="text-xs text-gray-500">© {new Date().getFullYear()} DAJO — Music chord charts. Byggd med ♥ för musiker.</p>
          <Link href="/login">
            <a className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
              Logga in →
            </a>
          </Link>
        </div>
      </footer>
    </div>
  );
}
