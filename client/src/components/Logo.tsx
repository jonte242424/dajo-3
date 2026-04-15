/**
 * DAJO Logo — wordmark for nav/header/footer (small),
 * plus DajoCartoon for hero-sized usage.
 */

export function Logo({ size = "md", showWordmark = true }: { size?: "sm" | "md" | "lg"; showWordmark?: boolean }) {
  const dim = size === "sm" ? 32 : size === "lg" ? 52 : 40;
  const text = size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl";

  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/dajo-mark.png"
        alt="DAJO"
        width={dim}
        height={dim}
        className="rounded-2xl shadow-soft object-cover"
      />
      {showWordmark && (
        <span className={`font-display font-extrabold text-steel-700 tracking-tight ${text}`}>
          DAJO
        </span>
      )}
    </div>
  );
}

/**
 * Hero cartoon — Jonte + David, in same hand-drawn style as the mark.
 * Uses the JPG version for fast loading; falls back to PNG if not yet present.
 */
export function DajoCartoon({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <img
        src="/dajo-cartoon.jpg"
        alt="DAJO — Jonas och David, två musikerkompisar"
        className="w-full h-auto rounded-3xl shadow-lift"
      />
    </div>
  );
}
