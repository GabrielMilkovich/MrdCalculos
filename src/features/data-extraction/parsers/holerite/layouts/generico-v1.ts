/**
 * Layout `generico_v1` — fallback para holerites sem layout específico.
 *
 * F0.2 (rewrite cirúrgico) — antes este parser produzia CSV juridicamente
 * errado em holerites do mercado:
 *   - Pegava primeiro número como `valor_vencimento`, sem distinguir
 *     QUANTIDADE (ex: 0,92 horas) de VALOR (ex: R$ 100,00)
 *     de BASE de cálculo (ex: Base IR R$ 2.125,78).
 *   - Não dedupava linhas repetidas (Empréstimo aparecendo 6× somava 6×).
 *   - Não detectava bases de cálculo — Base IR virava "Salário Fixo"
 *     e somava com rubricas reais → total absurdo.
 *   - Não fazia cross-check matemático contra Total Bruto reportado.
 *
 * Agora aplica 4 regras estruturais:
 *   1. **Detecção de bases**: linhas cujo nome casa /^base.../ vão para
 *      `bases_calculo` (separadas das rubricas) e NUNCA entram no CSV.
 *   2. **Classificação de colunas**: separa `(quantidade, vencimento, desconto)`
 *      por heurística estrutural — quantidade é número < 1.000 com
 *      ≤4 dígitos antes da vírgula, valor monetário é maior.
 *   3. **Dedup de histórico**: linhas com mesmo (codigo, nome, valor)
 *      mantêm apenas a primeira ocorrência (resto é histórico de meses
 *      anteriores comum em alguns layouts).
 *   4. **Cross-validation**: soma de valor_vencimento NÃO pode passar
 *      `total_bruto` declarado no OCR (tolerância 5%) — se passar, é
 *      sinal forte de duplicação ou inclusão errada de base; emite
 *      warning crítico.
 *
 * Confiabilidade: aceitável para holerite genérico. Sempre retorna algo
 * (mesmo vazio + warning) — nunca null.
 */

import Decimal from "decimal.js";
import {
  type HoleriteParseResult,
  type LayoutHolerite,
  type RubricaParseada,
  parseBR,
  MESES_PT,
} from "../types";

const RE_REFERENCIA_NUM = /\bREFER[ÊE]NCIA\b[^\n]*?\b(\d{2})\s*\/\s*(\d{4})\b/i;
const RE_REFERENCIA_MMM =
  /\bREFER[ÊE]NCIA\b[^\n]*?\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*(\d{4})\b/i;
const RE_COMP_INLINE = /\b(\d{2})\/(\d{4})\b/;
const RE_VALOR_BR = /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/g;

/**
 * Linha de rubrica padrão: <código 3-5 dígitos> <nome> <números restantes>.
 * Nome é greedy até primeiro número que faz parte de quantidade/valor.
 */
const RE_LINHA_RUBRICA_COD =
  /^(\d{3,5})\s+([\p{L}][\p{L}\s\.\-\(\)\/%]*?)\s+(\d[\d\s.,]*)$/u;

/**
 * Padrões de linhas que SÃO BASES DE CÁLCULO, não rubricas.
 * Precisam ser excluídas do histórico salarial.
 */
const RE_LINHA_BASE = /^(base\s+(de\s+)?(c[áa]lculo\s+)?(ir|irrf|inss|fgts(\s+rescis[aã]o)?))$/i;

/**
/**
 * Linhas TOTALIZADORAS — não são rubricas, são somas declaradas.
 * Incluí-las no parse duplica o cálculo (somam consigo mesmas).
 * Detectadas separadamente via `detectarTotalBruto`.
 *
 * Cobertura ampliada (audit #Bug-2 + FASE 1.1): captura abreviações comuns
 * em holerites de mercado — "Total Desc" (sem "ontos"), "Liquido NNNN,NN"
 * sozinho, "Total a Pagar", "Total Empregado/Empregador", "Total Receber",
 * "Salario Liquido" etc. — que antes vazavam para o parse e inflavam o
 * salário em 100%+.
 *
 * Ancorada em `^` para casar a LINHA INTEIRA como totalizador (descartar).
 */
