import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [
    react(),
    tailwind(),
  ],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    port: process.env.PORT || 3000,
    host: true
  },
  vite: {
    css: {
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer'),
        ],
      },
    },
  },
});
