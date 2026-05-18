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

/**
 * Defesa em profundidade: o parser já filtra totalizadores em
 * `RE_LINHA_TOTALIZADOR`, mas se algum vazar (layout específico, OCR
 * truncado), o classifier reconhece pelo NOME da rubrica e marca com
 * `origem='totalizador_suspeito'`. Linhas suspeitas saem do CSV
 * automaticamente (`incluir=false`).
 */
const RE_NOME_TOTALIZADOR =
  /^(?:(?:total|valor|sal[áa]rio)\s+(?:bruto|venc(?:imentos?)?|prov(?:entos?)?|desc(?:ontos?)?|l[íi]quido|geral|receber)|l[íi]quido(?:\s+a\s+receber)?|bruto)$/i;

function nomeParaceTotalizador(nome: string): boolean {
  return RE_NOME_TOTALIZADOR.test(nome.trim());
}

export type LinhaClassificada = {
  /** Identificador estável dentro do preview (codigo+ordem). */
  key: string;
  rubrica: RubricaParseada;
  /** Categoria atribuída. `null` quando o usuário marcou "Ignorar". */
  categoria: CategoriaSlug | null;
  /** Como veio a categoria inicial (informativo para UI). */
  origem:
    | 'hint'
    | 'fallback'
    | 'desconto'
    | 'ignorar_hint'
    | 'totalizador_suspeito';
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
    // Defesa em profundidade: se o nome ESTRUTURALMENTE parece totalizador
    // (Total Bruto, Liquido, Total Desc...), classifier exclui mesmo que o
    // parser tenha deixado passar. Evita que o CSV some o salário inflado.
    if (nomeParaceTotalizador(rub.nome)) {
      return {
        key,
        rubrica: rub,
        categoria: null,
        origem: 'totalizador_suspeito',
        hint: null,
        valorParaCsv: 0,
        incluir: false,
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
