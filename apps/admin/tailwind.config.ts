import type { Config } from "tailwindcss";
import sharedPreset from "@repo/ui/tailwind.preset";

const config: Config = {
  presets: [sharedPreset as any],
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space-grotesk)", "'Space Grotesk'", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        serif: ["var(--font-space-grotesk)", "'Space Grotesk'", "sans-serif"],
        mono: ["var(--font-space-grotesk)", "'Space Grotesk'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
