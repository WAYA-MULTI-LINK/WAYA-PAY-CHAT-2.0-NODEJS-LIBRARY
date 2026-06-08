import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Live tests opt in via WAYA_LIVE=1; excluded from the default run.
    exclude: process.env.WAYA_LIVE ? [] : ['tests/live.test.ts', 'node_modules/**'],
  },
});
