import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: [
      // These tests require .pjc corpus files that are not committed to the repo
      'src/lib/pjecalc/__tests__/blind-audit.test.ts',
      'src/lib/pjecalc/__tests__/independent-parity-analysis.test.ts',
      'src/lib/pjecalc/__tests__/memoria-calculo.test.ts',
      'src/lib/pjecalc/__tests__/diagnostic-verba-delta.test.ts',
      'src/lib/pjecalc/__tests__/diagnostic-delta.test.ts',
      'src/lib/pjecalc/__tests__/trace-surgical.test.ts',
      'src/lib/pjecalc/__tests__/parity-gate.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
