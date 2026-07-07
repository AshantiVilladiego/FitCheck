import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1B1F3B",
        paper: "#FBF9F4",
        highlight: "#C6F135", // neon green
        neonYellow: "#FFE347", // neon yellow
        flag: "#FF2EC4", // neon pink (was coral — now doubles as the pink accent)
        slate: {
          DEFAULT: "#6B7280",
          light: "#9CA3AF",
        },
        line: "#E4E1D8",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-lines":
          "linear-gradient(#E4E1D8 1px, transparent 1px), linear-gradient(90deg, #E4E1D8 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
