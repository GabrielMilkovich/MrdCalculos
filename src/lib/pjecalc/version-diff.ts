/**
 * Comparação de versões de um cálculo (`PjeLiquidacaoResult`).
 *
 * Percorre os campos `resumo` e `verbas[]` de duas versões e retorna
 * apenas os caminhos que mudaram. Para campos numéricos, inclui o
 * delta absoluto (`depois - antes`).
 */

import Decimal from 'decimal.js';
import type { CalculoVersao } from './versioning';

export interface DiffField {
  path: string;
  antes: unknown;
  depois: unknown;
  delta?: number | string;
}

const EPS = 1e-9;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function numericEquals(a: number, b: number): boolean {
  if (Number.isNaN(a) && Number.isNaN(b)) return true;
  return Math.abs(a - b) < EPS;
}

function pushDelta(out: DiffField[], path: string, antes: unknown, depois: unknown): void {
  if (typeof antes === 'number' && typeof depois === 'number') {
    if (numericEquals(antes, depois)) return;
    const delta = new Decimal(depois).minus(antes).toNumber();
    out.push({ path, antes, depois, delta });
    return;
  }
  out.push({ path, antes, depois });
}

function diffArrays(path: string, a: unknown[], b: unknown[], out: DiffField[]): void {
  if (a.length !== b.length) {
    out.push({
      path: `${path}.length`,
      antes: a.length,
      depois: b.length,
      delta: b.length - a.length,
    });
  }
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const sub = `${path}[${i}]`;
    if (i >= a.length) {
      out.push({ path: sub, antes: undefined, depois: b[i] });
      continue;
    }
    if (i >= b.length) {
      out.push({ path: sub, antes: a[i], depois: undefined });
      continue;
    }
    diffValue(sub, a[i], b[i], out);
  }
}

function diffObjects(
  path: string,
  a: Record<string, unknown>,
  b: Record<string, unknown>,
  out: DiffField[],
): void {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  // Ordem estável para testes determinísticos
  const sorted = Array.from(keys).sort();
  for (const k of sorted) {
    const sub = path ? `${path}.${k}` : k;
    diffValue(sub, a[k], b[k], out);
  }
}

function diffValue(path: string, a: unknown, b: unknown, out: DiffField[]): void {
  if (a === b) return;
  if (Array.isArray(a) && Array.isArray(b)) {
    diffArrays(path, a, b, out);
    return;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    diffObjects(path, a, b, out);
    return;
  }
  pushDelta(out, path, a, b);
}

/**
 * Compara duas versões e retorna os campos que mudaram em
 * `resumo` e `verbas[]` (recursivamente).
 */
export function compararVersoes(v1: CalculoVersao, v2: CalculoVersao): DiffField[] {
  const out: DiffField[] = [];
  const r1 = v1.resultado_json ?? ({} as Record<string, unknown>);
  const r2 = v2.resultado_json ?? ({} as Record<string, unknown>);

  const r1o = r1 as unknown as Record<string, unknown>;
  const r2o = r2 as unknown as Record<string, unknown>;

  const resumo1 = isPlainObject(r1o.resumo) ? r1o.resumo : {};
  const resumo2 = isPlainObject(r2o.resumo) ? r2o.resumo : {};
  diffObjects('resumo', resumo1, resumo2, out);

  const verbas1 = Array.isArray(r1o.verbas) ? r1o.verbas : [];
  const verbas2 = Array.isArray(r2o.verbas) ? r2o.verbas : [];
  diffArrays('verbas', verbas1, verbas2, out);

  return out;
}
