import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * DAJO 3.0 — Ackorduppspelning med Tone.js + Salamander Piano
 * Spelar upp ackordets noter via ett piano-sampler
 */
import { useState, useCallback } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";
// ─── Tonal för att hitta ackordets noter ─────────────────────────────────────
async function getChordNotes(symbol) {
    try {
        const { Chord } = await import("tonal");
        const chord = Chord.get(symbol);
        if (!chord || chord.notes.length === 0)
            return [];
        // Lägg noter i oktav 4 (mittenregister)
        return chord.notes.slice(0, 4).map((n) => `${n}4`);
    }
    catch {
        return [];
    }
}
// ─── Lazy-ladda Tone.js ───────────────────────────────────────────────────────
let samplerCache = null;
let samplerLoading = false;
const samplerListeners = [];
async function getSampler() {
    if (samplerCache)
        return samplerCache;
    return new Promise((resolve) => {
        samplerListeners.push(resolve);
        if (samplerLoading)
            return;
        samplerLoading = true;
        import("tone").then((Tone) => {
            // Salamander piano samples från Tone.js CDN
            const sampler = new Tone.Sampler({
                urls: {
                    A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
                    A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
                    A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
                    A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
                    A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
                    A5: "A5.mp3", C6: "C6.mp3", "D#6": "Ds6.mp3", "F#6": "Fs6.mp3",
                    A6: "A6.mp3", C7: "C7.mp3", "D#7": "Ds7.mp3", "F#7": "Fs7.mp3",
                    A7: "A7.mp3", C8: "C8.mp3",
                },
                release: 1.5,
                baseUrl: "https://tonejs.github.io/audio/salamander/",
                onload: () => {
                    samplerCache = sampler;
                    samplerListeners.forEach((cb) => cb(sampler));
                    samplerListeners.length = 0;
                },
            }).toDestination();
        });
    });
}
export function ChordPlayerButton({ chords, className = "" }) {
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [loading, setLoading] = useState(false);
    const playChords = useCallback(async () => {
        if (playing || muted)
            return;
        setLoading(true);
        try {
            const Tone = await import("tone");
            await Tone.start(); // kräver user gesture
            const sampler = await getSampler();
            setLoading(false);
            setPlaying(true);
            const now = Tone.now();
            let offset = 0;
            const duration = 1.2; // sekunder per ackord
            for (const chord of chords) {
                const notes = await getChordNotes(chord);
                if (notes.length > 0) {
                    sampler.triggerAttackRelease(notes, duration, now + offset);
                    offset += duration + 0.1;
                }
            }
            // Återställ playing-state efter att alla ackord spelats
            setTimeout(() => setPlaying(false), (offset + 0.5) * 1000);
        }
        catch (err) {
            console.error("Uppspelningsfel:", err);
            setLoading(false);
            setPlaying(false);
        }
    }, [chords, playing, muted]);
    return (_jsxs("div", { className: `flex items-center gap-1 ${className}`, children: [_jsxs("button", { onClick: playChords, disabled: playing || loading, title: `Spela: ${chords.join(", ")}`, className: `flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all
          ${playing
                    ? "bg-green-100 text-green-700"
                    : loading
                        ? "bg-gray-100 text-gray-400 cursor-wait"
                        : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95"}`, children: [loading ? (_jsx("span", { className: "w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" })) : (_jsx(Play, { size: 11, fill: playing ? "currentColor" : "none" })), playing ? "Spelar…" : "Spela"] }), _jsx("button", { onClick: () => setMuted(!muted), title: muted ? "Ljud av" : "Ljud på", className: "p-1 text-gray-300 hover:text-gray-500 transition-colors", children: muted ? _jsx(VolumeX, { size: 12 }) : _jsx(Volume2, { size: 12 }) })] }));
}
// ─── Global volymkontroll (för Settings-panelen) ──────────────────────────────
export function AudioSettings() {
    const [volume, setVolume] = useState(0); // dB, 0 = standard
    const handleVolume = async (val) => {
        setVolume(val);
        try {
            const Tone = await import("tone");
            Tone.getDestination().volume.value = val;
        }
        catch { }
    };
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Volume2, { size: 13, className: "text-gray-400" }), _jsx("input", { type: "range", min: -20, max: 6, value: volume, onChange: (e) => handleVolume(Number(e.target.value)), className: "w-20 accent-indigo-600" }), _jsxs("span", { className: "text-xs text-gray-400", children: [volume > 0 ? "+" : "", volume, " dB"] })] }));
}
