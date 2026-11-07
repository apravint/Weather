import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Tests never hit the network: the Gemini SDK is mocked, and a dummy key
// keeps the service modules (which read process.env.API_KEY) importable.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    env: { API_KEY: 'test-key' },
    restoreMocks: true,
  },
});
