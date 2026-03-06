/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', 
  corePlugins: { backdropBlur: true },
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f9fc',
          100: '#d6eef6',
          200: '#a9ddf2',
          300: '#6bc4e4',
          400: '#2fa8d1',
          500: '#0b5566',
          600: '#094857',
          700: '#08323a',
          800: '#062630',
          900: '#041a22',
        },
        cream: {
          50:  '#fefcf3',
          100: '#f7f4d7',
          200: '#f0ebb5',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.35s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