const RE_LINHA_TOTALIZADOR =
  /^(total\s+(bruto|venc(?:imentos)?\.?|proventos|prov\.?|descont[oa]?s?|desc(?:ontos?)?\.?|l[ií]q(?:uido)?\.?|geral|a\s+(pagar|receber)|empregad[oa]r?)|valor\s+l[ií]quido|l[ií]quido\s+a\s+receber|salario\s+l[ií]quido|s[aá]l[aá]rio\s+l[ií]quido|l[ií]quido\s+\d)/i;

/**
 * FASE 1.1 — RE_LINHA_TOTALIZADOR_INLINE: mesma cobertura mas SEM âncora `^`.
 * Casa no MEIO da linha. Quando dispara mas a linha NÃO casa
 * `RE_LINHA_TOTALIZADOR` (totalizador colado em rubrica por OCR sujo, ex:
 * "Total Desc 385,75 R$ 2.989,25" ou "0001 SALARIO 3.500,00 Total Bruto 3.500"),
 * extraímos a rubrica MAS marcamos `flag_suspeita=true`. Classifier força
 * `incluir=false` por defesa-em-profundidade.
 */
const RE_LINHA_TOTALIZADOR_INLINE =
  /\b(total\s+(bruto|venc(?:imentos)?\.?|proventos|prov\.?|descont[oa]?s?|desc(?:ontos?)?\.?|l[ií]q(?:uido)?\.?|geral|a\s+(pagar|receber)|empregad[oa]r?)|valor\s+l[ií]quido|l[ií]quido\s+a\s+receber|salario\s+l[ií]quido|s[aá]l[aá]rio\s+l[ií]quido)\b/i;

/**
 * Marcadores de "Total Bruto" no OCR — usados pra cross-validation.
 * Capturam: VALOR_BR à direita do label.
 */
const RE_TOTAL_BRUTO_PADROES = [
  /(?:total\s+)?(?:bruto|proventos|vencimentos)[^\n]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
  /total\s+venc(?:imentos)?[^\n]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
];

interface ColunasClassificadas {
  quantidade: number | null;
  valor_vencimento: number | null;
  valor_desconto: number | null;
}

/**
 * Classifica os números detectados numa linha em (quantidade, vencimento,
 * desconto). NUNCA "primeiro número = valor" cego.
 *
 * Heurística estrutural:
 *   - Se há 1 valor → assume vencimento.
 *   - Se há 2 valores e o PRIMEIRO é < 1.000 e tem ≤4 dígitos antes da
 *     vírgula → primeiro é QUANTIDADE, segundo é vencimento.
 *   - Se há 2 valores e ambos são > 100 → primeiro é vencimento, segundo
 *     é desconto (layout duas-colunas Vencimento/Desconto).
 *   - Se há 3 valores → quantidade, vencimento, desconto nessa ordem.
 *
 * Retorna `null` em todos os campos se nenhum heurística casar com
 * confiança — caller decide o que fazer.
 */
export function classificarColunas(
  valoresRaw: string[],
): ColunasClassificadas {
  const valores = valoresRaw.map((v) => ({ raw: v, num: parseBR(v) }));

  if (valores.length === 0) {
    return { quantidade: null, valor_vencimento: null, valor_desconto: null };
  }

  if (valores.length === 1) {
    return {
      quantidade: null,
      valor_vencimento: valores[0].num,
      valor_desconto: null,
    };
  }

  if (valores.length === 2) {
    const [a, b] = valores;
    // Quantidade tipicamente: < 1000, ≤ 4 dígitos antes da vírgula, SEM
    // separador de milhar (R$ 1.234,00 nunca é quantidade), e DIFERENTE
    // do segundo valor (linhas como "INSS 188,77 188,77" são layout
    // venc/desc espelhado, não quantidade).
    // Ex: "0,92" (horas), "30,00" (dias), "200,00" (200h trabalhadas).
    const aPareceQtd =
      a.num > 0 &&
      a.num < 1000 &&
      /^\d{1,4},/.test(a.raw) &&
      !a.raw.includes(".") &&
      a.num !== b.num;
    const bPareceValor = b.num >= 1; // qualquer monetário plausível

    if (aPareceQtd && bPareceValor) {
      return {
        quantidade: a.num,
        valor_vencimento: b.num,
        valor_desconto: null,
      };
    }
    // 2 valores grandes → vencimento + desconto (layout duas-colunas).
    return {
      quantidade: null,
      valor_vencimento: a.num,
      valor_desconto: b.num,
    };
  }

  // 3+ valores: assume (qtd, venc, desc) nessa ordem.
  const [q, v, d] = valores;
  return {
    quantidade: q.num,
    valor_vencimento: v.num,
    valor_desconto: d.num,
  };
}

