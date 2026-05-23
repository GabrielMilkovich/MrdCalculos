/**
 * Classifica rubricas de um holerite parseado em categorias usadas pelo
 * PJe-Calc Cidadão (1 CSV por categoria).
 *
 * Resultado pronto para o `HoleritePreviewDialog` — usuário pode fazer
 * toggle/reclassificar por linha antes de gerar o ZIP.
 *
 * Decisões:
 *   - Descontos (`valor_desconto > 0` e `valor_vencimento` nulo/zero) viram
 *     "ignorado por desconto". Hoje a lei brasileira não trata esses como
 *     remuneração — não entram no histórico salarial.
 *   - Hint "sugerir_ignorar" → ignorado por hint (HE, INSS, IRRF, VT, VR…).
 *   - Hint "sugerir_categoria" → vai para a categoria correspondente.
 *   - Sem hint → vai para `salario_fixo` por default (decisão pragmática).
 *     Marca como "fallback" para o preview destacar em amber.
 */

import Decimal from 'decimal.js';
import type { CategoriaSlug, HintResult } from '../../types';
import type {
  RubricaParseada,
  RubricaClassificada,
  CategoriaOntologiaRubrica,
  MetodoMatchOntologia,
} from '../../parsers/holerite/types';
import { CATEGORIA_V1_TO_V2 } from '../../parsers/holerite/ontologia-rubricas-v2';
import { getDefaultHint } from '../../classification/hints';

/**
 * Sprint 3c (2026-05-23): mapping V2 → slug PJe-Calc Cidadão.
 *
 * - `DESCONSIDERADAS` → null: catalogada como "fora do CSV". Sai com
 *   `origem='ontologia_desconsiderar'`, `incluir=false`.
 * - `NAO_CLASSIFICADO` → null: cai pra camada hints (`getDefaultHint`).
 * - `COMISSOES_PRODUTOS` e `COMISSOES_SERVICOS` colapsam pra `comissao`
 *   (PJe-Calc não diferencia no histórico salarial).
 * - `SALARIO_SUBSTITUICAO` → `minimo_garantido`: substituição salarial
 *   compõe a mesma base de cálculo que salário base. Decisão alinhada
 *   com `agregarResumoClassificacao` em `v1-compat.ts` (`SALARIO_SUBSTITUICAO`
 *   soma em `minimo_garantido_centavos`).
 *
 * `salario_fixo` e `salario_familia` só via hints (cobertura genérica).
 */
const ONTOLOGIA_V2_PARA_CATEGORIA_SLUG: Record<
  CategoriaOntologiaRubrica,
  CategoriaSlug | null
> = {
  MINIMO_GARANTIDO: 'minimo_garantido',
  SALARIO_SUBSTITUICAO: 'minimo_garantido',
  COMISSOES_PRODUTOS: 'comissao',
  COMISSOES_SERVICOS: 'comissao',
  DSR_S_COMISSOES: 'dsr',
  PREMIOS: 'premiacao',
  DESCONSIDERADAS: null,
  NAO_CLASSIFICADO: null,
};

/**
 * Shim de leitura V1→V2 — JSONB legado em `documents.parsed` pré-migration #2
 * tem slugs V1 (`COMISSAO_PRODUTOS`, `PREMIO`, `DSR_PAGO`, `DESCONSIDERAR`).
 * Normaliza pra slug V2 antes do lookup. Após hard-cut (migration #2), o
 * `CATEGORIA_V1_TO_V2` ainda existe como defesa — pode remover no commit
 * que dropar a coexistência (mesmo PR que drop a migration).
 */
function normalizeCategoria(cat: string): CategoriaOntologiaRubrica {
  return (CATEGORIA_V1_TO_V2[cat] ?? cat) as CategoriaOntologiaRubrica;
}

/**
 * Sprint 3c: encontra a classificação ontológica de uma rubrica.
 *
 * Match por referência primeiro (caminho rápido — funciona quando o
 * mesmo runtime classifica e exporta, ex: testes unitários, ou quando
 * o mapper Deno serializa e o frontend usa o objeto direto via
 * structural sharing). Fallback por tupla `(codigo, nome)` cobre o
 * caso normal de produção: classificação foi feita no mapper Deno,
 * persistida em `documents.parsed` JSONB, e re-hidratada como novo
 * objeto no frontend — referência quebrada, mas (codigo, nome) bate.
 *
 * Limitação conhecida: rubricas com `codigo=null` E `nome` duplicado
 * em listas distintas farão match no primeiro hit. Sprint 3c.1 pode
 * adicionar `ordem` ao critério se necessário.
 */
