/**
 * Merge de linhas extraídas de múltiplos documentos do mesmo caso.
 *
 * Regra geral:
 *  - 2 docs com mesma chave (ex: competência) e dados IDÊNTICOS → dedup silencioso
 *  - 2 docs com mesma chave e dados DIFERENTES → conflito (UI resolve)
 *  - Linhas únicas → entram no merged direto
 *
 * `_source` é IGNORADO em equalsFn (mesmo dado vindo de docs diferentes
 * deduplica). Só é preservado para mostrar origem na UI de conflito.
 */

import type {
  Conflict,
  ConflictResolution,
  FaltasRow,
  FeriasRow,
  HistoricoSalarialRow,
  MergeResult,
} from './types';

// =====================================================
// Genérico
// =====================================================

/**
 * Mescla linhas por chave. Linhas com mesma chave + dados idênticos
 * são deduplicadas. Linhas com mesma chave + dados divergentes viram
 * conflitos.
 */
export function mergeRows<T>(
  rows: T[],
  keyFn: (r: T) => string,
  equalsFn: (a: T, b: T) => boolean,
): MergeResult<T> {
  const groups = new Map<string, T[]>();
  for (const r of rows) {
    const k = keyFn(r);
    const list = groups.get(k);
    if (list) list.push(r);
    else groups.set(k, [r]);
  }

  const merged: T[] = [];
  const conflicts: Conflict<T>[] = [];

  for (const [key, group] of groups) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }
    // Reduz o grupo para candidatos distintos pela equalsFn.
    const distinct: T[] = [];
    for (const item of group) {
      if (!distinct.some(d => equalsFn(d, item))) distinct.push(item);
    }
    if (distinct.length === 1) {
      // Todos iguais → dedup
      merged.push(distinct[0]);
    } else {
      // Conflito real
      conflicts.push({ key, candidates: distinct });
    }
  }

  return { merged, conflicts };
}

/**
 * Aplica resoluções (do usuário) sobre o resultado bruto. Para cada
 * conflito, escolhe o candidato indicado por `resolution`. Conflitos
 * sem resolução continuam pendentes (caller bloqueia download).
 */
export function applyResolutions<T>(
  raw: MergeResult<T>,
  resolution: ConflictResolution,
): { merged: T[]; pending: Conflict<T>[] } {
  const merged = [...raw.merged];
  const pending: Conflict<T>[] = [];
  for (const c of raw.conflicts) {
    const idx = resolution.get(c.key);
    if (idx !== undefined && idx >= 0 && idx < c.candidates.length) {
      merged.push(c.candidates[idx]);
    } else {
      pending.push(c);
    }
  }
  return { merged, pending };
}

// =====================================================
// Funções específicas por categoria
// =====================================================

/** Histórico Salarial — chave = competência. */
export function mergeHistoricoSalarial(rows: HistoricoSalarialRow[]): MergeResult<HistoricoSalarialRow> {
  return mergeRows(
    rows,
    r => r.competencia,
    (a, b) =>
      a.competencia === b.competencia &&
      a.valor === b.valor &&
      a.incideFgts === b.incideFgts &&
      a.fgtsRecolhido === b.fgtsRecolhido &&
      a.incideInss === b.incideInss &&
      a.inssRecolhido === b.inssRecolhido,
  );
}

/** Férias — chave = relativa. */
export function mergeFerias(rows: FeriasRow[]): MergeResult<FeriasRow> {
  return mergeRows(
    rows,
    r => r.relativa,
    (a, b) =>
      a.relativa === b.relativa &&
      a.prazo === b.prazo &&
      a.situacao === b.situacao &&
      a.dobraGeral === b.dobraGeral &&
      a.abono === b.abono &&
      a.diasAbono === b.diasAbono &&
      gozoEquals(a.gozo1, b.gozo1) &&
      gozoEquals(a.gozo2, b.gozo2) &&
      gozoEquals(a.gozo3, b.gozo3),
  );
}

function gozoEquals(a: FeriasRow['gozo1'], b: FeriasRow['gozo1']): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.inicio === b.inicio && a.fim === b.fim && a.dobra === b.dobra;
}

/** Faltas — chave = `dataInicio__dataFim` (mesmo intervalo = mesma falta). */
export function mergeFaltas(rows: FaltasRow[]): MergeResult<FaltasRow> {
  return mergeRows(
    rows,
    r => `${r.dataInicio}__${r.dataFim}`,
    (a, b) =>
      a.dataInicio === b.dataInicio &&
      a.dataFim === b.dataFim &&
      a.justificada === b.justificada &&
      a.reiniciarPeriodoAquisitivo === b.reiniciarPeriodoAquisitivo &&
      // Justificativa não decide igualdade — duas fontes podem
      // descrever a mesma falta com texto distinto. Caso queira
      // tratar texto divergente como conflito, troque para `===`.
      true,
  );
}

/**
 * Conta total de conflitos pendentes em uma resolução parcial.
 * UI usa para habilitar/desabilitar botão de download.
 */
export function countPendingConflicts<T>(
  raw: MergeResult<T>,
  resolution: ConflictResolution,
): number {
  let pending = 0;
  for (const c of raw.conflicts) {
    if (resolution.get(c.key) === undefined) pending += 1;
  }
  return pending;
}
