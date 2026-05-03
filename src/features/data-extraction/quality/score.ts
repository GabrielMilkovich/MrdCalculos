/**
 * Score de confiança da extração (0-100) por tipo de documento.
 *
 * Filosofia:
 *   - Determinístico (mesma entrada → mesmo score).
 *   - Combina sinais negativos (warnings, unparsed, datas fora de janela)
 *     com sinais positivos (cobertura de competências, eventos ricos).
 *   - Nunca passa de 100 nem fica abaixo de 0.
 *   - `reasons` lista as razões do score em linguagem humana, ordem de
 *     maior penalidade pra menor.
 *
 * Faixas:
 *   90-100  alta confiança       (download liberado direto)
 *   60-89   média confiança      (download liberado, banner de aviso)
 *   0-59    baixa confiança      (sugerir IA / bloquear download por padrão)
 */

import type { ParseCartaoPontoResult } from "../parsers/cartao-ponto";
import type { ParseFeriasResult } from "../parsers/ferias";
import type { ParseFaltasResult } from "../parsers/faltas";
import type { HoleriteParseResult } from "../parsers/holerite/types";
import {
  detectarJanelasPeriodo,
  datasForaDaJanela,
  type JanelaPeriodo,
} from "./window";

export type ConfianceLevel = "alta" | "media" | "baixa";

