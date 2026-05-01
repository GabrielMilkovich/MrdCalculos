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

import type { CategoriaSlug, HintResult } from '../../types';
import type { RubricaParseada } from '../../parsers/holerite/types';
import { getDefaultHint } from '../../classification/hints';

export type LinhaClassificada = {
  /** Identificador estável dentro do preview (codigo+ordem). */
  key: string;
  rubrica: RubricaParseada;
  /** Categoria atribuída. `null` quando o usuário marcou "Ignorar". */
  categoria: CategoriaSlug | null;
  /** Como veio a categoria inicial (informativo para UI). */
  origem: 'hint' | 'fallback' | 'desconto' | 'ignorar_hint';
  /** Hint original (motivo); usado em tooltip. */
  hint: HintResult;
  /** Valor que vai pro CSV (sempre vencimento; descontos zeram). */
  valorParaCsv: number;
  /** Se está marcado para entrar no CSV (toggle do preview). */
  incluir: boolean;
};

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
 */
export function aggregateByCategoria(
  linhas: LinhaClassificada[],
): Map<CategoriaSlug, number> {
  const out = new Map<CategoriaSlug, number>();
  for (const l of linhas) {
    if (!l.incluir || l.categoria === null) continue;
    if (l.valorParaCsv <= 0) continue;
    out.set(l.categoria, (out.get(l.categoria) ?? 0) + l.valorParaCsv);
  }
  return out;
}
