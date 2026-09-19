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
        "cyan-glow": "0 0 20px -5px rgba(0, 240, 255, 0.4)",
        "neon-glow": "0 0 20px -5px rgba(0, 255, 102, 0.4)",
        "purple-glow": "0 0 20px -5px rgba(157, 78, 221, 0.4)",
        "crimson-glow": "0 0 20px -5px rgba(255, 0, 85, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;
