import type { Config } from "tailwindcss"
import animate from "tailwindcss-animate"

const hsl = (v: string) => `hsl(var(--${v}) / <alpha-value>)`

export const preset = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: hsl("background"),
        foreground: hsl("foreground"),
        card: { DEFAULT: hsl("card"), foreground: hsl("card-foreground") },
        popover: { DEFAULT: hsl("popover"), foreground: hsl("popover-foreground") },
        primary: { DEFAULT: hsl("primary"), foreground: hsl("primary-foreground") },
        secondary: { DEFAULT: hsl("secondary"), foreground: hsl("secondary-foreground") },
        muted: { DEFAULT: hsl("muted"), foreground: hsl("muted-foreground") },
        accent: { DEFAULT: hsl("accent"), foreground: hsl("accent-foreground") },
        border: hsl("border-solid"),
        input: hsl("input"),
        ring: hsl("ring"),
        foil: hsl("foil"),
        success: hsl("success"),
        danger: hsl("danger"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        mono: ["var(--font-mono)"],
        body: ["var(--font-body)"],
      },
      keyframes: {
        "stamp-in": {
          "0%": { transform: "rotate(-10deg) scale(1.6)", opacity: "0" },
          "60%": { transform: "rotate(-10deg) scale(0.92)", opacity: "1" },
          "100%": { transform: "rotate(-10deg) scale(1)", opacity: "1" },
        },
      },
      animation: { "stamp-in": "stamp-in 0.3s ease-out both" },
    },
  },
  plugins: [animate],
} satisfies Partial<Config>

export default preset
