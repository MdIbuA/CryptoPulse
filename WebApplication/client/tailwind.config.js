/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        "card-dark": "#0f1729",
        "card-darker": "#0b1020",
        "accent": "#00e7a7",
        "accent-strong": "#14f195",
        "muted": "#9ca3af"
      },
      boxShadow: {
        glass: "0 10px 60px rgba(0, 0, 0, 0.35)"
      }
    }
  },
  plugins: []
};

