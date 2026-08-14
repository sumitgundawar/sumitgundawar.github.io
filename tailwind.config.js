/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens (remap per world via CSS variables)
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        hair: "var(--hair)",
        "hair-strong": "var(--hair-strong)",
        fg: "var(--fg)",
        "fg-dim": "var(--fg-dim)",
        // Status — constant across worlds, mean health only
        signal: "var(--signal)",
        warn: "var(--warn)",
        crit: "var(--crit)",
        cool: "var(--cool)",
        // Raw archive ink for explicit paper use
        paper: "var(--paper)",
        "paper-ink": "var(--paper-ink)",
        "paper-line": "var(--paper-line)",
      },
      fontFamily: {
        sans: [
          "Mona Sans Variable",
          "General Sans",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: ["Commit Mono", "JetBrains Mono", "ui-monospace", "monospace"],
        serif: ["Newsreader Variable", "Newsreader", "Georgia", "serif"],
      },
      fontSize: {
        eyebrow: ["11px", { lineHeight: "1", letterSpacing: "0.08em" }],
        tele: ["12.5px", { lineHeight: "1.45" }],
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "1px",
        md: "2px",
        lg: "4px",
      },
      letterSpacing: {
        tightish: "-0.01em",
        tighter2: "-0.02em",
      },
      transitionTimingFunction: {
        instrument: "cubic-bezier(0.2, 0.7, 0.2, 1)",
      },
      keyframes: {
        blink: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.2" },
        },
      },
      animation: {
        blink: "blink 1.1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};
