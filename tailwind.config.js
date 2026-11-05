/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Vert du logo de la Clinique Neematoullah (couleur principale)
        brand: {
          50: '#f3f9ec',
          100: '#e4f1d3',
          200: '#c9e3a8',
          300: '#a6cf74',
          400: '#84b947',
          500: '#65a02c',
          600: '#4f8221',
          700: '#3e661c',
          800: '#33521b',
          900: '#2b451a',
          950: '#15260a',
        },
        // Or du croissant (accent)
        or: {
          50: '#fdf7ec',
          100: '#faebcf',
          200: '#f4d49b',
          300: '#edb860',
          400: '#e69f38',
          500: '#d9821f',
          600: '#bf6418',
          700: '#9e4a18',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
