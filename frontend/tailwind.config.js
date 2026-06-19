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
          50: '#f0f5f4',
          100: '#d7e6e3',
          500: '#276152',
          600: '#1c483d',
          700: '#0D3A35',
        },
        secondary: {
          500: '#276152',
          600: '#1c483d',
        },
        sage: {
          200: '#d5dad1',
          300: '#B1B7AB',
          400: '#9ba195',
        },
        cream: {
          50: '#fdfdfd',
          100: '#fcfaf7',
          500: '#FBF6F0',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
