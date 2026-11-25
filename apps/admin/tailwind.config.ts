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
        card: {
          DEFAULT: 'rgb(var(--chrome-900) / <alpha-value>)',
          foreground: 'rgb(var(--text-main, 15 23 42) / <alpha-value>)',
        },
        border: 'rgb(var(--chrome-800) / <alpha-value>)',
        muted: {
          DEFAULT: 'rgb(var(--chrome-850) / <alpha-value>)',
          foreground: 'rgb(var(--text-muted, 100 116 139) / <alpha-value>)',
        },
        chrome: {
          950: 'rgb(var(--chrome-950) / <alpha-value>)',
          900: 'rgb(var(--chrome-900) / <alpha-value>)',
          850: 'rgb(var(--chrome-850) / <alpha-value>)',
          800: 'rgb(var(--chrome-800) / <alpha-value>)',
          750: 'rgb(var(--chrome-750) / <alpha-value>)',
          700: 'rgb(var(--chrome-700) / <alpha-value>)',
        },
        terminal: {
          bg: 'rgb(var(--chrome-950) / <alpha-value>)',
          panel: 'rgb(var(--chrome-900) / <alpha-value>)',
          surface: 'rgb(var(--chrome-900) / <alpha-value>)',
          border: 'rgb(var(--chrome-800) / <alpha-value>)',
          muted: 'rgb(var(--text-muted, 100 116 139) / <alpha-value>)',
          accent: '#D4AF37',
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
        '3xs': ['9px', '11px'],
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
