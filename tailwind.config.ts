import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          canvas: "#F5FBFB",
          ice: "#EBF7F7",
          frost: "#D8F1EF",
          mint: "#4FD4C4",
          mintHover: "#39C2B1",
          seafoam: "#9AE6DC",
          forest: "#163F3B",
          forestHover: "#102E2B",
          ink: "#182A2E",
          muted: "#53696E",
          border: "#D4E9E7",
          surface: "#FFFFFF",
        },
        date2: {
          midnight: "#2E305F",
          deepIndigo: "#46489B",
          violet: "#6463D7",
          indigo: "#6366F1",
          softPeriwinkle: "#8D8FF8",
          lightPeriwinkle: "#BDBEFF",
          paleLavender: "#D6D6FF",
          lavenderMist: "#EEEEFF",
          ink: "#040515",
          charcoal: "#2D313E",
          slate: "#545A67",
          muted: "#7C8493",
          white: "#FFFFFF",
          canvas: "#F7F8FC",
          surface: "#EEF0F7",
          border: "#E2E5EF",
          softBorder: "#C9CDDA",
          accentViolet: "#875CE9",
          accentPeriwinkle: "#8D9FF8",
          accentAqua: "#55C9D8",
          accentOrchid: "#DCA4E8",
          limeMark: "#E3FF85",
        },
      },
      fontFamily: {
        sans: [
          "Plus Jakarta Sans",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        helvetica: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      boxShadow: {
        card: "0 18px 48px -18px rgba(22, 63, 59, 0.14), 0 4px 14px -4px rgba(22, 63, 59, 0.06)",
        soft: "0 6px 20px -6px rgba(22, 63, 59, 0.10)",
        indigoCard:
          "0 20px 50px -18px rgba(46, 48, 95, 0.18), 0 6px 16px -6px rgba(4, 5, 21, 0.06)",
        indigoSoft: "0 8px 24px -8px rgba(70, 72, 155, 0.20)",
      },
    },
  },
  plugins: [],
};

export default config;
