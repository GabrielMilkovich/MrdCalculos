/**
 * Classifica rubricas de holerite em buckets do PJe-Calc.
 *
 * Estratégia em 3 camadas (mais específica → mais genérica):
 *   1. Match enumerado (prioridade 100): nome normalizado bate exatamente
 *      com uma entrada da tabela `rubrica_mapping` (tipo_regra =
 *      'enumerado_explicito').
 *   2. Regra soft (prioridade 50): contains/startswith com lista de exceções
 *      que NÃO devem casar.
 *   3. Fallback: bucket "nao_classificado" — operador classifica manualmente
 *      no Review Dialog.
 *
 * Implementação cliente-side: aceita uma `tabela` carregada do Supabase
 * (`select * from rubrica_mapping`) — desacopla a função de testar.
 */

export type BucketPjeCalc =
  | 'minimo_garantido'
  | 'salario_substituicao'
  | 'comissoes_produtos'
  | 'dsr_comissoes'
  | 'comissoes_servicos'
  | 'premios'
  | 'desconsiderar';

export type RubricaLayout = 'via_varejo' | 'magazine_luiza' | 'generico';

export type RubricaTipoRegra =
  | 'enumerado_explicito'
  | 'regra_soft_contains'
  | 'regra_soft_startswith';

export interface RubricaMappingRow {
  id: string;
  rubrica_normalizada: string;
  rubrica_original: string | null;
  bucket: BucketPjeCalc;
  layout_aplicavel: RubricaLayout;
  tipo_regra: RubricaTipoRegra;
  prioridade: number;
  excecoes: string[];
  observacao: string | null;
}

export interface ClassificacaoRubrica {
  rubrica_original: string;
  rubrica_normalizada: string;
  bucket: BucketPjeCalc | 'nao_classificado';
  origem: 'enumerado' | 'soft_contains' | 'soft_startswith' | 'fallback';
  regra_aplicada_id?: string;
  confianca: 'alta' | 'media' | 'baixa';
}

/**
 * Normaliza nome de rubrica: remove acentos, lowercase, colapsa espaços.
 * Idempotente.
 */
export function normalizarRubrica(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classifica uma rubrica usando uma tabela carregada do Supabase.
 *
 * O caller deve passar APENAS as linhas relevantes (filtrar por layout no
 * lado do banco antes — `where layout_aplicavel = 'via_varejo'`). Função
 * pura — não invoca rede.
 */
export function classificarRubrica(
  rubricaOriginal: string,
  layout: RubricaLayout,
  tabela: RubricaMappingRow[],
): ClassificacaoRubrica {
  const normalizada = normalizarRubrica(rubricaOriginal);
  const filtradas = tabela.filter((r) => r.layout_aplicavel === layout);

  // 1. Match enumerado (prioridade 100, exato)
  const enumeradas = filtradas
    .filter((r) => r.tipo_regra === 'enumerado_explicito')
    .sort((a, b) => b.prioridade - a.prioridade);
  const enumExato = enumeradas.find((r) => r.rubrica_normalizada === normalizada);
  if (enumExato) {
    return {
      rubrica_original: rubricaOriginal,
      rubrica_normalizada: normalizada,
      bucket: enumExato.bucket,
      origem: 'enumerado',
      regra_aplicada_id: enumExato.id,
      confianca: 'alta',
    };
  }

  // 2. Regras soft (prioridade 50)
  const softs = filtradas
    .filter(
      (r) =>
        r.tipo_regra === 'regra_soft_contains' ||
        r.tipo_regra === 'regra_soft_startswith',
    )
    .sort((a, b) => b.prioridade - a.prioridade);

  for (const regra of softs) {
    const excecoes = (regra.excecoes ?? []).map((ex) => normalizarRubrica(ex));
    if (excecoes.some((ex) => normalizada.includes(ex))) continue;

    const padrao = regra.rubrica_normalizada;
    const match =
      regra.tipo_regra === 'regra_soft_contains'
        ? normalizada.includes(padrao)
        : normalizada.startsWith(padrao);
    if (!match) continue;

    return {
      rubrica_original: rubricaOriginal,
      rubrica_normalizada: normalizada,
      bucket: regra.bucket,
      origem:
        regra.tipo_regra === 'regra_soft_contains' ? 'soft_contains' : 'soft_startswith',
      regra_aplicada_id: regra.id,
      confianca: 'media',
    };
  }

  // 3. Fallback
  return {
    rubrica_original: rubricaOriginal,
    rubrica_normalizada: normalizada,
    bucket: 'nao_classificado',
    origem: 'fallback',
    confianca: 'baixa',
  };
}

/**
 * Helper para classificar várias rubricas em lote, devolvendo agregado por
 * bucket + lista de não-classificadas (UI mostra em destaque).
 */
export interface ClassificacaoLote {
  porBucket: Map<BucketPjeCalc, ClassificacaoRubrica[]>;
  naoClassificadas: ClassificacaoRubrica[];
}

export function classificarLote(
  rubricas: string[],
  layout: RubricaLayout,
  tabela: RubricaMappingRow[],
): ClassificacaoLote {
  const porBucket = new Map<BucketPjeCalc, ClassificacaoRubrica[]>();
  const naoClassificadas: ClassificacaoRubrica[] = [];
  for (const r of rubricas) {
    const c = classificarRubrica(r, layout, tabela);
    if (c.bucket === 'nao_classificado') {
      naoClassificadas.push(c);
    } else {
      const cur = porBucket.get(c.bucket) ?? [];
      cur.push(c);
      porBucket.set(c.bucket, cur);
    }
  }
  return { porBucket, naoClassificadas };
}
