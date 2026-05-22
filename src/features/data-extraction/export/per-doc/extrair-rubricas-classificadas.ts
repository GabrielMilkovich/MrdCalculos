/**
 * Sprint 3c — Narrowing seguro de `documents.parsed` JSONB pra extrair
 * `rubricas_classificadas` (Sprint 2).
 *
 * `v6Parsed` chega como `unknown` pra não acoplar o callsite ao schema
 * completo do JSONB; aqui validamos apenas o necessário pra Sprint 3c.
 * Quando o array vier ausente ou malformado (mapper antigo, JSONB
 * corrompido, doc legado pré-Sprint 2), retorna `undefined` —
 * `classifyHolerite` trata graceful e mantém comportamento legado
 * (só hints + fallback).
 *
 * Arquivo separado do `per-doc/index.ts` pra não puxar a chain inteira
 * de imports (Supabase client → localStorage) ao testar isoladamente
 * em ambiente Node (Fase 4.1 — round-trip JSONB).
 */

import type { RubricaClassificada } from '../../parsers/holerite/types';

export function extrairRubricasClassificadasDoV6(
  v6Parsed: unknown,
): readonly RubricaClassificada[] | undefined {
  if (!v6Parsed || typeof v6Parsed !== 'object') return undefined;
  const candidato = (v6Parsed as { rubricas_classificadas?: unknown })
    .rubricas_classificadas;
  if (!Array.isArray(candidato) || candidato.length === 0) return undefined;
  const todasValidas = candidato.every(
    (rc: unknown): rc is RubricaClassificada =>
      !!rc &&
      typeof rc === 'object' &&
      'rubrica' in rc &&
      'categoria' in rc &&
      typeof (rc as { categoria: unknown }).categoria === 'string',
  );
  if (!todasValidas) return undefined;
  return candidato as readonly RubricaClassificada[];
}
