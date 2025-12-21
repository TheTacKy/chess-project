/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'chess-white': '#f0d9b5',
        'chess-black': '#b58863',
      },
    },
  },
  plugins: [],
}

