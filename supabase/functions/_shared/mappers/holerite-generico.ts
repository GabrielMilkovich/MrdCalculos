/**
 * Mapper: Holerite genérico (V6 — fallback universal).
 *
 * Aplica-se a qualquer holerite que tenha sinais comuns (título +
 * vencimentos/descontos OU base de cálculo) mas não bata com mapper
 * específico (Via Varejo, etc.). Score capeado em 0.6 — mappers
 * específicos vencem em ambiguidade.
 *
 * Portabilidade da F0.2 (parser frontend `generico-v1.ts`) que aplica
 * 4 regras estruturais pra evitar bugs juridicamente graves observados
 * em produção:
 *
 *   1. **eLinhaBase** — Base IR/IRRF/INSS/FGTS NUNCA viram rubrica
 *      (caso contrário viram "Salário Fixo" e duplicam o cálculo).
 *   2. **classificarColunas** — distingue (qtde, venc, desc) por
 *      heurística estrutural; não pega primeiro número como valor cego.
 *   3. **dedup** — chave `(codigo|nome|venc|desc)`; histórico de
 *      empréstimo aparecendo 6× colapsa em 1.
 *   4. **detectarTotalBruto** — cross-check soma de vencimentos vs
 *      total bruto declarado (>5% diff = warning crítico).
 *
 * Diferença vs versão frontend: aqui consumimos `DocumentoTabular`
 * (texto + coords vindos do unpdf) ao invés de string OCR cru. Texto
 * já vem ordenado top-down/left-right pelo extrator geométrico —
 * heurística é a mesma, dados de entrada mais limpos.
 *
 * Retorna `null` quando: sem competência detectável, ou nenhuma
 * rubrica extraída — pipeline cai pro V5 (fallback OCR + parser regex).
 */

import type { DocumentoTabular } from '../documento-tabular.ts';
import type { Mapper, DeteccaoMapper } from './index.ts';
import type { HoleriteResultDominio, RubricaDominio } from '../tipos-dominio.ts';

const PARSER_VERSION = 'holerite-generico-mapper-v7-2026-05-20';

const RE_REFERENCIA_NUM = /\bREFER[ÊE]NCIA\b[^\n]*?\b(\d{2})\s*\/\s*(\d{4})\b/i;
const RE_REFERENCIA_MMM =
  /\bREFER[ÊE]NCIA\b[^\n]*?\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*(\d{4})\b/i;
const RE_COMP_INLINE = /\b(0[1-9]|1[0-2])\/(\d{4})\b/;
const RE_VALOR_BR = /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
const RE_LINHA_RUBRICA_COD =
  /^(\d{3,5})\s+([\p{L}][\p{L}\s\.\-\(\)\/%]*?)\s+(\d[\d\s.,]*)$/u;
const RE_LINHA_BASE = /^(base\s+(de\s+)?(c[áa]lculo\s+)?(ir|irrf|inss|fgts(\s+rescis[aã]o)?))$/i;
const RE_LINHA_TOTALIZADOR =
  /^(total\s+(bruto|venc(?:imentos)?|proventos|descont[oa]s?|l[ií]quido|geral)|valor\s+l[ií]quido|liquido\s+a\s+receber|salario\s+l[ií]quido|salario\s+bruto)\b/i;
const RE_TOTAL_BRUTO_PADROES = [
  /(?:total\s+)?(?:bruto|proventos|vencimentos)[^\n]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
  /total\s+venc(?:imentos)?[^\n]*?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
];

const MESES_PT: Record<string, string> = {
  JAN: '01', FEV: '02', MAR: '03', ABR: '04', MAI: '05', JUN: '06',
  JUL: '07', AGO: '08', SET: '09', OUT: '10', NOV: '11', DEZ: '12',
};

