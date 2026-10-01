import { defineConfig } from 'vitest/config';

// Kept apart from vite.config.ts so tests don't load the dev server's API
// routes (and with them the database and Clash API clients).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**'],
    },
  },
});