export interface ConfidenceScore {
  /** 0-100 inteiro. */
  score: number;
  level: ConfianceLevel;
  /** Razões em linguagem humana, da maior penalidade pra menor. */
  reasons: string[];
  /** Janelas de competência detectadas no OCR (cartão-ponto). */
  janelas?: JanelaPeriodo[];
  /** Datas fora de qualquer janela detectada (cartão-ponto). */
  datasForaJanela?: string[];
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function nivel(score: number): ConfianceLevel {
  if (score >= 90) return "alta";
  if (score >= 60) return "media";
  return "baixa";
}

const RE_DATA_BR = /\b\d{2}\/\d{2}\/\d{4}\b/g;
const RE_HORA = /\b\d{1,2}:\d{2}\b/g;

/** Conta linhas (não vazias) que têm pelo menos uma data dd/MM/yyyy. */
function linhasComData(ocr: string): number {
  let n = 0;
  for (const linha of ocr.split(/\r?\n/)) {
    if (linha.trim() && RE_DATA_BR.test(linha)) n++;
    RE_DATA_BR.lastIndex = 0;
  }
  return n;
}

// ============================================================
// Cartão-Ponto
// ============================================================

export function scoreCartaoPonto(
  parsed: ParseCartaoPontoResult,
  ocr: string,
): ConfidenceScore {
  let score = 100;
  const reasons: string[] = [];

  // Penalidade por linhas suspeitas não casadas (até -25).
  const unparsed = parsed.unparsed_lines.length;
  if (unparsed > 0) {
    const pen = Math.min(25, unparsed * 2);
    score -= pen;
    reasons.push(
      `−${pen}: ${unparsed} linha(s) com possível dado não casaram com nenhum padrão`,
    );
  }

  // Penalidade por warnings do parser (até -15).
  const warns = parsed.warnings.length;
  if (warns > 0) {
    const pen = Math.min(15, warns * 3);
    score -= pen;
    reasons.push(`−${pen}: ${warns} warning(s) emitido(s) pelo parser`);
  }

  // Penalidade SEVERA por datas fora da janela de competência.
  const janelas = detectarJanelasPeriodo(ocr);
  const datasIso = parsed.apuracoes.map((a) => a.data);
  const fora = datasForaDaJanela(datasIso, janelas);
  if (fora.length > 0) {
    // Penalidade pesada — 1 data fora já é sinal forte de timestamp de
    // aprovação/metadado vazando como apuração.
    const pen = Math.min(50, 15 + fora.length * 8);
    score -= pen;
    reasons.push(
      `−${pen}: ${fora.length} data(s) fora do período do espelho — possível timestamp de aprovação ou ruído`,
    );
  }

  // Bonus por eventos ricos (HE feriado, RSR, banco de horas) — sinal de
  // que o parser está extraindo dados juridicamente relevantes.
  const totalEventos = parsed.apuracoes.reduce((a, b) => a + b.eventos.length, 0);
  if (totalEventos === 0 && parsed.apuracoes.length > 5) {
    score -= 10;
    reasons.push(
      `−10: nenhum evento estruturado (HE/banco de horas/HT) extraído — layout pode ter mudado`,
    );
  }

  // Penalidade por taxa de "linhas com data no OCR" / "apurações criadas".
  // Se OCR tem 100 linhas com data e parser só criou 30 apurações, tem perda.
  const totalDataLinhas = linhasComData(ocr);
  if (totalDataLinhas > 5 && parsed.apuracoes.length > 0) {
    const cobertura = parsed.apuracoes.length / totalDataLinhas;
    if (cobertura < 0.3) {
      const pen = 20;
      score -= pen;
      reasons.push(
        `−${pen}: só ${Math.round(cobertura * 100)}% das linhas com data viraram apuração (esperado ≥30%)`,
      );
    }
  }

  if (parsed.apuracoes.length === 0) {
    score = Math.min(score, 10);
    reasons.unshift("Nenhuma apuração extraída.");
  }

  return {
    score: clamp(score),
    level: nivel(clamp(score)),
    reasons,
    janelas,
    datasForaJanela: fora,
  };
}

// ============================================================
// Férias
// ============================================================

export function scoreFerias(
  parsed: ParseFeriasResult,
  ocr: string,
): ConfidenceScore {
  let score = 100;
  const reasons: string[] = [];

  // Conta blocos "RECIBO DE FÉRIAS" / "TERMO DE FÉRIAS" no OCR vs nº de
  // férias parseadas. Diferença grande indica perda.
  const blocos = (ocr.match(/\b(?:recibo|termo|aviso)\s+de\s+f[ée]rias\b/gi) ?? []).length;
  if (blocos > 0) {
    const cobertura = parsed.ferias.length / blocos;
    if (cobertura < 0.7) {
      const pen = Math.round((1 - cobertura) * 30);
      score -= pen;
      reasons.push(
        `−${pen}: ${blocos} bloco(s) de férias no OCR mas só ${parsed.ferias.length} parseado(s)`,
      );
    }
  }

  if (parsed.warnings.length > 0) {
    const pen = Math.min(15, parsed.warnings.length * 3);
    score -= pen;
    reasons.push(`−${pen}: ${parsed.warnings.length} warning(s) do parser`);
  }

  if (parsed.unparsed_lines.length > 0) {
    const pen = Math.min(20, parsed.unparsed_lines.length * 2);
    score -= pen;
    reasons.push(
      `−${pen}: ${parsed.unparsed_lines.length} linha(s) com data não casaram em nenhum bloco`,
    );
  }

  if (parsed.ferias.length === 0) {
    score = Math.min(score, 30);
    reasons.unshift("Nenhum período de férias detectado.");
  }

  return { score: clamp(score), level: nivel(clamp(score)), reasons };
}

// ============================================================
// Faltas
// ============================================================

export function scoreFaltas(
  parsed: ParseFaltasResult,
  ocr: string,
): ConfidenceScore {
  let score = 100;
  const reasons: string[] = [];

  // Conta menções a falta/atestado/ausência no OCR.
  const mencoes = (
    ocr.match(/\b(falt\w*|atestado|aus[êe]nc\w+|afastamento|licen[çc]a)\b/gi) ?? []
  ).length;
  if (mencoes > 0) {
    const cobertura = parsed.faltas.length / mencoes;
    if (cobertura < 0.4) {
      const pen = Math.round((1 - cobertura) * 25);
      score -= pen;
      reasons.push(
        `−${pen}: ${mencoes} menção(ões) de falta/atestado no OCR mas só ${parsed.faltas.length} parseada(s)`,
      );
    }
  }

  if (parsed.warnings.length > 0) {
    const pen = Math.min(10, parsed.warnings.length * 2);
    score -= pen;
    reasons.push(`−${pen}: ${parsed.warnings.length} warning(s) do parser`);
  }

  if (parsed.unparsed_lines.length > 0) {
    const pen = Math.min(20, parsed.unparsed_lines.length * 2);
    score -= pen;
    reasons.push(
      `−${pen}: ${parsed.unparsed_lines.length} linha(s) suspeita(s) não casaram`,
    );
  }

  return { score: clamp(score), level: nivel(clamp(score)), reasons };
}

// ============================================================
// Holerite
// ============================================================

export function scoreHolerite(
  parsed: HoleriteParseResult,
  _ocr: string,
): ConfidenceScore {
  let score = 100;
  const reasons: string[] = [];

  if (parsed.layout_usado === "generico_v1" || parsed.layout_usado === "fallback") {
    score -= 15;
    reasons.push(
      `−15: layout '${parsed.layout_usado}' usado (parser específico para o empregador não encontrado)`,
    );
  }

  if (parsed.rubricas.length === 0) {
    score = Math.min(score, 20);
    reasons.unshift("Nenhuma rubrica extraída.");
  } else if (parsed.rubricas.length < 3) {
    score -= 20;
    reasons.push(
      `−20: apenas ${parsed.rubricas.length} rubrica(s) extraída(s) — holerite normalmente tem 5+`,
    );
  }

  if (parsed.warnings.length > 0) {
    const pen = Math.min(15, parsed.warnings.length * 3);
    score -= pen;
    reasons.push(`−${pen}: ${parsed.warnings.length} warning(s) do parser`);
  }

  // Verifica se a competência foi extraída.
  if (!parsed.competencia || !/^\d{2}\/\d{4}$/.test(parsed.competencia)) {
    score -= 15;
    reasons.push(`−15: competência não detectada ou formato inválido`);
  }

  return { score: clamp(score), level: nivel(clamp(score)), reasons };
}
