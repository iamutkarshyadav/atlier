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
        chrome: {
          950: '#09090B',
          900: '#121215',
          850: '#18181B',
          800: '#27272A',
          700: '#3F3F46',
        },
        status: {
          emerald: {
            bg: '#064E3B',
            text: '#34D399',
            border: '#059669',
          },
          amber: {
            bg: '#78350F',
            text: '#FBBF24',
            border: '#D97706',
          },
          rose: {
            bg: '#881337',
            text: '#FDA4AF',
            border: '#E11D48',
          },
          cyan: {
            bg: '#164E63',
            text: '#67E8F9',
            border: '#0891B2',
          },
        },
      },
      fontSize: {
        '2xs': ['10px', '12px'],
        'xs': ['11px', '14px'],
        'sm': ['12px', '16px'],
        'base': ['13px', '18px'],
        'lg': ['15px', '22px'],
      },
      fontFamily: {
        sans: [
          "'Plus Jakarta Sans'",
          "'Geist'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "Roboto",
          "sans-serif",
        ],
        mono: ["'JetBrains Mono'", "'Geist Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
