import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        eoi: {
          pink: "var(--eoi-pink)",
          "pink-dark": "var(--eoi-pink-dark)",
          "pink-light": "var(--eoi-pink-light)",
          blue: "var(--eoi-blue)",
          "blue-dark": "var(--eoi-blue-dark)",
          "blue-light": "var(--eoi-blue-light)",
          amber: "var(--eoi-amber)",
          "amber-dark": "var(--eoi-amber-dark)",
          "amber-light": "var(--eoi-amber-light)",
          ink: "var(--eoi-ink)",
          ink2: "var(--eoi-ink2)",
          surface: "var(--eoi-surface)",
          border: "var(--eoi-border)",
          bg: "var(--eoi-bg)",
          "green-light": "var(--eoi-green-light)",
          "purple-light": "var(--eoi-purple-light)",
        },
      },
      fontFamily: {
        /** Mặc định + alias cũ: cùng Inter */
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        syne: ["var(--font-sans)", "system-ui", "sans-serif"],
        dm: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
