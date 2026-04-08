import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ChordInput — smart chord input with autocomplete
 * Uses the /api/chords/suggest endpoint (powered by Tonal.js)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { authFetch } from "../lib/api";
export default function ChordInput({ value, onChange, onConfirm, onCancel, placeholder = "Ackord…", autoFocus = true, }) {
    const [suggestions, setSuggestions] = useState([]);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);
    const debounceRef = useRef();
    useEffect(() => {
        if (autoFocus)
            inputRef.current?.focus();
    }, [autoFocus]);
    const fetchSuggestions = useCallback(async (partial) => {
        if (!partial) {
            setSuggestions([]);
            setOpen(false);
            return;
        }
        try {
            const res = await authFetch(`/api/chords/suggest?partial=${encodeURIComponent(partial)}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setSuggestions(data);
                setOpen(true);
                setSelectedIdx(-1);
            }
            else {
                setSuggestions([]);
                setOpen(false);
            }
        }
        catch {
            setSuggestions([]);
            setOpen(false);
        }
    }, []);
    const handleChange = (e) => {
        const v = e.target.value;
        onChange(v);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(v), 150);
    };
    const handleKeyDown = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        }
        else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIdx((i) => Math.max(i - 1, -1));
        }
        else if (e.key === "Enter") {
            e.preventDefault();
            const confirmed = selectedIdx >= 0 ? suggestions[selectedIdx] : value;
            setOpen(false);
            onConfirm(confirmed);
        }
        else if (e.key === "Escape") {
            setOpen(false);
            onCancel();
        }
        else if (e.key === "Tab") {
            e.preventDefault();
            if (selectedIdx >= 0) {
                onChange(suggestions[selectedIdx]);
                onConfirm(suggestions[selectedIdx]);
            }
            else {
                onConfirm(value);
            }
            setOpen(false);
        }
    };
    const pickSuggestion = (s) => {
        onChange(s);
        setOpen(false);
        onConfirm(s);
    };
    return (_jsxs("div", { className: "relative", children: [_jsx("input", { ref: inputRef, value: value, onChange: handleChange, onKeyDown: handleKeyDown, onBlur: () => setTimeout(() => setOpen(false), 120), placeholder: placeholder, className: "w-full bg-transparent text-sm font-mono font-semibold text-indigo-700\n                   focus:outline-none placeholder:text-indigo-300 px-1", spellCheck: false, autoComplete: "off" }), open && suggestions.length > 0 && (_jsx("div", { className: "absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200\n                        rounded-lg shadow-xl min-w-[140px] max-h-48 overflow-y-auto", children: suggestions.map((s, i) => (_jsx("button", { onMouseDown: () => pickSuggestion(s), className: `w-full text-left px-3 py-1.5 text-sm font-mono transition-colors
                         ${i === selectedIdx
                        ? "bg-indigo-600 text-white"
                        : "text-gray-700 hover:bg-indigo-50"}`, children: s }, s))) }))] }));
}
