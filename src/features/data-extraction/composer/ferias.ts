import type {
  ComposicaoFerias,
  ConflitoFerias,
  FeriasExtraida,
  ResolucaoFerias,
} from '../types';

/**
 * Compõe linhas de Férias agregando registros por `relativa` (período
 * aquisitivo). Filtra os marcados como `incluir=false`. Detecta conflito
 * quando 2+ registros da mesma `relativa` divergem em qualquer campo
 * relevante (prazo/situacao/abono/gozos).
 */
export function composeFerias(
  registros: FeriasExtraida[],
  resolucoes: ResolucaoFerias[] = [],
): ComposicaoFerias {
  const incluidos = registros.filter((r) => r.incluir);

  const byRel = new Map<string, FeriasExtraida[]>();
  for (const r of incluidos) {
    if (!byRel.has(r.relativa)) byRel.set(r.relativa, []);
    byRel.get(r.relativa)!.push(r);
  }

  const resMap = new Map<string, string>();
  for (const r of resolucoes) resMap.set(r.relativa, r.registro_id);

  const linhas: FeriasExtraida[] = [];
  const conflitos: ConflitoFerias[] = [];

  for (const [relativa, lista] of byRel) {
    if (lista.length === 1) {
      linhas.push(lista[0]);
      continue;
    }
    const allEqual = lista.every((x) => isEqualFerias(x, lista[0]));
    if (allEqual) {
      linhas.push(lista[0]); // dedup
      continue;
    }
    const escolhido = resMap.get(relativa);
    if (escolhido) {
      const r = lista.find((x) => x.id === escolhido);
      if (r) {
        linhas.push(r);
        continue;
      }
    }
    conflitos.push({ relativa, candidatos: lista });
  }

  linhas.sort((a, b) => a.relativa.localeCompare(b.relativa));
  conflitos.sort((a, b) => a.relativa.localeCompare(b.relativa));

  return { linhas, conflitos };
}

function isEqualFerias(a: FeriasExtraida, b: FeriasExtraida): boolean {
  return (
    a.prazo === b.prazo &&
    a.situacao === b.situacao &&
    a.dobra_geral === b.dobra_geral &&
    a.abono === b.abono &&
    a.dias_abono === b.dias_abono &&
    eqGozo(a.gozo1, b.gozo1) &&
    eqGozo(a.gozo2, b.gozo2) &&
    eqGozo(a.gozo3, b.gozo3)
  );
}

function eqGozo(
  a: FeriasExtraida['gozo1'],
  b: FeriasExtraida['gozo1'],
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.inicio === b.inicio && a.fim === b.fim && a.dobra === b.dobra;
}
