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
import type { RubricaParseada } from '../../parsers/holerite/types';
import { getDefaultHint } from '../../classification/hints';

export type LinhaClassificada = {
  /** Identificador estável dentro do preview (codigo+ordem). */
  key: string;
  rubrica: RubricaParseada;
  /** Categoria atribuída. `null` quando o usuário marcou "Ignorar". */
  categoria: CategoriaSlug | null;
  /**
   * Como veio a categoria inicial (informativo para UI).
   * FASE 1.2: adicionado `'totalizador_suspeito'` para rubricas cujo
   * nome bate heurística de totalizador OU `flag_suspeita=true` veio
   * do parser. Forçam `categoria=null, incluir=false` e a UI destaca
   * em vermelho com tooltip.
   */
  origem: 'hint' | 'fallback' | 'desconto' | 'ignorar_hint' | 'totalizador_suspeito';
  /** Hint original (motivo); usado em tooltip. */
  hint: HintResult;
  /** Valor que vai pro CSV (sempre vencimento; descontos zeram). */
  valorParaCsv: number;
  /** Se está marcado para entrar no CSV (toggle do preview). */
  incluir: boolean;
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
  },
): ClassificacaoHolerite {
  const linhas: LinhaClassificada[] = parsed.rubricas.map((rub, i) => {
    const venc = rub.valor_vencimento;
    const desc = rub.valor_desconto;
    const isDesconto = (venc === null || venc <= 0) && desc !== null && desc > 0;
    const valorParaCsv = !isDesconto && venc !== null && venc > 0 ? venc : 0;

    const hint = getDefaultHint(rub.nome);
    const key = `${rub.codigo ?? 'sem'}-${i}`;

    // FASE 1.2 — primeira camada de defesa: se o NOME parece totalizador
    // (Total Bruto, Liquido, Total Desc, etc.) ou se o parser marcou
    // `flag_suspeita=true` por colagem inline, NUNCA inclui no CSV.
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
    // Sem hint → fallback salario_fixo
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
