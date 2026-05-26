import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/lib/pjecalc/__tests__/golden-pjc-cases.test.ts',
      'src/lib/pjecalc/__tests__/independent-parity-analysis.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
