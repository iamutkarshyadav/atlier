/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border, 0 0% 90%))",
        input: "hsl(var(--input, 0 0% 90%))",
        ring: "hsl(var(--ring, 0 0% 10%))",
        background: "hsl(var(--background, 0 0% 99%))",
        foreground: "hsl(var(--foreground, 0 0% 7%))",
        primary: {
          DEFAULT: "hsl(var(--primary, 0 0% 7%))",
          foreground: "hsl(var(--primary-foreground, 0 0% 98%))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary, 0 0% 96%))",
          foreground: "hsl(var(--secondary-foreground, 0 0% 10%))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted, 0 0% 96%))",
          foreground: "hsl(var(--muted-foreground, 0 0% 45%))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent, 0 0% 96%))",
          foreground: "hsl(var(--accent-foreground, 0 0% 10%))",
        },
        couture: {
          alabaster: "#FBFBFA",
          bone: "#F4F3EF",
          chalk: "#EAE8E1",
          linen: "#DDD9CE",
          taupe: "#8C857B",
          bronze: "#9A7E5E",
          smoke: "#5C5751",
          charcoal: "#1F1E1D",
          obsidian: "#11100F",
          pitch: "#080808",
        },
        terminal: {
          bg: "#09090B",
          panel: "#121215",
          surface: "#18181C",
          border: "#23232A",
          muted: "#71717A",
          accent: "#D4AF37",
        },
      },
      letterSpacing: {
        'luxury': '0.22em',
        'caps': '0.15em',
        'tight-editorial': '-0.03em',
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["var(--font-serif)", "Playfair Display", "Didot", "Bodoni MT", "Georgia", "serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      transitionTimingFunction: {
        'luxury': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        'editorial': '700ms',
      },
    },
  },
  plugins: [],
};
