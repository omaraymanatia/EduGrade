/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: "#332D56",
          50: "#EEEDFC",
          100: "#DDDCF9",
          200: "#BCBAE5",
          300: "#9A98D1",
          400: "#7976BE",
          500: "#575499",
          600: "#443D75",
          700: "#332D56", // Base
          800: "#221F3A",
          900: "#11101D",
        },
        secondary: {
          DEFAULT: "#4E6688",
          50: "#EDF0F5",
          100: "#D9E0EB",
          200: "#B4C1D7",
          300: "#8FA2C3",
          400: "#6A83AF",
          500: "#4E6688", // Base
          600: "#3E516D",
          700: "#2F3D52",
          800: "#1F2836",
          900: "#10141B",
        },
        accent: {
          DEFAULT: "#71C0BB",
          50: "#F0F7F7",
          100: "#E1F0EF",
          200: "#C3E2DF",
          300: "#A6D3CF",
          400: "#88C5C0",
          500: "#71C0BB", // Base
          600: "#549A97",
          700: "#3F7471",
          800: "#2A4D4B",
          900: "#152726",
        },
        light: {
          DEFAULT: "#E3EEB2",
          50: "#FCFEF7",
          100: "#F9FEEF",
          200: "#F2FCD9",
          300: "#EBF9C3",
          400: "#E3EEB2", // Base
          500: "#D5DE92",
          600: "#C7CE71",
          700: "#B9BE51",
          800: "#96991D",
          900: "#79790C",
        },
        // Keep shadcn-ui's destructive and muted colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
