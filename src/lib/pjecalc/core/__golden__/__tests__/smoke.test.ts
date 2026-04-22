/**
 * Smoke test do harness de golden tests — Port PJe-Calc (Fase 0).
 *
 * Valida apenas que o harness funciona: comparação de escalares, tolerâncias,
 * feature flag, estruturas aninhadas e arrays. NÃO testa paridade do engine
 * (isso é responsabilidade das fases seguintes).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  runGolden,
  formatGoldenResult,
  __setPortedEnabledHook,
  __internal__,
} from '../runner';
import type { GoldenFixture } from '../types';

describe('harness golden — smoke', () => {
  afterEach(() => {
    // Reset hook para o default (sempre retorna true)
    __setPortedEnabledHook(() => true);
  });

  it('fixture trivial com único campo monetário passa', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-001',
      description: 'single monetary field within tolerance',
      origin: { pjecalcVersion: '2.15.1' },
      inputs: { a: '10.00', b: '5.00' },
      expected: {
        soma: { value: '15.00' },
      },
    };
    const result = await runGolden(fixture, async () => ({ soma: '15.00' }));
    expect(result.passed, formatGoldenResult(result)).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('diferença dentro da tolerância (0,01) passa', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-002',
      description: 'diff inside default monetary tolerance',
      origin: {},
      inputs: {},
      expected: { total: { value: '100.00' } },
    };
    const result = await runGolden(fixture, async () => ({ total: '100.005' }));
    expect(result.passed, formatGoldenResult(result)).toBe(true);
  });

  it('diferença fora da tolerância falha', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-003',
      description: 'diff outside default tolerance',
      origin: {},
      inputs: {},
      expected: { total: { value: '100.00' } },
    };
    const result = await runGolden(fixture, async () => ({ total: '101.00' }));
    expect(result.passed).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].path).toBe('total');
    expect(result.failures[0].absoluteDiff).toBeCloseTo(1, 5);
  });

  it('tolerância relativa aceita diferenças proporcionais', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-004',
      description: 'relative tolerance 0.1%',
      origin: {},
      inputs: {},
      expected: {
        total: { value: '10000.00', tolerance: { relative: 0.001 } },
      },
    };
    const result = await runGolden(fixture, async () => ({ total: '10005.00' }));
    expect(result.passed).toBe(true);
    const diff = result.diffs.find((d) => d.path === 'total')!;
    expect(diff.relativeDiff).toBeCloseTo(0.0005, 5);
  });

  it('feature flag off pula a fixture e passa', async () => {
    __setPortedEnabledHook(() => false);
    const fixture: GoldenFixture = {
      id: 'smoke-005',
      description: 'skipped by feature flag',
      origin: {},
      inputs: {},
      expected: { total: { value: '999.00' } },
      module: 'IRPF',
    };
    const result = await runGolden(fixture, async () => {
      throw new Error('engine should not run when flag is off');
    });
    expect(result.passed).toBe(true);
    expect(result.executed).toBe(false);
    expect(result.skipReason).toContain('IRPF');
  });

  it('feature flag on executa normalmente', async () => {
    __setPortedEnabledHook((m) => m === 'FGTS');
    const fixture: GoldenFixture = {
      id: 'smoke-006',
      description: 'runs because FGTS flag is on',
      origin: {},
      inputs: {},
      expected: { total: { value: '50.00' } },
      module: 'FGTS',
    };
    const result = await runGolden(fixture, async () => ({ total: '50.00' }));
    expect(result.passed).toBe(true);
    expect(result.executed).toBe(true);
  });

  it('engine que lança erro produz failure controlada', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-007',
      description: 'engine throws',
      origin: {},
      inputs: {},
      expected: { total: { value: '0.00' } },
    };
    const result = await runGolden(fixture, async () => {
      throw new Error('boom');
    });
    expect(result.passed).toBe(false);
    expect(result.failures[0].path).toBe('<engine-throw>');
    expect(result.failures[0].actual).toBe('boom');
  });

  it('comparação aninhada (objeto dentro de objeto)', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-008',
      description: 'nested comparison',
      origin: {},
      inputs: {},
      expected: {
        verbas: {
          horasExtras: { value: '1234.56' },
          dsr: { value: '205.76' },
        },
        totalBruto: { value: '1440.32' },
      },
    };
    const result = await runGolden(fixture, async () => ({
      verbas: { horasExtras: '1234.56', dsr: '205.76' },
      totalBruto: '1440.32',
    }));
    expect(result.passed, formatGoldenResult(result)).toBe(true);
    expect(result.diffs).toHaveLength(3);
  });

  it('array de itens é percorrido elemento-a-elemento', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-009',
      description: 'array walk',
      origin: {},
      inputs: {},
      expected: {
        parcelas: [
          { valor: { value: '100.00' } },
          { valor: { value: '200.00' } },
          { valor: { value: '300.00' } },
        ],
      },
    };
    const result = await runGolden(fixture, async () => ({
      parcelas: [{ valor: '100.00' }, { valor: '200.00' }, { valor: '300.00' }],
    }));
    expect(result.passed, formatGoldenResult(result)).toBe(true);
  });

  it('formatGoldenResult produz mensagem legível em falha', async () => {
    const fixture: GoldenFixture = {
      id: 'smoke-010',
      description: 'failure message format',
      origin: {},
      inputs: {},
      expected: { total: { value: '100.00' } },
    };
    const result = await runGolden(fixture, async () => ({ total: '500.00' }));
    const msg = formatGoldenResult(result);
    expect(msg).toContain('smoke-010');
    expect(msg).toContain('FAIL');
    expect(msg).toContain('100');
    expect(msg).toContain('500');
  });

  it('tryDecimal converte strings e numbers, rejeita booleans e inválidos', () => {
    expect(__internal__.tryDecimal('12.34')?.toString()).toBe('12.34');
    expect(__internal__.tryDecimal(42)?.toString()).toBe('42');
    expect(__internal__.tryDecimal(null)).toBeNull();
    expect(__internal__.tryDecimal(true)).toBeNull();
    expect(__internal__.tryDecimal('abc')).toBeNull();
    expect(__internal__.tryDecimal('')).toBeNull();
  });
});
