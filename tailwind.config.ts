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
      },
      boxShadow: {
        card: "0 18px 48px -18px rgba(22, 63, 59, 0.14), 0 4px 14px -4px rgba(22, 63, 59, 0.06)",
        soft: "0 6px 20px -6px rgba(22, 63, 59, 0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
