/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        medical: {
          blue: '#2563EB',
          green: '#10B981',
          sage: '#84CC16'
        }
      }
    },
  },
  plugins: [],
}
