// supabase/functions/_shared/holerite-mapper-v2/v1-compat.ts
//
// Adapter: converte saída do mapper V2 (ClassificacaoRubrica) para os
// shapes herdados que os consumidores (HoleriteResultDominio, UI banner,
// cálculo DSR) esperam:
//   - RubricaClassificadaDominio (categoria + metodo_match + score + canonico)
//   - ResumoClassificacaoHolerite (agregação por categoria em centavos)
//
// Field names do resumo preservados (`base_dsr_comissoes_produtos_centavos`,
// `dsr_ja_pago_centavos`, etc.) — refletem conceitos jurídicos estáveis,
// não slugs de categoria. JSONB persistido em `documents.parsed.resumo_classificacao`
// continua válido sem migração de dados.
//
// Mapeamento `source → metodo_match`:
//   seed_v2 + lookup em normalized_key principal → 'exato'
//   seed_v2 + lookup em alias                    → 'sinonimo'
//   user_classification (alias aprendido)        → 'sinonimo'
//   unknown                                      → 'nao_encontrado'
//   ('fuzzy' nunca produzido pelo V2; chave preservada em por_metodo
//    com valor 0 para compat de leitura de resumos antigos no JSONB)

import type {
  CategoriaRubricaDominio,
  MetodoMatchDominio,
  ResumoClassificacaoHolerite,
  RubricaClassificadaDominio,
  RubricaDominio,
} from '../tipos-dominio.ts';
import type { ClassificacaoRubrica } from '../../../../src/features/data-extraction/parsers/holerite/ontologia-rubricas-v2.ts';
import {
  ALIAS_TO_CANONICAL,
  canonicalKeyOf,
  classificarLoteSeedOnly,
} from './sync-mode.ts';

function deriveMetodoMatch(c: ClassificacaoRubrica): MetodoMatchDominio {
  if (c.source === 'unknown') return 'nao_encontrado';
  if (c.source === 'user_classification') return 'sinonimo';
  // source === 'seed_v2'
  const canonKey = canonicalKeyOf(c.normalized_key);
  if (canonKey && canonKey === c.normalized_key) return 'exato';
  // Pegou via alias do seed
  return 'sinonimo';
}

function deriveTextoCanonico(c: ClassificacaoRubrica): string | null {
  if (c.source === 'unknown') return null;
  return ALIAS_TO_CANONICAL.get(c.normalized_key) ?? c.alias_original;
}

export function toRubricaClassificadaDominio(
  rubricaOriginal: RubricaDominio,
  c: ClassificacaoRubrica,
): RubricaClassificadaDominio {
  return {
    rubrica: rubricaOriginal,
    categoria: c.categoria,
    metodo_match: deriveMetodoMatch(c),
    score_match: c.confidence,
    texto_canonico: deriveTextoCanonico(c),
    divergencia_juridica: c.divergencia_juridica,
  };
}

function paraCentavos(reais: number | null): number {
  if (reais === null || !Number.isFinite(reais)) return 0;
  return Math.round(reais * 100);
}

export interface EnriquecimentoResultado {
  rubricas_classificadas: RubricaClassificadaDominio[];
  resumo_classificacao: ResumoClassificacaoHolerite;
}

/**
 * Agrega lista de RubricaClassificadaDominio em ResumoClassificacaoHolerite.
 * Field names V1 preservados: `base_dsr_comissoes_produtos_centavos`,
 * `dsr_ja_pago_centavos`, etc. Aceita slugs V2 (escritos por mapper novo)
 * E V1 (resumos legados sendo re-agregados via shim de leitura).
 */
export function agregarResumoClassificacao(
  rubricasOriginais: readonly RubricaDominio[],
  classificadas: readonly RubricaClassificadaDominio[],
): ResumoClassificacaoHolerite {
  const porMetodo: Record<MetodoMatchDominio, number> = {
    exato: 0,
    normalizado: 0,
    sinonimo: 0,
    fuzzy: 0,
    nao_encontrado: 0,
  };
  let base_dsr_comissoes_produtos_centavos = 0;
  let base_dsr_comissoes_servicos_centavos = 0;
  let base_dsr_premios_centavos = 0;
  let dsr_ja_pago_centavos = 0;
  let minimo_garantido_centavos = 0;
  let desconsiderado_centavos = 0;
  let nao_classificadas_centavos = 0;
  const nomesNaoClassificadas: string[] = [];

  for (let i = 0; i < classificadas.length; i++) {
    const c = classificadas[i];
    const r = rubricasOriginais[i];
    porMetodo[c.metodo_match] += 1;
    const cv = paraCentavos(r.valor_vencimento);
    // Aceita slugs V2 (mapper novo) E V1 (futuros consumidores re-agregando
    // JSONB legado podem chamar essa função). Switch é exaustivo nos dois sets.
    switch (c.categoria as string) {
      case 'COMISSOES_PRODUTOS':
      case 'COMISSAO_PRODUTOS':
        base_dsr_comissoes_produtos_centavos += cv;
        break;
      case 'COMISSOES_SERVICOS':
      case 'COMISSAO_SERVICOS':
        base_dsr_comissoes_servicos_centavos += cv;
        break;
      case 'PREMIOS':
      case 'PREMIO':
        base_dsr_premios_centavos += cv;
        break;
      case 'DSR_S_COMISSOES':
      case 'DSR_PAGO':
        dsr_ja_pago_centavos += cv;
        break;
      case 'MINIMO_GARANTIDO':
        minimo_garantido_centavos += cv;
        break;
      case 'DESCONSIDERADAS':
      case 'DESCONSIDERAR':
        desconsiderado_centavos += cv;
        break;
      case 'SALARIO_SUBSTITUICAO':
        minimo_garantido_centavos += cv;
        break;
      case 'NAO_CLASSIFICADO':
      default:
        nao_classificadas_centavos += cv;
        nomesNaoClassificadas.push(r.nome);
        break;
    }
  }

  const total = classificadas.length;
  const naoClass = porMetodo.nao_encontrado;
  return {
    total_rubricas: total,
    classificadas: total - naoClass,
    nao_classificadas: naoClass,
    por_metodo: porMetodo,
    base_dsr_comissoes_produtos_centavos,
    base_dsr_comissoes_servicos_centavos,
    base_dsr_premios_centavos,
    dsr_ja_pago_centavos,
    minimo_garantido_centavos,
    desconsiderado_centavos,
    nao_classificadas_centavos,
    rubricas_nao_classificadas: nomesNaoClassificadas,
  };
}

/**
 * Substitui o `enriquecerComClassificacao` do V1. Sync — depende de cache
 * de aliases pre-warmed por handler ANTES desta chamada.
 */
export function enriquecerComClassificacaoV2(
  rubricas: readonly RubricaDominio[],
  classificacoesManuais?: Readonly<Record<string, CategoriaRubricaDominio>>,
): EnriquecimentoResultado {
  const nomes = rubricas.map((r) => r.nome);
  const cls = classificarLoteSeedOnly(nomes);
  const classificadas: RubricaClassificadaDominio[] = rubricas.map((r, i) => {
    const manual = classificacoesManuais?.[r.nome];
    if (manual !== undefined) {
      // Override manual — decisão humana > ontologia. Vira `exato`.
      return {
        rubrica: r,
        categoria: manual,
        metodo_match: 'exato',
        score_match: 1,
        texto_canonico: null,
        divergencia_juridica: false,
      };
    }
    return toRubricaClassificadaDominio(r, cls[i]);
  });
  const resumo = agregarResumoClassificacao(rubricas, classificadas);
  return { rubricas_classificadas: classificadas, resumo_classificacao: resumo };
}
