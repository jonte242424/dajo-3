import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Music } from "lucide-react";
export default function Login() {
    const [, setLocation] = useLocation();
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [mode, setMode] = useState("login");
    const handleSubmit = async (e) => {
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
            setLocation("/songs");
        }
        catch {
            setError("Kunde inte ansluta till servern");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex flex-col items-center justify-center px-4", children: [_jsx(Link, { href: "/", children: _jsxs("a", { className: "flex items-center gap-2 mb-8 group", children: [_jsx("div", { className: "w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-700 transition-colors", children: _jsx(Music, { size: 18, className: "text-white" }) }), _jsx("span", { className: "font-bold text-xl text-indigo-700", children: "DAJO 3.0" })] }) }), _jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-sm p-8", children: [_jsx("h1", { className: "text-2xl font-extrabold text-gray-900 mb-1", children: mode === "login" ? "Välkommen tillbaka" : "Skapa konto" }), _jsx("p", { className: "text-gray-400 text-sm mb-7", children: mode === "login" ? "Logga in för att komma åt dina låtar" : "Gratis under betaperioden" }), _jsxs("form", { onSubmit: handleSubmit, className: "flex flex-col gap-3", children: [mode === "register" && (_jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-500 uppercase tracking-wide block mb-1.5", children: "Namn" }), _jsx("input", { type: "text", placeholder: "Ditt namn", value: name, onChange: (e) => setName(e.target.value), className: "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow" })] })), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-500 uppercase tracking-wide block mb-1.5", children: "E-post" }), _jsx("input", { type: "email", placeholder: "din@email.se", value: email, onChange: (e) => setEmail(e.target.value), className: "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow", required: true, autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { className: "text-xs text-gray-500 uppercase tracking-wide block mb-1.5", children: "L\u00F6senord" }), _jsx("input", { type: "password", placeholder: mode === "register" ? "Minst 6 tecken" : "Ditt lösenord", value: password, onChange: (e) => setPassword(e.target.value), className: "w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-shadow", required: true })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 text-sm text-red-700", children: error })), _jsx("button", { type: "submit", disabled: loading, className: "mt-2 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm shadow-indigo-200", children: loading ? "Laddar…" : mode === "login" ? "Logga in" : "Skapa konto" })] }), _jsx("div", { className: "mt-6 pt-5 border-t border-gray-100 text-center", children: _jsxs("p", { className: "text-sm text-gray-400", children: [mode === "login" ? "Inget konto?" : "Har du redan ett konto?", " ", _jsx("button", { className: "text-indigo-600 font-medium hover:underline transition-colors", onClick: () => { setMode(mode === "login" ? "register" : "login"); setError(""); }, children: mode === "login" ? "Registrera dig" : "Logga in" })] }) })] }), _jsx("p", { className: "mt-6 text-xs text-gray-400 text-center max-w-xs", children: "Genom att skapa ett konto godk\u00E4nner du att vi sparar dina l\u00E5tar i v\u00E5r databas." })] }));
}