function parseBR(s: string): number {
  const cleaned = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function detectCompetencia(ocrText: string): string | null {
  const m1 = ocrText.match(RE_REFERENCIA_NUM);
  if (m1) {
    const mm = m1[1].padStart(2, '0');
    const yyyy = m1[2];
    if (parseInt(mm, 10) >= 1 && parseInt(mm, 10) <= 12) return `${mm}/${yyyy}`;
  }
  const m2 = ocrText.match(RE_REFERENCIA_MMM);
  if (m2) {
    const mes = MESES_PT[m2[1].toUpperCase()];
    if (mes) return `${mes}/${m2[2]}`;
  }
  const head = ocrText.slice(0, 1500);
  const m3 = head.match(RE_COMP_INLINE);
  if (m3) return `${m3[1]}/${m3[2]}`;
  return null;
}

interface ColunasClassificadas {
  quantidade: number | null;
  valor_vencimento: number | null;
  valor_desconto: number | null;
}

function classificarColunas(valoresRaw: string[]): ColunasClassificadas {
  const valores = valoresRaw.map((v) => ({ raw: v, num: parseBR(v) }));
  if (valores.length === 0) {
    return { quantidade: null, valor_vencimento: null, valor_desconto: null };
  }
  if (valores.length === 1) {
    return { quantidade: null, valor_vencimento: valores[0].num, valor_desconto: null };
  }
  if (valores.length === 2) {
    const [a, b] = valores;
    const aPareceQtd =
      a.num > 0 && a.num < 1000 && /^\d{1,4},/.test(a.raw) &&
      !a.raw.includes('.') && a.num !== b.num;
    if (aPareceQtd && b.num >= 1) {
      return { quantidade: a.num, valor_vencimento: b.num, valor_desconto: null };
    }
    return { quantidade: null, valor_vencimento: a.num, valor_desconto: b.num };
  }
  const [q, v, d] = valores;
  return { quantidade: q.num, valor_vencimento: v.num, valor_desconto: d.num };
}

function eLinhaBase(nome: string): boolean {
  return RE_LINHA_BASE.test(nome.trim());
}

function dedupRubricasRepetidas(
  rubricas: RubricaDominio[],
): { unicas: RubricaDominio[]; removidas: number } {
  const visto = new Set<string>();
  const unicas: RubricaDominio[] = [];
  let removidas = 0;
  for (const r of rubricas) {
    const chave = [
      r.codigo ?? '_',
      r.nome.toLowerCase().replace(/\s+/g, ' ').trim(),
      r.valor_vencimento ?? '_',
      r.valor_desconto ?? '_',
    ].join('|');
    if (visto.has(chave)) {
      removidas++;
      continue;
    }
    visto.add(chave);
    unicas.push(r);
  }
  return { unicas, removidas };
}

function detectarTotalBruto(ocrText: string): number | null {
  for (const re of RE_TOTAL_BRUTO_PADROES) {
    const m = ocrText.match(re);
    if (m) {
      const n = parseBR(m[1]);
      if (n > 0) return n;
    }
  }
  return null;
}

function extrairRubricas(textoCompleto: string): {
  rubricas: RubricaDominio[];
  basesDetectadas: string[];
} {
  const lines = textoCompleto.split(/\r?\n/);
  const rubricasRaw: RubricaDominio[] = [];
  const basesDetectadas: string[] = [];

  for (const linhaRaw of lines) {
    const line = linhaRaw.trim();
    if (line.length < 5) continue;
    const valoresRaw = [...line.matchAll(RE_VALOR_BR)].map((m) => m[1]);
    if (valoresRaw.length === 0) continue;
    if (RE_LINHA_TOTALIZADOR.test(line)) continue;

    // Caso 1: linha com código numérico
    const matchCod = line.match(RE_LINHA_RUBRICA_COD);
    if (matchCod) {
      const [, codigo, nome] = matchCod;
      const nomeTrim = nome.trim();
      if (eLinhaBase(nomeTrim)) {
        basesDetectadas.push(nomeTrim);
        continue;
      }
      const cols = classificarColunas(valoresRaw);
      if (cols.valor_vencimento === null && cols.valor_desconto === null) continue;
      rubricasRaw.push({
        codigo,
        nome: nomeTrim,
        valor_vencimento: cols.valor_vencimento,
        valor_desconto: cols.valor_desconto,
        quantidade: cols.quantidade,
        ordem: rubricasRaw.length,
      });
      continue;
    }

    // Caso 2: linha sem código mas com nome legível
    const nomeMatch = line.match(/\b([\p{Lu}][\p{L}\d\s\.\-\(\)\/%]{4,40}?)\s+\d/u);
    if (nomeMatch && valoresRaw.length > 0) {
      const nomeTrim = nomeMatch[1].trim();
      if (eLinhaBase(nomeTrim)) {
        basesDetectadas.push(nomeTrim);
        continue;
      }
      const cols = classificarColunas(valoresRaw);
      if (cols.valor_vencimento === null && cols.valor_desconto === null) continue;
      rubricasRaw.push({
        codigo: null,
        nome: nomeTrim,
        valor_vencimento: cols.valor_vencimento,
        valor_desconto: cols.valor_desconto,
        quantidade: cols.quantidade,
        ordem: rubricasRaw.length,
      });
    }
  }

  const { unicas } = dedupRubricasRepetidas(rubricasRaw);
  return { rubricas: unicas, basesDetectadas };
}

export const mapperHoleriteGenerico: Mapper<HoleriteResultDominio> = {
  slug: 'holerite_generico_v1',
  nome: 'Holerite genérico (fallback universal V6)',
  tipoDocumento: 'holerite',

  detectar(doc: DocumentoTabular): DeteccaoMapper {
    const t = doc.textoCompleto;
    const motivos: string[] = [];
    let acertos = 0;
    if (
      /(HOLERITE|RECIBO\s+DE\s+(PAGAMENTO|SAL[ÁA]RIO)|CONTRACHEQUE|FOLHA\s+DE\s+PAGAMENTO|DEMONSTRATIVO\s+DE\s+PAGAMENTO|COMPROVANTE\s+DE\s+PAGAMENTO)/i
        .test(t)
    ) {
      acertos += 2;
      motivos.push('título holerite/recibo/contracheque/demonstrativo');
    }
    if (/VENCIMENTOS\b[\s\S]{0,200}?DESCONTOS\b/i.test(t)) {
      acertos++;
      motivos.push('colunas vencimentos/descontos');
    }
    if (/BASE\s+(de\s+)?C[ÁA]LCULO\s+(do\s+)?(INSS|FGTS|IRRF|IR)\b/i.test(t)) {
      acertos++;
      motivos.push('base de cálculo INSS/FGTS/IR');
    }
    if (/REFER[ÊE]NCIA\b[^\n]*?\b\d{2}\s*\/\s*\d{4}\b/i.test(t)) {
      acertos++;
      motivos.push('referência mês/ano');
    }
    return {
      aplica: acertos >= 2,
      // Cap em 0.6 — mappers específicos (ex: via varejo) vencem em empate.
      score: Math.min((acertos / 5) * 0.6, 0.6),
      motivos,
    };
  },

  mapear(doc: DocumentoTabular): HoleriteResultDominio | null {
    const competencia = detectCompetencia(doc.textoCompleto);
    if (!competencia) return null;

    const warnings: string[] = [];
    const { rubricas, basesDetectadas } = extrairRubricas(doc.textoCompleto);

    if (basesDetectadas.length > 0) {
      warnings.push(
        `${basesDetectadas.length} base(s) de cálculo excluída(s) das rubricas: ${basesDetectadas.join(', ')}.`,
      );
    }

    // Cross-validation soma vs total bruto declarado (F0.2 regra 4).
    const totalBruto = detectarTotalBruto(doc.textoCompleto);
    if (totalBruto !== null && rubricas.length > 0) {
      const somaVenc = rubricas.reduce(
        (acc, r) => acc + (r.valor_vencimento ?? 0),
        0,
      );
      if (somaVenc > totalBruto * 1.05) {
        warnings.push(
          `Cross-check: soma vencimentos R$ ${somaVenc.toFixed(2)} excede Total Bruto R$ ${totalBruto.toFixed(2)} em mais de 5% — REVISE MANUALMENTE.`,
        );
      }
    }

    if (rubricas.length === 0) {
      // Sem rubricas → cai pro V5 (fallback).
      return null;
    }

    return {
      competencia,
      rubricas,
      layout_usado: PARSER_VERSION,
      warnings,
    };
  },
};
