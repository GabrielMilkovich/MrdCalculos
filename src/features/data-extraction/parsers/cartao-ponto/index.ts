/**
 * Dispatcher do parser de Cartão de Ponto.
 *
 * Estratégia:
 *   1. Detecta o LAYOUT do documento (Via Varejo vs genérico).
 *   2. Delega para o parser específico (`./layouts/*.ts`).
 *   3. Adiciona o nome do layout em `parser_version` para auditoria.
 *
 * API pública: `parseCartaoPonto(ocr: string, competenciaRef?: string)`.
 * Retorna `ParseCartaoPontoResult` — mesmo contrato dos parsers desde a v3.
 *
 * O parser genérico (`generico-v1`) é o atual `cartao-ponto.ts` v3 movido
 * pra cá sem mudança de comportamento. O parser Via Varejo (`via-varejo-v1`)
 * é novo no v5 — específico para o layout 2011-2016 da Via Varejo / Casa Bahia
 * onde o ano e mês ficam só no cabeçalho `Período DD.MM.YYYY A DD.MM.YYYY`.
 */

import {
  parseCartaoPontoGenerico,
  PARSER_VERSION as PARSER_VERSION_GENERICO,
} from './layouts/generico-v1';
import {
  parseCartaoPontoViaVarejo,
  detectarLayoutViaVarejo,
  PARSER_VERSION as PARSER_VERSION_VIA_VAREJO,
} from './layouts/via-varejo-v1';
import type {
  DetectarLayoutResult,
  LayoutCartaoPonto,
  ParseCartaoPontoOptions,
} from './types';

// Re-exporta tipos públicos do parser genérico (mesma API da v3).
export type {
  Marcacao,
  OcorrenciaApuracao,
  TipoEvento,
  EventoDiario,
  ApuracaoDiaria,
  ParseCartaoPontoResult,
} from './layouts/generico-v1';
export type {
  LayoutCartaoPonto,
  DetectarLayoutResult,
  PeriodoCartao,
  ParseCartaoPontoOptions,
} from './types';

/** Versão do dispatcher — UI mostra para confirmar deploy. */
export const PARSER_VERSION = 'cartao-ponto-v6-dispatcher-2026-05-07';

/**
 * Detecta o layout do cartão de ponto baseado em marcadores no OCR.
 * Quando nenhum layout específico casa, devolve `generico_v1` (fallback seguro).
 */
export function detectarLayout(ocr: string): DetectarLayoutResult {
  const viaVarejo = detectarLayoutViaVarejo(ocr);
  // Aceita Via Varejo apenas com confiança ALTA. Confiança 'media' não
  // é suficiente — bug histórico: marcadores soltos disparavam o parser
  // específico em documentos incompatíveis (espelhos novos do Casas Bahia,
  // por exemplo), causando 0 apurações silenciosas.
  if (viaVarejo.layout === 'via_varejo_v1' && viaVarejo.confianca === 'alta') {
    return viaVarejo;
  }
  return {
    layout: 'generico_v1',
    confianca: 'alta',
    motivos: ['fallback genérico — Via Varejo só com confiança alta'],
  };
}

/**
 * Parser principal de cartão de ponto. Auto-detecta o layout e delega.
 *
 * @param ocrText texto bruto do OCR (Mistral, Tesseract, etc.).
 * @param competenciaRef ou opções completas. Aceita ambos pra compat com v3.
 */
export function parseCartaoPonto(
  ocrText: string,
  competenciaRefOuOpts?: string | ParseCartaoPontoOptions,
) {
  const opts: ParseCartaoPontoOptions =
    typeof competenciaRefOuOpts === 'string'
      ? { competenciaRef: competenciaRefOuOpts }
      : competenciaRefOuOpts ?? {};

  const layout: LayoutCartaoPonto =
    opts.layoutForcado ?? detectarLayout(ocrText).layout;

  if (layout === 'via_varejo_v1') {
    return parseCartaoPontoViaVarejo(ocrText, opts);
  }
  // Fallback: parser genérico v3 (mantido inalterado).
  return parseCartaoPontoGenerico(ocrText, opts.competenciaRef);
}

// Compat com chamadas que usavam diretamente os parsers nomeados.
export { parseCartaoPontoGenerico, parseCartaoPontoViaVarejo, detectarLayoutViaVarejo };
export { PARSER_VERSION_GENERICO, PARSER_VERSION_VIA_VAREJO };
