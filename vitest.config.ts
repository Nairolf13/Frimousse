import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use a browser-like DOM environment for tests
    environment: 'happy-dom',
    globals: true,
    include: ['components/__tests__/**/*.test.*'],
  },
});
