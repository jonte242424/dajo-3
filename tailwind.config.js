/** @type {import('tailwindcss').Config} */
export default {
  content: ["./client/index.html", "./client/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ─── DAJO Brand Palette (Klevgrand-inspired, anchored to logo) ───
        cream:       "#FBF8F3",   // app background — warm off-white
        cream2:      "#F5F0E6",   // subtle section bg
        ink:         "#1F2937",   // primary text
        "ink-soft":  "#6B7280",   // secondary text
        "ink-faint": "#9CA3AF",   // labels, hints

        // Primary (logo blue — the shirts)
        steel: {
          50:  "#EEF4FA",
          100: "#D9E5F2",
          200: "#B7CDE5",
          300: "#8DAFD2",
          400: "#6991BD",
          500: "#4A7BAB",   // ★ primary
          600: "#3A6391",
          700: "#2E4F75",
          800: "#243E5C",
          900: "#1A2540",   // dark mode bg / scen-mörker
        },

        // Accent (logo outline — warm orange)
        amber: {
          50:  "#FDF6EC",
          100: "#FAE9CF",
          200: "#F4D29F",
          300: "#EFBA70",
          400: "#EBA858",
          500: "#E89B4A",   // ★ accent
          600: "#D17F2C",
          700: "#A86223",
          800: "#7E4A1A",
          900: "#553111",
        },

        // Pastel sidekicks (Klevgrand-style soft palette)
        sage:      "#95B8B3",
        pistachio: "#B8D091",
        peach:     "#FFC09C",
        // Rose: DEFAULT bevarar den gamla singelfärgen så bg-rose/bg-rose/20
        // fortfarande funkar överallt, PLUS en full skala så bg-rose-600
        // osv genereras för feedback-widget + status-pills.
        rose: {
          DEFAULT: "#E4BCCA",
          50:  "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
        },
        lavender:  "#B49DC1",
        butter:    "#EBE8A4",
        gold:      "#D9A741",

        // Status-skalor: emerald för "Klar", gray för "Skippas". Nya skalor,
        // ingen befintlig kod använder dem så inget kan brytas.
        emerald: {
          50:  "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
        },
        gray: {
          50:  "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft':  '0 2px 12px -2px rgba(74, 123, 171, 0.10)',
        'lift':  '0 8px 28px -10px rgba(74, 123, 171, 0.25)',
        'sun':   '0 12px 40px -12px rgba(232, 155, 74, 0.35)',
      },
      backgroundImage: {
        'sunburst':    'radial-gradient(ellipse at center top, #FBE9B8 0%, #FBF8F3 60%)',
        'cream-fade':  'linear-gradient(180deg, #FBF8F3 0%, #F5F0E6 100%)',
        'steel-fade':  'linear-gradient(135deg, #2E4F75 0%, #1A2540 100%)',
        'stage-fade':  'linear-gradient(180deg, #1A2540 0%, #0F1828 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'float-slow': {
          '0%,100%': { transform: 'translateY(0) rotate(-6deg)' },
          '50%':     { transform: 'translateY(-8px) rotate(-4deg)' },
        },
        'float-rev': {
          '0%,100%': { transform: 'translateY(0) rotate(5deg)' },
          '50%':     { transform: 'translateY(-6px) rotate(7deg)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(232, 155, 74, 0.4)' },
          '50%':     { boxShadow: '0 0 0 10px rgba(232, 155, 74, 0)' },
        },
      },
      animation: {
        'fade-up':    'fade-up 0.7s ease-out both',
        'float-slow': 'float-slow 5s ease-in-out infinite',
        'float-rev':  'float-rev 6s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-out infinite',
      },
    },
  },
  plugins: [],
};
