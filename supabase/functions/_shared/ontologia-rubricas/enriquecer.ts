/**
 * Enriquece a lista de rubricas extraídas com o resultado da classificação
 * ontológica e produz o `resumo_classificacao` agregado por categoria.
 *
 * Chamado pelos mappers de holerite (Via Varejo + Genérico) após extrair
 * a lista crua de `RubricaDominio`. Saída plugada diretamente em
 * `HoleriteResultDominio.rubricas_classificadas` + `.resumo_classificacao`.
 *
 * Por que integer cents (não Decimal.js): valores chegam em
 * `RubricaDominio.valor_vencimento` como `number` (float-reais — `parseFloat`
 * da string BR upstream). Decimal.js só recuperaria precisão se aplicado
 * ANTES do parseFloat. Aplicando depois, `new Decimal(1234.56)` já carrega
 * o ruído do float ("1234.5599999999...") — Decimal.js ali seria teatro.
 * A representação correta a 2-decimais é integer-cents: `Math.round(v*100)`
 * arredonda cada valor pra inteiro EXATO antes da soma, e a soma de
 * inteiros JS é precisa até 2^53. Holerite real não chega perto disso.
 */

import type {
  CategoriaRubricaDominio,
  MetodoMatchDominio,
  ResumoClassificacaoHolerite,
  RubricaClassificadaDominio,
  RubricaDominio,
} from '../tipos-dominio.ts';
import { classificarRubrica } from './classificar.ts';

function paraCentavos(reais: number | null): number {
  if (reais === null || !Number.isFinite(reais)) return 0;
  return Math.round(reais * 100);
}

const CATEGORIAS_VALIDAS: readonly CategoriaRubricaDominio[] = [
  'MINIMO_GARANTIDO',
  'COMISSAO_PRODUTOS',
  'COMISSAO_SERVICOS',
  'PREMIO',
  'DSR_PAGO',
  'DESCONSIDERAR',
  'NAO_CLASSIFICADO',
];

const METODOS_VALIDOS: readonly MetodoMatchDominio[] = [
  'exato',
  'normalizado',
  'sinonimo',
  'fuzzy',
  'nao_encontrado',
];

export interface EnriquecimentoResultado {
  rubricas_classificadas: RubricaClassificadaDominio[];
  resumo_classificacao: ResumoClassificacaoHolerite;
}

/**
 * Aplica a ontologia em cada rubrica, devolvendo a lista enriquecida e
 * o resumo agregado. Não muta o array de entrada.
 *
 * Se `classificacoesManuais` for fornecido (map `nome_original -> categoria`),
 * a categoria manual sobrescreve a automática para aquela rubrica e o
 * método vira `exato` (decisão humana > ontologia).
 */
export function enriquecerComClassificacao(
  rubricas: readonly RubricaDominio[],
  classificacoesManuais?: Readonly<Record<string, CategoriaRubricaDominio>>,
): EnriquecimentoResultado {
  const classificadas: RubricaClassificadaDominio[] = [];

  // Inicializa contadores por categoria + por método com 0.
  const centavosPorCategoria: Record<CategoriaRubricaDominio, number> = {
    MINIMO_GARANTIDO: 0,
    COMISSAO_PRODUTOS: 0,
    COMISSAO_SERVICOS: 0,
    PREMIO: 0,
    DSR_PAGO: 0,
    DESCONSIDERAR: 0,
    NAO_CLASSIFICADO: 0,
  };
  const porMetodo: Record<MetodoMatchDominio, number> = {
    exato: 0,
    normalizado: 0,
    sinonimo: 0,
    fuzzy: 0,
    nao_encontrado: 0,
  };

  const nomesNaoClassificadas: string[] = [];

  for (const r of rubricas) {
    const manual = classificacoesManuais?.[r.nome];
    let resultado;
    if (manual !== undefined && CATEGORIAS_VALIDAS.includes(manual)) {
      // Override manual — não roda ontologia.
      resultado = {
        rubrica_canonica: null,
        categoria: manual,
        metodo_match: 'exato' as MetodoMatchDominio,
        score_match: 1,
        texto_original: r.nome,
        texto_normalizado: r.nome.toLowerCase().trim(),
      };
    } else {
      resultado = classificarRubrica(r.nome);
    }

    const centavos = paraCentavos(r.valor_vencimento);
    centavosPorCategoria[resultado.categoria] += centavos;
    porMetodo[resultado.metodo_match] += 1;

    if (resultado.categoria === 'NAO_CLASSIFICADO') {
      nomesNaoClassificadas.push(r.nome);
    }

    classificadas.push({
      rubrica: r,
      categoria: resultado.categoria,
      metodo_match: resultado.metodo_match,
      score_match: resultado.score_match,
      texto_canonico: resultado.rubrica_canonica?.texto_canonico ?? null,
      divergencia_juridica:
        resultado.rubrica_canonica?.observacao_juridica !== undefined,
    });
  }

  const total = rubricas.length;
  const naoClass = porMetodo.nao_encontrado;

  const resumo: ResumoClassificacaoHolerite = {
    total_rubricas: total,
    classificadas: total - naoClass,
    nao_classificadas: naoClass,
    por_metodo: porMetodo,
    base_dsr_comissoes_produtos_centavos: centavosPorCategoria.COMISSAO_PRODUTOS,
    base_dsr_comissoes_servicos_centavos: centavosPorCategoria.COMISSAO_SERVICOS,
    base_dsr_premios_centavos: centavosPorCategoria.PREMIO,
    dsr_ja_pago_centavos: centavosPorCategoria.DSR_PAGO,
    minimo_garantido_centavos: centavosPorCategoria.MINIMO_GARANTIDO,
    desconsiderado_centavos: centavosPorCategoria.DESCONSIDERAR,
    nao_classificadas_centavos: centavosPorCategoria.NAO_CLASSIFICADO,
    rubricas_nao_classificadas: nomesNaoClassificadas,
  };

  return { rubricas_classificadas: classificadas, resumo_classificacao: resumo };
}

// Eslint: silenciamos uso de METODOS_VALIDOS — exportado abaixo pra consumo externo
// (UI validação) sem precisar reespelhar a lista.
export { METODOS_VALIDOS, CATEGORIAS_VALIDAS };
