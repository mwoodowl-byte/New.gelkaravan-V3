/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#EA580C',
          50: '#FEF3E7',
          100: '#FDE8CF',
          200: '#FBD1A0',
          300: '#F9BA70',
          400: '#F7A341',
          500: '#EA580C',
          600: '#BB4609',
          700: '#8C3407',
          800: '#5D2305',
          900: '#2E1102',
        },
      },
    },
  },
  plugins: [],
}
