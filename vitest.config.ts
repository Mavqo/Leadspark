/**
 * Vitest Configuration for LeadSpark
 * Configurazione test runner
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Abilita globals (describe, it, expect, etc.)
    globals: true,
    
    // Ambiente Node.js (per API routes Astro)
    environment: 'node',
    
    // File di setup
    setupFiles: ['./tests/setup.ts'],
    
    // Pattern test
    include: ['tests/**/*.test.ts'],
    
    // Esclusioni
    exclude: [
      'node_modules',
      'dist',
      '.astro'
    ],
    
    // Timeout per test (10s)
    testTimeout: 10000,
    
    // Hook timeout (5s)
    hookTimeout: 5000,
    
    // Reporter
    reporter: ['verbose', 'dot'],
    
    // Coverage
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },
    
    // Typecheck (opzionale, richiede più tempo)
    typecheck: {
      enabled: false
    }
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  
  // Ottimizzazioni per test
  optimizeDeps: {
    include: ['vitest']
  }
});
