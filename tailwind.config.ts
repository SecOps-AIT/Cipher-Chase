import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vault: {
          black: "#05070B",
          dark: "#080C14",
          card: "#0D131F",
          "card-hover": "#111A2B",
          border: "#1E293B",
          "border-light": "#2A3B53",
          red: "#EF4444",
          "red-dark": "#7F1D1D",
          cyan: "#06B6D4",
          "cyan-dark": "#0E7490",
          emerald: "#10B981",
          amber: "#F59E0B",
        },
        cyber: {
          dark: "#080c14",
          darker: "#04070d",
          card: "#0d131f",
          border: "#1e293b",
          cyan: "#00f0ff",
          neon: "#00ff66",
          purple: "#9d4edd",
          crimson: "#ff0055",
          yellow: "#ffbe0b",
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        "cyan-glow": "0 0 20px -5px rgba(6, 182, 212, 0.4)",
        "neon-glow": "0 0 20px -5px rgba(16, 185, 129, 0.4)",
        "crimson-glow": "0 0 20px -5px rgba(239, 68, 68, 0.4)",
        "gold-glow": "0 0 20px -5px rgba(245, 158, 11, 0.45)",
        "emerald-glow": "0 0 20px -5px rgba(16, 185, 129, 0.45)",
        "vault-subtle": "0 4px 20px -2px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
