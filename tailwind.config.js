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
        rose:      "#E4BCCA",
        lavender:  "#B49DC1",
        butter:    "#EBE8A4",
        gold:      "#D9A741",
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
