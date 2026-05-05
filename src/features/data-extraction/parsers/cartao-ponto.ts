/**
 * Re-export compat — o parser de cartão de ponto agora é dispatcher
 * em `./cartao-ponto/index.ts`. Manter este arquivo como shim mantém
 * a API pública estável (todos os imports `from './parsers/cartao-ponto'`
 * continuam funcionando sem mudança).
 *
 * Mudança v5: o parser determinístico vira uma família de layouts
 * (genérico v3 + Via Varejo v1). Auto-detecção decide qual usar.
 */
export {
  parseCartaoPonto,
  parseCartaoPontoGenerico,
  parseCartaoPontoViaVarejo,
  detectarLayout,
  detectarLayoutViaVarejo,
  PARSER_VERSION,
  PARSER_VERSION_GENERICO,
  PARSER_VERSION_VIA_VAREJO,
} from './cartao-ponto/index';
export type {
  Marcacao,
  OcorrenciaApuracao,
  TipoEvento,
  EventoDiario,
  ApuracaoDiaria,
  ParseCartaoPontoResult,
  LayoutCartaoPonto,
  DetectarLayoutResult,
  PeriodoCartao,
  ParseCartaoPontoOptions,
} from './cartao-ponto/index';
