/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#030712",
        surface: "#0b1120",
        neon: {
          cyan: "#22d3ee",
          magenta: "#e879f9"
        }
      }
    }
  },
  plugins: []
};