/**
 * Detecta linhas de BASE de cálculo. Estas NÃO são rubricas — são
 * totalizadores de base sobre os quais tributos incidem (Base IR, Base
 * INSS, Base FGTS). Inclui-las em "Salário Fixo" duplicaria todo o
 * cálculo, gerando CSV juridicamente errado.
 */
export function eLinhaBase(nome: string): boolean {
  return RE_LINHA_BASE.test(nome.trim());
}

/**
 * Dedup de linhas repetidas no MESMO holerite. Holerites com histórico
 * de meses anteriores listam parcelas (ex: "Empréstimo lei R$ 251,18")
 * 6× — uma por mês de competência distinta. Como temos UMA competência
 * predominante no holerite, todas as 6 são a mesma rubrica do mês — manter
 * 1 ocorrência.
 *
 * Critério: (codigo, nome normalizado, valor_vencimento, valor_desconto)
 * — se 2+ batem 100%, mantém a primeira.
 */
export function dedupRubricasRepetidas(
  rubricas: RubricaParseada[],
): { unicas: RubricaParseada[]; removidas: number } {
  const visto = new Set<string>();
  const unicas: RubricaParseada[] = [];
  let removidas = 0;
  for (const r of rubricas) {
    const chave = [
      r.codigo ?? "_",
      r.nome.toLowerCase().replace(/\s+/g, " ").trim(),
      r.valor_vencimento ?? "_",
      r.valor_desconto ?? "_",
    ].join("|");
    if (visto.has(chave)) {
      removidas++;
      continue;
    }
    visto.add(chave);
    unicas.push(r);
  }
  return { unicas, removidas };
}

/**
 * Cross-validation: soma de valor_vencimento das rubricas vs total bruto
 * declarado no OCR. Se rubricas somam > total_bruto * 1.05, é sinal
 * forte de bug (bases entrando como rubrica, ou duplicação não-detectada).
 */
export function detectarTotalBruto(ocrText: string): Decimal | null {
  for (const re of RE_TOTAL_BRUTO_PADROES) {
    const m = ocrText.match(re);
    if (m) {
      const n = parseBR(m[1]);
      if (n > 0) return new Decimal(n);
    }
  }
  return null;
}

