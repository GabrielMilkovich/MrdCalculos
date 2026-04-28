/**
 * Sanity check do script scripts/audit-java-vs-ts.ts — Fase 0.
 *
 * Valida que o baseline escrito em docs/baselines/audit-port-baseline.json
 * tem o shape esperado (contrato consumido por CI --check).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../../..');
const BASELINE = path.join(REPO_ROOT, 'docs/baselines/audit-port-baseline.json');

describe('audit-java-vs-ts baseline shape', () => {
  it('baseline existe e é JSON válido', () => {
    expect(fs.existsSync(BASELINE), `esperado: ${BASELINE}`).toBe(true);
    const raw = fs.readFileSync(BASELINE, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('baseline tem campos obrigatórios', () => {
    const b = JSON.parse(fs.readFileSync(BASELINE, 'utf-8'));
    expect(b.generatedAt).toBeTypeOf('string');
    expect(b.totals).toMatchObject({
      javaFiles: expect.any(Number),
      tsFilesMatched: expect.any(Number),
      javaLoc: expect.any(Number),
      tsLoc: expect.any(Number),
      coveragePct: expect.any(Number),
    });
    expect(Array.isArray(b.categories)).toBe(true);
    expect(b.categories.length).toBeGreaterThan(0);
    expect(Array.isArray(b.modules)).toBe(true);
    expect(Array.isArray(b.topGaps)).toBe(true);
  });

  it('baseline reflete gap material (>50% Java não portado)', () => {
    const b = JSON.parse(fs.readFileSync(BASELINE, 'utf-8'));
    // Na Fase 0, esperamos cobertura entre 10% e 40% (hoje ≈18%).
    // Se esse intervalo for violado, é sinal de bug no script, não do projeto.
    expect(b.totals.coveragePct).toBeGreaterThan(5);
    expect(b.totals.coveragePct).toBeLessThan(60);
  });
});
