/**
 * ChordAutocomplete — always-on text input med ackordförslag
 *
 * ChordInput är byggd för aktiveringsbaserad redigering i iReal-griden
 * (klick → redigera → Enter för att bekräfta). SongbookEditor och
 * NotationEditor behöver istället en vanlig <input> med förslag — den
 * här komponenten är den lätta varianten.
 *
 * Samma suggest-endpoint (/api/chords/suggest) för konsistent matchning
 * mellan de tre editorerna.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { authFetch } from "../lib/api";

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Anropas när användaren "commitar" (blur, Enter, eller klick på förslag) */
  onCommit?: (value: string) => void;
}

export default function ChordAutocomplete({
  value,
  onChange,
  placeholder = "Ackord…",
  className = "",
  onCommit,
}: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchSuggestions = useCallback(async (partial: string) => {
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
      } else {
        setSuggestions([]);
        setOpen(false);
      }
    } catch {
      setSuggestions([]);
      setOpen(false);
    }
  }, []);

  // Stäng förslagslistan om användaren klickar utanför
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!inputRef.current) return;
      if (!inputRef.current.parentElement?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(v), 120);
  }

  function pickSuggestion(s: string) {
    onChange(s);
    setOpen(false);
    onCommit?.(s);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "Enter") {
        e.preventDefault();
        onCommit?.(value);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (selectedIdx >= 0) {
        e.preventDefault();
        pickSuggestion(suggestions[selectedIdx]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        setOpen(false);
        onCommit?.(value);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative inline-block">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (value) fetchSuggestions(value); }}
        onBlur={() => setTimeout(() => { setOpen(false); onCommit?.(value); }, 120)}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className={className}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200
                        rounded-lg shadow-xl min-w-[140px] max-h-56 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s); }}
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
