/**
 * Runner do harness de golden tests — Port PJe-Calc (Fase 0).
 *
 * Uso:
 *   import { runGolden } from '@/lib/pjecalc/core/__golden__/runner';
 *   const result = await runGolden(fixture, myEngineFn);
 *   expect(result.passed).toBe(true);
 *
 * Ver: docs/PORT-PJECALC-PLAN.md §5.
 */

import Decimal from 'decimal.js';
import type {
  GoldenFixture,
  GoldenEngine,
  GoldenResult,
  GoldenFieldDiff,
  GoldenTolerance,
  GoldenValue,
  GoldenScalar,
  GoldenExpectedField,
} from './types';

/**
 * Hook de feature flag. Fase 0 usa stub que sempre retorna `true` (todas as
 * fixtures rodam). Commit 3 da Fase 0 substitui por import de
 * `../base/comum/feature-flags`.
 */
let portedEnabledHook: (module: string) => boolean = () => true;

/**
 * Permite que `feature-flags.ts` (Commit 3) plugue a implementação real.
 * Também usado por tests para overridar o comportamento.
 */
export function __setPortedEnabledHook(fn: (module: string) => boolean): void {
  portedEnabledHook = fn;
}

function isPortedEnabled(module: string): boolean {
  return portedEnabledHook(module);
}

Decimal.set({ precision: 20 });

const DEFAULT_MONETARY: GoldenTolerance = { absolute: 0.01 };
const DEFAULT_INDEX: GoldenTolerance = { absolute: 1e-10 };

/**
 * true se o valor é um `GoldenExpectedField` (tem campo `value`), false se é um valor bruto.
 */
function isExpectedField(v: unknown): v is GoldenExpectedField {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.prototype.hasOwnProperty.call(v, 'value')
  );
}

/**
 * Converte string ou number em Decimal, tratando null/undefined/boolean como não-numérico.
 */
function tryDecimal(v: unknown): Decimal | null {
  if (v == null) return null;
  if (typeof v === 'boolean') return null;
  if (typeof v === 'number' && Number.isFinite(v)) return new Decimal(v);
  if (typeof v === 'string') {
    const trimmed = v.trim();
    if (trimmed === '') return null;
    try {
      return new Decimal(trimmed);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Decide a tolerância efetiva para um campo:
 *  1) se a fixture declarou `tolerance` no campo, usa essa
 *  2) senão, usa o `defaultMonetaryTolerance` da fixture (ou DEFAULT_MONETARY)
 */
function resolveTolerance(
  expectedField: GoldenExpectedField | null,
  fixtureDefault: GoldenTolerance | undefined,
): GoldenTolerance {
  if (expectedField?.tolerance) return expectedField.tolerance;
  if (fixtureDefault) return fixtureDefault;
  return DEFAULT_MONETARY;
}

/**
 * Compara dois valores escalares aplicando tolerância quando ambos são numéricos.
 */
function compareScalar(
  path: string,
  expected: GoldenScalar,
  actual: GoldenScalar,
  tolerance: GoldenTolerance,
): GoldenFieldDiff {
  const diff: GoldenFieldDiff = {
    path,
    expected,
    actual,
    withinTolerance: false,
    toleranceApplied: tolerance,
  };

  const expDec = tryDecimal(expected);
  const actDec = tryDecimal(actual);

  if (expDec !== null && actDec !== null) {
    const absDiff = expDec.minus(actDec).abs();
    diff.absoluteDiff = absDiff.toNumber();
    if (!expDec.isZero()) {
      diff.relativeDiff = absDiff.div(expDec.abs()).toNumber();
    }
    const absOk =
      tolerance.absolute !== undefined && absDiff.lte(new Decimal(tolerance.absolute));
    const relOk =
      tolerance.relative !== undefined &&
      !expDec.isZero() &&
      absDiff.div(expDec.abs()).lte(new Decimal(tolerance.relative));
    diff.withinTolerance = absOk || relOk || absDiff.isZero();
    return diff;
  }

  diff.withinTolerance = expected === actual;
  return diff;
}

/**
 * Percorre a estrutura `expected` da fixture em paralelo com `actual` do engine,
 * produzindo diffs por campo.
 */
function walk(
  pathPrefix: string,
  expected: unknown,
  actual: unknown,
  fixtureMonetaryDefault: GoldenTolerance | undefined,
  fixtureIndexDefault: GoldenTolerance | undefined,
  out: GoldenFieldDiff[],
): void {
  // Campo com valor + tolerância explícita
  if (isExpectedField(expected)) {
    const tol = resolveTolerance(expected, fixtureMonetaryDefault);
    const actualScalar =
      typeof actual === 'string' ||
      typeof actual === 'number' ||
      typeof actual === 'boolean' ||
      actual === null
        ? (actual as GoldenScalar)
        : JSON.stringify(actual);
    out.push(compareScalar(pathPrefix || '<root>', expected.value, actualScalar, tol));
    return;
  }

  // Arrays
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      out.push({
        path: pathPrefix || '<root>',
        expected: `<array len=${expected.length}>`,
        actual: actual === undefined ? null : JSON.stringify(actual),
        withinTolerance: false,
      });
      return;
    }
    const maxLen = Math.max(expected.length, actual.length);
    for (let i = 0; i < maxLen; i++) {
      walk(
        `${pathPrefix}[${i}]`,
        expected[i] as unknown,
        actual[i],
        fixtureMonetaryDefault,
        fixtureIndexDefault,
        out,
      );
    }
    return;
  }

  // Objetos (não-expected-field)
  if (typeof expected === 'object' && expected !== null) {
    if (typeof actual !== 'object' || actual === null || Array.isArray(actual)) {
      out.push({
        path: pathPrefix || '<root>',
        expected: JSON.stringify(expected),
        actual: actual === undefined ? null : JSON.stringify(actual),
        withinTolerance: false,
      });
      return;
    }
    const expObj = expected as Record<string, unknown>;
    const actObj = actual as Record<string, unknown>;
    const keys = new Set<string>([...Object.keys(expObj), ...Object.keys(actObj)]);
    for (const k of keys) {
      walk(
        pathPrefix ? `${pathPrefix}.${k}` : k,
        expObj[k],
        actObj[k],
        fixtureMonetaryDefault,
        fixtureIndexDefault,
        out,
      );
    }
    return;
  }

  // Escalares sem tolerância declarada — usa default monetário
  const tol = fixtureMonetaryDefault ?? DEFAULT_MONETARY;
  const expScalar = (expected ?? null) as GoldenScalar;
  const actScalar =
    typeof actual === 'string' ||
    typeof actual === 'number' ||
    typeof actual === 'boolean' ||
    actual === null ||
    actual === undefined
      ? ((actual ?? null) as GoldenScalar)
      : JSON.stringify(actual);
  out.push(compareScalar(pathPrefix || '<root>', expScalar, actScalar, tol));
}

