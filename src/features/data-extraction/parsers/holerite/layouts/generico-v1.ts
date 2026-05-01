/**
 * Layout `generico_v1` — fallback para holerites sem layout específico.
 *
 * Heurística:
 *   1. Procura competência via várias regex (REFERENCIA MM/AAAA, MMM/AAAA, etc).
 *   2. Procura linhas que comecem com 4 dígitos (código) seguidas de nome
 *      e pelo menos 1 valor BR (`9.999,99`).
 *   3. Se a linha tem 2 valores BR, primeiro = vencimento, segundo = desconto.
 *      Se 1 valor, é vencimento (default).
 *   4. Linhas sem código mas com nome legível + valor: rubrica sem código.
 *
 * Confiabilidade: média. Cobre o caso geral mas pode pegar lixo.
 * Sempre retorna algo (mesmo vazio + warning) — nunca null.
 */

import {
  type HoleriteParseResult,
  type LayoutHolerite,
  type RubricaParseada,
  parseBR,
  MESES_PT,
} from "../types";

const RE_REFERENCIA_NUM = /\bREFER[ÊE]NCIA\b[^\n]*?\b(\d{2})\s*\/\s*(\d{4})\b/i;
const RE_REFERENCIA_MMM = /\bREFER[ÊE]NCIA\b[^\n]*?\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)\s*\/\s*(\d{4})\b/i;
const RE_COMP_INLINE = /\b(\d{2})\/(\d{4})\b/;
const RE_VALOR_BR = /\b(\d{1,3}(?:\.\d{3})*,\d{2})\b/g;
// Captura código (3-5 dígitos) + nome (tudo que vier antes do primeiro
// número que faz parte de quantidade/valor). Nome é greedy até encontrar
// um número.
const RE_LINHA_RUBRICA_COD =
  /^(\d{3,5})\s+([\p{L}][\p{L}\s\.\-\(\)\/%]*?)\s+(\d[\d\s.,]*)$/u;

export const layoutGenericoV1: LayoutHolerite = {
  slug: "generico_v1",
  nome: "Holerite genérico (fallback)",
  // Sem sinais — é o último da lista, sempre matched
  sinaisIdentificacao: [],
  parse(ocrText: string): HoleriteParseResult {
    const lines = ocrText.split(/\r?\n/);
    const warnings: string[] = [];

    // 1. Competência
    let competencia = detectCompetencia(ocrText);
    if (!competencia) {
      warnings.push("Competência não detectada — usando 00/0000.");
      competencia = "00/0000";
    }

    // 2. Rubricas
    const rubricas: RubricaParseada[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 5) continue;

      const valores = [...line.matchAll(RE_VALOR_BR)].map((m) => m[1]);
      if (valores.length === 0) continue; // sem valor, não é rubrica

      // Caso 1: linha começa com código numérico
      const matchCod = line.match(RE_LINHA_RUBRICA_COD);
      if (matchCod) {
        const [, codigo, nome] = matchCod;
        const vals = valores.map(parseBR);
        rubricas.push({
          codigo,
          nome: nome.trim(),
          quantidade: null,
          valor_vencimento: vals[0] ?? null,
          valor_desconto: vals[1] ?? null,
          ordem: rubricas.length,
        });
        continue;
      }

      // Caso 2: linha sem código mas com nome legível + valor
      // Heurística: primeira sequência de letras maiúsculas/título com 5+ chars
      const nomeMatch = line.match(/\b([\p{Lu}][\p{L}\d\s\.\-\(\)\/%]{4,40}?)\s+\d/u);
      if (nomeMatch && valores.length > 0) {
        const vals = valores.map(parseBR);
        rubricas.push({
          codigo: null,
          nome: nomeMatch[1].trim(),
          quantidade: null,
          valor_vencimento: vals[0] ?? null,
          valor_desconto: vals[1] ?? null,
          ordem: rubricas.length,
        });
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
  // 1. REFERÊNCIA MM/AAAA
  const m1 = ocrText.match(RE_REFERENCIA_NUM);
  if (m1) return `${m1[1].padStart(2, "0")}/${m1[2]}`;

  // 2. REFERÊNCIA MMM/AAAA (JAN, FEV...)
  const m2 = ocrText.match(RE_REFERENCIA_MMM);
  if (m2) {
    const mes = MESES_PT[m2[1].toUpperCase()];
    if (mes) return `${mes}/${m2[2]}`;
  }

  // 3. Qualquer MM/AAAA na primeira porção (cabeçalho)
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
