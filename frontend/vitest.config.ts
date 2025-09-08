/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
        'src/mocks/**',
        'src/**/*.test.*',
        'scripts/**',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    // Configuration pour les tests de performance
    timeout: 10000,
    // Parallélisation des tests
    pool: 'threads',
    maxConcurrency: 5,
    // Mock des modules externes
    deps: {
      inline: ['@testing-library/user-event'],
    },
    // Environnement sécurisé pour les tests
    env: {
      NODE_ENV: 'test',
      VITE_API_BASE_URL: 'http://localhost:3000',
    },
  },
});