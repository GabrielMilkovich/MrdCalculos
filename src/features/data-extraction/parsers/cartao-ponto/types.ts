/**
 * Tipos compartilhados pelos parsers de cartão de ponto.
 *
 * O dispatcher (`./index.ts`) detecta o LAYOUT do documento e delega para
 * o parser específico (`./layouts/*.ts`). Todos retornam `ParseCartaoPontoResult`
 * para que o pipeline a jusante (CSV builder, review dialog, score) seja
 * indiferente à origem do documento.
 */

export type LayoutCartaoPonto = 'via_varejo_v1' | 'generico_v1';

export interface DetectarLayoutResult {
  layout: LayoutCartaoPonto;
  confianca: 'alta' | 'media' | 'baixa';
  motivos: string[];
}

export interface PeriodoCartao {
  /** Início do período (UTC midnight). */
  inicio: Date;
  /** Fim do período (UTC midnight). */
  fim: Date;
  /** Texto literal do OCR — útil para mensagens de erro/auditoria. */
  textoOriginal: string;
}

export interface ParseCartaoPontoOptions {
  /** Competência de referência (informativa). */
  competenciaRef?: string;
  /** Força um layout específico, ignorando a auto-detecção. */
  layoutForcado?: LayoutCartaoPonto;
  /** Quando true, retorna avisos extra no `warnings` em vez de truncar dados. */
  modoVerboso?: boolean;
}