function buscarClassificacaoOntologia(
  rub: RubricaParseada,
  classificadas: readonly RubricaClassificada[] | undefined,
): RubricaClassificada | null {
  if (!classificadas || classificadas.length === 0) return null;
  for (const rc of classificadas) {
    if (Object.is(rc.rubrica, rub)) return rc;
  }
  for (const rc of classificadas) {
    if (rc.rubrica.codigo === rub.codigo && rc.rubrica.nome === rub.nome) {
      return rc;
    }
  }
  return null;
}

export type LinhaClassificada = {
  /** Identificador estável dentro do preview (codigo+ordem). */
  key: string;
  rubrica: RubricaParseada;
  /** Categoria atribuída. `null` quando o usuário marcou "Ignorar". */
  categoria: CategoriaSlug | null;
  /**
   * Como veio a categoria inicial (informativo para UI).
   *
   * FASE 1.2: `'totalizador_suspeito'` para rubricas cujo nome bate
   * heurística de totalizador OU `flag_suspeita=true` veio do parser.
   *
   * Sprint 3c (2026-05-22): `'ontologia'` quando a Sprint 2 classificou
   * numa categoria mapeada (verde — validada pelo escritório);
   * `'ontologia_desconsiderar'` quando catalogada como DESCONSIDERAR
   * (azul — conhecida e propositalmente fora do CSV).
   */
  origem:
    | 'hint'
    | 'fallback'
    | 'desconto'
    | 'ignorar_hint'
    | 'totalizador_suspeito'
    | 'ontologia'
    | 'ontologia_desconsiderar';
  /** Hint original (motivo); usado em tooltip. */
  hint: HintResult;
  /** Valor que vai pro CSV (sempre vencimento; descontos zeram). */
  valorParaCsv: number;
  /** Se está marcado para entrar no CSV (toggle do preview). */
  incluir: boolean;
  /**
   * Sprint 3c: metadados da classificação ontológica preservados pra
   * UI exibir (método de match, score, divergência jurídica, texto
   * canônico). Presente apenas quando `origem` é `'ontologia'` ou
   * `'ontologia_desconsiderar'`. `undefined` nos demais origens.
   */
  classificacao_ontologia?: {
    categoria_ontologia: CategoriaOntologiaRubrica;
    metodo_match: MetodoMatchOntologia;
    score_match: number;
    texto_canonico: string | null;
    divergencia_juridica: boolean;
  };
};

/**
 * FASE 1.2 — defesa-em-profundidade: mesmo se a regex de totalizador no
 * parser falhar, o nome da rubrica entra aqui. Cobre as mesmas variantes
 * de `RE_LINHA_TOTALIZADOR` (holerite/layouts/generico-v1.ts), mantidas
 * em sincronia manual.
 */
export function nomeParaceTotalizador(nome: string): boolean {
  if (!nome) return false;
  const RE = /^\s*(total\s+(bruto|venc(?:imentos)?\.?|proventos|prov\.?|descont[oa]?s?|desc(?:ontos?)?\.?|l[ií]q(?:uido)?\.?|geral|a\s+(pagar|receber)|empregad[oa]r?)|valor\s+l[ií]quido|l[ií]quido(\s+a\s+receber)?|salario\s+l[ií]quido|s[aá]l[aá]rio\s+l[ií]quido)\s*$/i;
  return RE.test(nome);
}

export type ClassificacaoHolerite = {
  competencia: string;
  layout_usado: string;
  warnings: string[];
  linhas: LinhaClassificada[];
};