/**
 * Executa uma fixture contra um engine dado e retorna o diff completo.
 * Respeita feature flags: se `fixture.module` for setado e a flag correspondente estiver
 * off, a fixture é marcada como `executed=false` e passa (skip, não falha).
 */
export async function runGolden<TInputs = GoldenValue, TOutputs = GoldenValue>(
  fixture: GoldenFixture,
  engine: GoldenEngine<TInputs, TOutputs>,
): Promise<GoldenResult> {
  const start = Date.now();

  // Respeita feature flag do módulo
  if (fixture.module && !isPortedEnabled(fixture.module)) {
    return {
      fixtureId: fixture.id,
      passed: true,
      executed: false,
      skipReason: `feature flag USE_PORTED_${fixture.module.toUpperCase()} is off`,
      diffs: [],
      failures: [],
      durationMs: Date.now() - start,
    };
  }

  let actual: TOutputs;
  try {
    actual = await engine(fixture.inputs as TInputs);
  } catch (err) {
    return {
      fixtureId: fixture.id,
      passed: false,
      executed: true,
      diffs: [],
      failures: [
        {
          path: '<engine-throw>',
          expected: 'successful execution',
          actual: err instanceof Error ? err.message : String(err),
          withinTolerance: false,
        },
      ],
      durationMs: Date.now() - start,
    };
  }

  const diffs: GoldenFieldDiff[] = [];
  walk(
    '',
    fixture.expected,
    actual,
    fixture.defaultMonetaryTolerance,
    fixture.defaultIndexTolerance,
    diffs,
  );
  const failures = diffs.filter((d) => !d.withinTolerance);

  return {
    fixtureId: fixture.id,
    passed: failures.length === 0,
    executed: true,
    diffs,
    failures,
    durationMs: Date.now() - start,
  };
}

/**
 * Formata um GoldenResult para mensagem de erro em expect().
 * Útil em `expect(result.passed, formatGoldenResult(result)).toBe(true)`.
 */
export function formatGoldenResult(r: GoldenResult): string {
  if (r.passed && r.executed) return `[${r.fixtureId}] OK (${r.diffs.length} campos)`;
  if (r.passed && !r.executed) return `[${r.fixtureId}] SKIP (${r.skipReason})`;
  const lines = [`[${r.fixtureId}] FAIL — ${r.failures.length} campo(s) fora de tolerância:`];
  for (const f of r.failures.slice(0, 20)) {
    const parts = [
      `  ${f.path}`,
      `    esperado: ${JSON.stringify(f.expected)}`,
      `    obtido:   ${JSON.stringify(f.actual)}`,
    ];
    if (f.absoluteDiff !== undefined) {
      parts.push(`    diff_abs: ${f.absoluteDiff}${f.relativeDiff !== undefined ? `  diff_rel: ${f.relativeDiff}` : ''}`);
    }
    if (f.toleranceApplied) {
      parts.push(`    tolerancia: ${JSON.stringify(f.toleranceApplied)}`);
    }
    lines.push(parts.join('\n'));
  }
  if (r.failures.length > 20) {
    lines.push(`  ... e mais ${r.failures.length - 20} falhas.`);
  }
  return lines.join('\n');
}

/**
 * Helpers internos reexportados para uso em suites que queiram comparações ad-hoc.
 */
export const __internal__ = {
  tryDecimal,
  compareScalar,
  walk,
  isExpectedField,
  DEFAULT_MONETARY,
  DEFAULT_INDEX,
};
