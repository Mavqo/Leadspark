import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [
    react(),
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
      postcss: './postcss.config.js',
    },
  },
});
