import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      // FASE 2 — edge functions com lógica puramente TS (sem APIs Deno-only)
      // podem ter testes em __tests__ co-localizados. Vitest no Node consegue
      // executar contanto que o módulo testado não importe `Deno.*` direto.
      'supabase/functions/**/__tests__/**/*.test.ts',
    ],
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
      // Thresholds INFORMACIONAIS — não falham CI hoje. Servem como meta
      // visível ao rodar `npm run test:coverage`. Subir esses pisos
      // gradualmente conforme a paridade golden cresce (ver
      // docs/KNOWN-LIMITATIONS.md).
      thresholds: {
        // Core portado 1:1 do Java — alvo alto
        'src/lib/pjecalc/core/**': {
          lines: 60,
          branches: 50,
          functions: 60,
          statements: 60,
        },
        // Engine V3 + módulos — alvo médio (fluxos de UI dependem disso)
        'src/lib/pjecalc/engine-v3.ts': {
          lines: 50,
          branches: 40,
          functions: 50,
        },
        'src/lib/pjecalc/modulos/**': {
          lines: 60,
          branches: 50,
          functions: 60,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
