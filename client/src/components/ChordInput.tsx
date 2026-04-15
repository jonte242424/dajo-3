/**
 * ChordInput — smart chord input with autocomplete
 * Uses the /api/chords/suggest endpoint (powered by Tonal.js)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { authFetch } from "../lib/api";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
  onCancel: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function ChordInput({
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder = "Ackord…",
  autoFocus = true,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const fetchSuggestions = useCallback(async (partial: string) => {
    if (!partial) { setSuggestions([]); setOpen(false); return; }
    try {
      const res = await authFetch(`/api/chords/suggest?partial=${encodeURIComponent(partial)}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setSuggestions(data);
        setOpen(true);
        setSelectedIdx(-1);
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const confirmed = selectedIdx >= 0 ? suggestions[selectedIdx] : value;
      setOpen(false);
      onConfirm(confirmed);
    } else if (e.key === "Escape") {
      setOpen(false);
      onCancel();
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (selectedIdx >= 0) {
        onChange(suggestions[selectedIdx]);
        onConfirm(suggestions[selectedIdx]);
      } else {
        onConfirm(value);
      }
      setOpen(false);
    }
  };

  const pickSuggestion = (s: string) => {
    onChange(s);
    setOpen(false);
    onConfirm(s);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm font-mono font-semibold text-steel-700
                   focus:outline-none placeholder:text-steel-300 px-1"
        spellCheck={false}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200
                        rounded-lg shadow-xl min-w-[140px] max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s}
              onMouseDown={() => pickSuggestion(s)}
              className={`w-full text-left px-3 py-1.5 text-sm font-mono transition-colors
                         ${i === selectedIdx
                           ? "bg-steel-600 text-white"
                           : "text-gray-700 hover:bg-steel-50"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
