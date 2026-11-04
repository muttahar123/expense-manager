/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#0b0f17',
          800: '#121826',
          700: '#1b2334',
          600: '#273146',
        },
        brand: {
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
        },
        accent: {
          expense: '#f87171',
          income: '#34d399',
          invest: '#60a5fa',
        },
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      boxShadow: {
        glow: '0 10px 40px -12px rgba(34,197,94,0.35)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
