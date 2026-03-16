/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0B0E14',
          cyan: '#00D1FF',
          card: 'rgba(22, 27, 34, 0.8)',
          cardBorder: 'rgba(34, 211, 238, 0.15)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}