export function classifyHolerite(
  parsed: {
    competencia: string;
    layout_usado: string;
    warnings: string[];
    rubricas: RubricaParseada[];
    /**
     * Sprint 3c: classificações da ontologia da Sprint 2. Opcional —
     * quando ausente (parsed legado ou mapper que não populou), a
     * camada 2 vira no-op e o classifier se comporta exatamente como
     * antes (camadas 1, 3 e 4 inalteradas). Não-regressão garantida.
     */
    rubricas_classificadas?: readonly RubricaClassificada[];
  },
): ClassificacaoHolerite {
  const linhas: LinhaClassificada[] = parsed.rubricas.map((rub, i) => {
    const venc = rub.valor_vencimento;
    const desc = rub.valor_desconto;
    const isDesconto = (venc === null || venc <= 0) && desc !== null && desc > 0;
    const valorParaCsv = !isDesconto && venc !== null && venc > 0 ? venc : 0;

    const hint = getDefaultHint(rub.nome);
    const key = `${rub.codigo ?? 'sem'}-${i}`;

    // === Camada 1 (FASE 1.2) — defesa-em-profundidade ============
    // Totalizador ou flag_suspeita do parser: NUNCA entra no CSV,
    // mesmo se ontologia disser que é minimo_garantido. Defesa vem
    // antes de qualquer classificação.
    if (rub.flag_suspeita === true || nomeParaceTotalizador(rub.nome)) {
      return {
        key,
        rubrica: rub,
        categoria: null,
        origem: 'totalizador_suspeito',
        hint,
        valorParaCsv: 0,
        incluir: false,
      };
    }

    if (isDesconto) {
      return {
        key,
        rubrica: rub,
        categoria: null,
        origem: 'desconto',
        hint,
        valorParaCsv: 0,
        incluir: false,
      };
    }

    // === Camada 2 (Sprint 3c) — ontologia ========================
    // Quando a Sprint 2 classificou a rubrica numa categoria mapeada,
    // promove pra essa categoria com `origem='ontologia'`. Quando
    // catalogada como DESCONSIDERAR, sai com `incluir=false` e
    // `origem='ontologia_desconsiderar'`. Quando NAO_CLASSIFICADO ou
    // rubrica não aparece em `rubricas_classificadas`, segue pra
    // camada 3 (hints legado).
    const rc = buscarClassificacaoOntologia(rub, parsed.rubricas_classificadas);
    if (rc !== null) {
      // Shim V1→V2 absorve JSONB legado pré-migration #2.
      const categoriaV2 = normalizeCategoria(rc.categoria as unknown as string);
      const meta = {
        categoria_ontologia: categoriaV2,
        metodo_match: rc.metodo_match,
        score_match: rc.score_match,
        texto_canonico: rc.texto_canonico,
        divergencia_juridica: rc.divergencia_juridica,
      };
      if (categoriaV2 === 'DESCONSIDERADAS') {
        return {
          key,
          rubrica: rub,
          categoria: null,
          origem: 'ontologia_desconsiderar',
          hint,
          valorParaCsv: 0,
          incluir: false,
          classificacao_ontologia: meta,
        };
      }
      const slugOntologia = ONTOLOGIA_V2_PARA_CATEGORIA_SLUG[categoriaV2];
      if (slugOntologia !== null) {
        return {
          key,
          rubrica: rub,
          categoria: slugOntologia,
          origem: 'ontologia',
          hint,
          valorParaCsv,
          incluir: valorParaCsv > 0,
          classificacao_ontologia: meta,
        };
      }
      // NAO_CLASSIFICADO: cai pra camada 3 (hints).
    }

    // === Camada 3 — hints legado =================================
    if (hint?.tipo === 'sugerir_ignorar') {
      return {
        key,
        rubrica: rub,
        categoria: null,
        origem: 'ignorar_hint',
        hint,
        valorParaCsv,
        incluir: false,
      };
    }
    if (hint?.tipo === 'sugerir_categoria') {
      return {
        key,
        rubrica: rub,
        categoria: hint.slug,
        origem: 'hint',
        hint,
        valorParaCsv,
        incluir: valorParaCsv > 0,
      };
    }

    // === Camada 4 — fallback final (salario_fixo) ================
    return {
      key,
      rubrica: rub,
      categoria: 'salario_fixo',
      origem: 'fallback',
      hint: null,
      valorParaCsv,
      incluir: valorParaCsv > 0,
    };
  });

  return {
    competencia: parsed.competencia,
    layout_usado: parsed.layout_usado,
    warnings: parsed.warnings,
    linhas,
  };
}

/**
 * Soma os `valorParaCsv` por categoria, considerando apenas linhas
 * `incluir=true` e categoria não-nula. Categorias sem soma (>0) não entram
 * no resultado.
 *
 * Devolve `Decimal` (não `number`) — soma de valores monetários NUNCA pode
 * usar float nativo. Quem consome (CSV builder, LEIA-ME) já chama
 * `formatNumeroBR(decimal)` corretamente.
 */
export function aggregateByCategoria(
  linhas: LinhaClassificada[],
): Map<CategoriaSlug, Decimal> {
  const out = new Map<CategoriaSlug, Decimal>();
  for (const l of linhas) {
    if (!l.incluir || l.categoria === null) continue;
    if (l.valorParaCsv <= 0) continue;
    const cur = out.get(l.categoria) ?? new Decimal(0);
    out.set(l.categoria, cur.plus(l.valorParaCsv));
  }
  return out;
}
