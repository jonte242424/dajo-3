import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "wouter";
import { useState } from "react";
import { Music, Upload, Download, Share2, ListMusic, ChevronDown, ChevronUp, Star, Zap, Shield, Smartphone, } from "lucide-react";
// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }) {
    const [open, setOpen] = useState(false);
    return (_jsxs("div", { className: "border-b border-gray-200 py-4", children: [_jsxs("button", { onClick: () => setOpen(!open), className: "w-full flex items-center justify-between text-left gap-4", children: [_jsx("span", { className: "font-medium text-gray-800", children: q }), open ? _jsx(ChevronUp, { size: 16, className: "text-gray-400 shrink-0" }) : _jsx(ChevronDown, { size: 16, className: "text-gray-400 shrink-0" })] }), open && _jsx("p", { className: "mt-3 text-gray-600 text-sm leading-relaxed", children: a })] }));
}
// ─── Landing ──────────────────────────────────────────────────────────────────
export default function Landing() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    function handlePilot(e) {
        e.preventDefault();
        // Spara lokalt — i produktion skicka till ett API
        const signups = JSON.parse(localStorage.getItem("pilot_signups") || "[]");
        signups.push({ email, ts: new Date().toISOString() });
        localStorage.setItem("pilot_signups", JSON.stringify(signups));
        setSubmitted(true);
    }
    return (_jsxs("div", { className: "min-h-screen bg-white text-gray-900 overflow-x-hidden", children: [_jsx("nav", { className: "fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100", children: _jsxs("div", { className: "max-w-5xl mx-auto px-4 py-3 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center", children: _jsx(Music, { size: 16, className: "text-white" }) }), _jsx("span", { className: "font-bold text-lg text-indigo-700", children: "DAJO 3.0" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("a", { href: "#features", className: "hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors", children: "Funktioner" }), _jsx("a", { href: "#faq", className: "hidden sm:block text-sm text-gray-500 hover:text-gray-800 transition-colors", children: "FAQ" }), _jsx(Link, { href: "/login", children: _jsx("a", { className: "px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors", children: "Logga in" }) })] })] }) }), _jsxs("section", { className: "pt-28 pb-20 px-4 bg-gradient-to-br from-indigo-50 via-white to-blue-50", children: [_jsxs("div", { className: "max-w-3xl mx-auto text-center", children: [_jsxs("div", { className: "inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6", children: [_jsx(Star, { size: 12, fill: "currentColor" }), " Professionell app f\u00F6r musiker"] }), _jsxs("h1", { className: "text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight", children: ["Dina ackordscheman \u2014", " ", _jsx("span", { className: "text-indigo-600", children: "\u00E4ntligen organiserade" })] }), _jsx("p", { className: "mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed", children: "DAJO \u00E4r appen som f\u00F6rst\u00E5r musik. Importera PDF, bild eller notera ackord direkt \u2014 och exportera proffsiga scheman p\u00E5 sekunder. Perfekt f\u00F6r jazzare, singers och l\u00E5tskrivare." }), _jsxs("div", { className: "mt-8 flex flex-col sm:flex-row gap-3 justify-center", children: [_jsx(Link, { href: "/login", children: _jsxs("a", { className: "inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 text-base", children: [_jsx(Zap, { size: 18 }), " Kom ig\u00E5ng gratis"] }) }), _jsx("a", { href: "#pilot", className: "inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors text-base", children: "Bli pilotanv\u00E4ndare" })] }), _jsx("p", { className: "mt-4 text-xs text-gray-400", children: "Inget kreditkort kr\u00E4vs \u00B7 Gratis under beta" })] }), _jsx("div", { className: "max-w-4xl mx-auto mt-14", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden", children: [_jsxs("div", { className: "flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200", children: [_jsx("div", { className: "w-3 h-3 rounded-full bg-red-400" }), _jsx("div", { className: "w-3 h-3 rounded-full bg-yellow-400" }), _jsx("div", { className: "w-3 h-3 rounded-full bg-green-400" }), _jsx("div", { className: "ml-4 flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-400 border border-gray-200", children: "dajo.app/editor/autumn-leaves" })] }), _jsxs("div", { className: "p-5 bg-gray-50", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("span", { className: "font-bold text-gray-800 text-lg", children: "Autumn Leaves" }), _jsx("span", { className: "text-sm text-gray-400", children: "\u00B7 Joseph Kosma \u00B7 G \u00B7 Jazz \u00B7 \u2669120" }), _jsxs("div", { className: "ml-auto flex gap-2", children: [_jsx("span", { className: "px-3 py-1 border border-gray-200 rounded-lg text-xs text-gray-500 bg-white", children: "Dela" }), _jsx("span", { className: "px-3 py-1 border border-indigo-300 rounded-lg text-xs text-indigo-600 bg-white", children: "Exportera" }), _jsx("span", { className: "px-3 py-1 bg-indigo-600 rounded-lg text-xs text-white", children: "Spara" })] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("span", { className: "px-3 py-1 bg-indigo-700 text-white text-xs font-bold rounded-lg", children: "A" }), _jsx("span", { className: "text-xs text-gray-400", children: "4 takter" })] }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: [
                                                        ["Am7", "D7"], ["Gmaj7"], ["Cmaj7"], ["F#m7b5", "B7"]
                                                    ].map((bar, i) => (_jsx("div", { className: "bg-white border border-gray-200 rounded-xl p-3 min-h-[52px] flex items-center justify-center", children: _jsx("span", { className: "font-bold text-gray-800 text-sm text-center", children: bar.join("  ") }) }, i))) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-3 mb-2", children: [_jsx("span", { className: "px-3 py-1 bg-indigo-700 text-white text-xs font-bold rounded-lg", children: "B" }), _jsx("span", { className: "text-xs text-gray-400", children: "4 takter" })] }), _jsx("div", { className: "grid grid-cols-4 gap-2", children: [["Em7"], ["Em7"], ["Am7", "D7"], ["Gmaj7"]].map((bar, i) => (_jsx("div", { className: "bg-white border border-gray-200 rounded-xl p-3 min-h-[52px] flex items-center justify-center", children: _jsx("span", { className: "font-bold text-gray-800 text-sm", children: bar.join("  ") }) }, i))) })] })] })] }) })] }), _jsx("section", { id: "features", className: "py-20 px-4 bg-white", children: _jsxs("div", { className: "max-w-5xl mx-auto", children: [_jsxs("div", { className: "text-center mb-14", children: [_jsx("h2", { className: "text-3xl sm:text-4xl font-extrabold text-gray-900", children: "Allt du beh\u00F6ver. Inget du inte beh\u00F6ver." }), _jsx("p", { className: "mt-3 text-gray-500 text-lg", children: "Byggt av musiker, f\u00F6r musiker." })] }), _jsx("div", { className: "grid sm:grid-cols-2 lg:grid-cols-3 gap-6", children: [
                                {
                                    icon: _jsx(Upload, { size: 22, className: "text-indigo-600" }),
                                    title: "AI-import",
                                    desc: "Ladda upp en bild eller PDF av ett ackordschema — Claude AI läser av det och skapar ett redigerbart schema direkt.",
                                },
                                {
                                    icon: _jsx(Music, { size: 22, className: "text-indigo-600" }),
                                    title: "Musikteori inbyggd",
                                    desc: "Appen förstår tonarter, diatoniska ackord, transponering och Roman numeral-analys via Tonal.js.",
                                },
                                {
                                    icon: _jsx(Download, { size: 22, className: "text-indigo-600" }),
                                    title: "PDF-export · 3 stilar",
                                    desc: "Exportera som iReal Grid, Songbook eller Notation. Proffsiga PDF:er redo att skriva ut eller dela.",
                                },
                                {
                                    icon: _jsx(ListMusic, { size: 22, className: "text-indigo-600" }),
                                    title: "Spellistor",
                                    desc: "Sätt ihop spellistor för konserter och repetitioner. Drag-and-drop för att ordna låtarnas ordning.",
                                },
                                {
                                    icon: _jsx(Share2, { size: 22, className: "text-indigo-600" }),
                                    title: "Dela med ett klick",
                                    desc: "Gör en låt offentlig och dela en länk med bandmedlemmar eller elever — ingen inloggning krävs för att läsa.",
                                },
                                {
                                    icon: _jsx(Smartphone, { size: 22, className: "text-indigo-600" }),
                                    title: "Fungerar på mobilen",
                                    desc: "Responsiv design som fungerar lika bra på telefon som på dator — på scen eller i repetitionslokalen.",
                                },
                            ].map((f, i) => (_jsxs("div", { className: "p-6 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-sm transition-all", children: [_jsx("div", { className: "w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center mb-4", children: f.icon }), _jsx("h3", { className: "font-bold text-gray-900 mb-2", children: f.title }), _jsx("p", { className: "text-gray-500 text-sm leading-relaxed", children: f.desc })] }, i))) })] }) }), _jsx("section", { className: "py-20 px-4 bg-indigo-50", children: _jsxs("div", { className: "max-w-3xl mx-auto text-center", children: [_jsx("h2", { className: "text-3xl font-extrabold text-gray-900 mb-12", children: "S\u00E5 enkelt fungerar det" }), _jsx("div", { className: "flex flex-col sm:flex-row gap-8 justify-center items-start", children: [
                                { step: "1", title: "Importera eller skapa", desc: "Ladda upp en PDF, foto eller starta ett tomt schema från grunden." },
                                { step: "2", title: "Redigera & transponera", desc: "Klicka på en takt för att redigera ackord. Transponera hela låten med ett knapptryck." },
                                { step: "3", title: "Exportera & dela", desc: "Ladda ner en proffsig PDF eller dela en länk med ditt band." },
                            ].map((s) => (_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "w-12 h-12 rounded-2xl bg-indigo-600 text-white text-xl font-extrabold flex items-center justify-center mx-auto mb-4", children: s.step }), _jsx("h3", { className: "font-bold text-gray-900 mb-2", children: s.title }), _jsx("p", { className: "text-gray-500 text-sm", children: s.desc })] }, s.step))) })] }) }), _jsx("section", { id: "faq", className: "py-20 px-4 bg-white", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsx("h2", { className: "text-3xl font-extrabold text-gray-900 mb-10 text-center", children: "Vanliga fr\u00E5gor" }), _jsx("div", { className: "divide-y divide-gray-200", children: [
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
                            ].map((item, i) => (_jsx(FaqItem, { q: item.q, a: item.a }, i))) })] }) }), _jsx("section", { id: "pilot", className: "py-20 px-4 bg-gradient-to-br from-indigo-600 to-indigo-800", children: _jsxs("div", { className: "max-w-xl mx-auto text-center text-white", children: [_jsxs("div", { className: "inline-flex items-center gap-2 bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6", children: [_jsx(Shield, { size: 12 }), " Begr\u00E4nsade platser"] }), _jsx("h2", { className: "text-3xl sm:text-4xl font-extrabold mb-4", children: "Bli pilotanv\u00E4ndare" }), _jsx("p", { className: "text-indigo-200 mb-8 text-lg", children: "F\u00E5 tidig tillg\u00E5ng, p\u00E5verka funktioner och hj\u00E4lp oss bygga den b\u00E4sta appen f\u00F6r musiker. Vi kontaktar dig n\u00E4r beta \u00F6ppnar." }), submitted ? (_jsxs("div", { className: "bg-white/20 rounded-2xl py-6 px-8", children: [_jsx("p", { className: "text-xl font-bold mb-2", children: "Tack! \uD83C\uDFB5" }), _jsx("p", { className: "text-indigo-200 text-sm", children: "Vi h\u00F6r av oss n\u00E4r piloten \u00F6ppnar. V\u00E4lkommen ombord!" })] })) : (_jsxs("form", { onSubmit: handlePilot, className: "flex flex-col sm:flex-row gap-3", children: [_jsx("input", { type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), placeholder: "din@email.se", className: "flex-1 px-4 py-3 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-gray-400" }), _jsx("button", { type: "submit", className: "px-6 py-3 bg-white text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors whitespace-nowrap text-sm", children: "Anm\u00E4l mig" })] })), _jsx("p", { className: "mt-4 text-xs text-indigo-300", children: "Vi skickar inga spam \u2014 bara relevant information om DAJO." })] }) }), _jsx("footer", { className: "py-10 px-4 bg-gray-900 text-gray-400", children: _jsxs("div", { className: "max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded bg-indigo-600 flex items-center justify-center", children: _jsx(Music, { size: 12, className: "text-white" }) }), _jsx("span", { className: "text-sm font-semibold text-white", children: "DAJO 3.0" })] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["\u00A9 ", new Date().getFullYear(), " DAJO \u2014 Music chord charts. Byggd med \u2665 f\u00F6r musiker."] }), _jsx(Link, { href: "/login", children: _jsx("a", { className: "text-sm text-indigo-400 hover:text-indigo-300 transition-colors", children: "Logga in \u2192" }) })] }) })] }));
}
