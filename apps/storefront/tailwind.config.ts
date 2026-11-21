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
      colors: {
        canvas: "#ffffff",
        ink: {
          DEFAULT: "#14293a",
          secondary: "#6c7079",
          muted: "#8a909a",
        },
        surface: {
          DEFAULT: "#f8f8f8",
          alt: "#f1f1f1",
          border: "#d3d6db",
        },
        accent: {
          DEFAULT: "#b91c1c",
          hover: "#991b1b",
          light: "#fef2f2",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      maxWidth: {
        ecom: "1320px",
      },
    },
  },
  plugins: [],
};

export default config;
