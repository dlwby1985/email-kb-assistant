/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'asu-maroon': '#8C1D40',
        'asu-gold': '#FFC627',
        'asu-black': '#000000',
        'asu-white': '#FFFFFF',
        'asu-blue': '#00A3E0',
        'asu-green': '#78BE20',
        'asu-orange': '#FF7F32',
        'asu-gray': '#747474',
        'asu-copper': '#AF674B',
        'asu-turquoise': '#4AB7C4',
        'asu-pink': '#E74973',
        'gray-50': '#FAFAFA',
        'gray-100': '#F5F5F5',
        'gray-200': '#E5E5E5',
        'gray-300': '#D4D4D4',
        'gray-400': '#A3A3A3',
        'gray-500': '#747474',
        'gray-600': '#525252',
        'gray-700': '#404040',
      },
    },
  },
  plugins: [],
}
