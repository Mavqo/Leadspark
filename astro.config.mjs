import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  integrations: [react()],
  output: 'hybrid',
  adapter: undefined, // Static per demo
  server: {
    port: 3000,
    headers: {
      'Access-Control-Allow-Origin': '*'
    }
  }
});
