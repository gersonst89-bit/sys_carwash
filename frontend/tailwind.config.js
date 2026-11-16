/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: '#0ea5e9',
        'primary-dark': '#0284c7',
        teal: '#14b8a6',
      },
    },
  },
  plugins: [],
};
