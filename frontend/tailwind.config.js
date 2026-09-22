/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0a0a0a",
        panel: "#131316",
        panel2: "#1a1a1e",
        line: "#232328",
        cyan: {
          DEFAULT: "#4fd1c5",
          dim: "#2e7d74",
        },
        amber: {
          DEFAULT: "#f2a341",
          dim: "#8a5c26",
        },
        ink: {
          DEFAULT: "#f2f2f0",
          dim: "#8b8b93",
          faint: "#55555c",
        },
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      borderRadius: {
        console: "10px",
      },
      spacing: {
        "safe-t": "env(safe-area-inset-top, 0px)",
        "safe-b": "env(safe-area-inset-bottom, 0px)",
      },
    },
  },
  plugins: [],
};
