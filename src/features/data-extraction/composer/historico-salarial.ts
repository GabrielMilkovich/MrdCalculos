import type {
  ComposicaoHistorico,
  ConflitoHistoricoSalarial,
  DocumentoOrigem,
  LinhaHistoricoSalarial,
  ResolucaoConflito,
  RubricaExtraida,
} from '../types';

const TOLERANCIA_REAIS = 0.01;

/**
 * Compõe linhas de Histórico Salarial para uma categoria, agregando rubricas
 * por (competencia, document_id) e detectando conflitos quando o mesmo mês
 * tem somas divergentes em documentos diferentes.
 *
 * Regras:
 *   - Filtra por categoria_id === categoriaId.
 *   - Rubricas com categoria_id null OU outra categoria não entram (silencioso).
 *   - 1 doc por competência → 1 linha sem conflito.
 *   - N docs com soma idêntica (≤ R$ 0,01 de diferença) → dedup, 1 linha.
 *   - N docs com soma divergente → conflito; só vira linha se houver
 *     ResolucaoConflito apontando o document_id_escolhido.
 */
export function composeHistoricoSalarial(
  rubricas: RubricaExtraida[],
  categoriaId: string,
  documentosMap: Map<string, string>, // document_id -> document_name
  resolucoes: ResolucaoConflito[] = [],
): ComposicaoHistorico {
  const filtered = rubricas.filter((r) => r.categoria_id === categoriaId);

  // Agrupa por competencia → document_id → rubricas
  const byComp = new Map<string, Map<string, RubricaExtraida[]>>();
  for (const r of filtered) {
    if (!byComp.has(r.competencia)) byComp.set(r.competencia, new Map());
    const docs = byComp.get(r.competencia)!;
    if (!docs.has(r.document_id)) docs.set(r.document_id, []);
    docs.get(r.document_id)!.push(r);
  }

  const linhas: LinhaHistoricoSalarial[] = [];
  const conflitos: ConflitoHistoricoSalarial[] = [];

  // Index resoluções por competência
  const resPorComp = new Map<string, string>();
  for (const r of resolucoes) resPorComp.set(r.competencia, r.document_id_escolhido);

  for (const [competencia, byDoc] of byComp) {
    const candidatos = Array.from(byDoc.entries()).map(([document_id, rubs]) => ({
      document_id,
      document_name: documentosMap.get(document_id) ?? document_id,
      valor_total: round2(rubs.reduce((s, r) => s + Number(r.valor || 0), 0)),
      rubricas: rubs,
    }));

    if (candidatos.length === 1) {
      const c = candidatos[0];
      linhas.push({
        competencia,
        valor: c.valor_total,
        documentos_origem: [docOrigem(c)],
      });
      continue;
    }

    // Múltiplos docs: verifica equivalência por valor (dentro da tolerância)
    const valoresUnicos = uniqueByTolerance(
      candidatos.map((c) => c.valor_total),
      TOLERANCIA_REAIS,
    );

    if (valoresUnicos.length === 1) {
      // Dedup silencioso: 1 linha agregando origens
      linhas.push({
        competencia,
        valor: valoresUnicos[0],
        documentos_origem: candidatos.map(docOrigem),
      });
      continue;
    }

    // Conflito real
    const escolhido = resPorComp.get(competencia);
    if (escolhido) {
      const c = candidatos.find((x) => x.document_id === escolhido);
      if (c) {
        linhas.push({
          competencia,
          valor: c.valor_total,
          documentos_origem: [docOrigem(c)],
        });
        continue;
      }
      // Resolução aponta doc inexistente — cai em conflito mesmo
    }
    conflitos.push({ competencia, candidatos });
  }

  // Ordena por competência (MM/yyyy → yyyyMM ASC)
  linhas.sort((a, b) => compKey(a.competencia).localeCompare(compKey(b.competencia)));
  conflitos.sort((a, b) => compKey(a.competencia).localeCompare(compKey(b.competencia)));

  return { linhas, conflitos };
}

function docOrigem(c: {
  document_id: string;
  document_name: string;
  rubricas: RubricaExtraida[];
}): DocumentoOrigem {
  return {
    document_id: c.document_id,
    document_name: c.document_name,
    rubricas: c.rubricas,
  };
}

function uniqueByTolerance(arr: number[], tol: number): number[] {
  // Epsilon de 1e-9 cobre artefatos de FP que fazem diferenças "exatas"
  // virarem 0.01000000000005...
  const tolEps = tol + 1e-9;
  const sorted = [...arr].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of sorted) {
    if (out.length === 0 || Math.abs(out[out.length - 1] - v) > tolEps) {
      out.push(v);
    }
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function compKey(comp: string): string {
  // "08/2016" -> "201608"
  const m = comp.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return '999999';
  return `${m[2]}${m[1]}`;
}