export const layoutGenericoV1: LayoutHolerite = {
  slug: "generico_v1",
  nome: "Holerite genérico (fallback)",
  sinaisIdentificacao: [],
  parse(ocrText: string): HoleriteParseResult {
    const lines = ocrText.split(/\r?\n/);
    const warnings: string[] = [];

    let competencia = detectCompetencia(ocrText);
    if (!competencia) {
      warnings.push("Competência não detectada — usando 00/0000.");
      competencia = "00/0000";
    }

    const rubricasRaw: RubricaParseada[] = [];
    const basesDetectadas: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 5) continue;
      const valoresRaw = [...line.matchAll(RE_VALOR_BR)].map((m) => m[1]);
      if (valoresRaw.length === 0) continue;

      // Pular totalizadores — são somas declaradas, capturadas por
      // `detectarTotalBruto`. Incluí-los como rubricas duplicaria o total.
      if (RE_LINHA_TOTALIZADOR.test(line)) continue;

      // FASE 1.1 — totalizador no MEIO da linha (não ancorado em ^).
      // OCR colado: "Total Desc 385,75 R$ 2.989,25" ou
      // "0001 SALARIO 3.500,00 Total Bruto 3.500,00". Continuamos extraindo
      // a rubrica, mas marcamos `flag_suspeita=true` → classifier força
      // `incluir=false` para defesa-em-profundidade.
      const totalizadorInline = !RE_LINHA_TOTALIZADOR.test(line) &&
        RE_LINHA_TOTALIZADOR_INLINE.test(line);

      // Caso 1: linha com código numérico
      const matchCod = line.match(RE_LINHA_RUBRICA_COD);
      if (matchCod) {
        const [, codigo, nome] = matchCod;
        const nomeTrim = nome.trim();
        // Filtro #1: bases de cálculo NUNCA viram rubrica
        if (eLinhaBase(nomeTrim)) {
          basesDetectadas.push(nomeTrim);
          continue;
        }
        const cols = classificarColunas(valoresRaw);
        rubricasRaw.push({
          codigo,
          nome: nomeTrim,
          quantidade: cols.quantidade,
          valor_vencimento: cols.valor_vencimento,
          valor_desconto: cols.valor_desconto,
          ordem: rubricasRaw.length,
          ...(totalizadorInline ? { flag_suspeita: true } : {}),
        });
        continue;
      }

      // Caso 2: linha sem código mas com nome legível
      const nomeMatch = line.match(
        /\b([\p{Lu}][\p{L}\d\s\.\-\(\)\/%]{4,40}?)\s+\d/u,
      );
      if (nomeMatch && valoresRaw.length > 0) {
        const nomeTrim = nomeMatch[1].trim();
        if (eLinhaBase(nomeTrim)) {
          basesDetectadas.push(nomeTrim);
          continue;
        }
        // FASE 1.1 — Defesa adicional: se o nome capturado é em si um
        // totalizador (ex: "Liquido" sozinho seguido de valor), descartar
        // como rubrica mesmo que a regex de início não tenha pegado.
        if (RE_LINHA_TOTALIZADOR_INLINE.test(nomeTrim + " 0")) {
          continue;
        }
        const cols = classificarColunas(valoresRaw);
        rubricasRaw.push({
          codigo: null,
          nome: nomeTrim,
          quantidade: cols.quantidade,
          valor_vencimento: cols.valor_vencimento,
          valor_desconto: cols.valor_desconto,
          ordem: rubricasRaw.length,
          ...(totalizadorInline ? { flag_suspeita: true } : {}),
        });
      }
    }

    // Filtro #3: dedup de linhas repetidas (histórico de parcelas)
    const { unicas: rubricas, removidas } = dedupRubricasRepetidas(rubricasRaw);
    if (removidas > 0) {
      warnings.push(
        `${removidas} linha(s) duplicada(s) removida(s) (histórico de meses anteriores).`,
      );
    }

    if (basesDetectadas.length > 0) {
      // Dedup + limita a 5 nomes únicos no warning — antes vinham todos
      // (35× "Base IRRF Base IRRF Base IRRF…") quebrando o layout do
      // HoleritePreviewDialog.
      const nomesUnicos = Array.from(new Set(basesDetectadas));
      const amostra = nomesUnicos.slice(0, 5).join(", ");
      const restante = nomesUnicos.length > 5
        ? ` (+${nomesUnicos.length - 5} outras)`
        : "";
      warnings.push(
        `${basesDetectadas.length} base(s) de cálculo excluída(s) das rubricas: ${amostra}${restante}.`,
      );
    }

    // Filtro #4: cross-validation com Total Bruto
    const totalBruto = detectarTotalBruto(ocrText);
    if (totalBruto !== null && rubricas.length > 0) {
      const somaVenc = rubricas.reduce(
        (acc, r) => acc.plus(new Decimal(r.valor_vencimento ?? 0)),
        new Decimal(0),
      );
      const limite = totalBruto.times(new Decimal("1.05"));
      if (somaVenc.gt(limite)) {
        warnings.push(
          `Cross-check: soma de vencimentos (R$ ${somaVenc.toFixed(2)}) excede Total Bruto declarado (R$ ${totalBruto.toFixed(2)}) em mais de 5% — possível duplicação ou base de cálculo classificada como rubrica. REVISE MANUALMENTE.`,
        );
      }
    }

    if (rubricas.length === 0) {
      warnings.push(
        "Nenhuma rubrica detectada pelo layout genérico. Use a UI manual.",
      );
    }

    return {
      competencia,
      rubricas,
      layout_usado: "generico_v1",
      warnings,
    };
  },
};

function detectCompetencia(ocrText: string): string | null {
  const m1 = ocrText.match(RE_REFERENCIA_NUM);
  if (m1) return `${m1[1].padStart(2, "0")}/${m1[2]}`;

  const m2 = ocrText.match(RE_REFERENCIA_MMM);
  if (m2) {
    const mes = MESES_PT[m2[1].toUpperCase()];
    if (mes) return `${mes}/${m2[2]}`;
  }

  const head = ocrText.slice(0, 800);
  const m3 = head.match(RE_COMP_INLINE);
  if (m3) {
    const mes = parseInt(m3[1], 10);
    if (mes >= 1 && mes <= 12) {
      return `${m3[1].padStart(2, "0")}/${m3[2]}`;
    }
  }

  return null;
}
