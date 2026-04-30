/**
 * Status canônicos do `documents.status` no Supabase.
 *
 * Histórico do bug que motivou esse helper: pollers checavam apenas
 * `status === 'failed'` mas a edge function nova seta `'ocr_failed'`,
 * resultando em loop infinito esperando estado que nunca viria.
 * Centralizar aqui evita bug similar reincidir.
 *
 * Valores efetivamente gravados (auditoria 2026-04-30):
 *   - Iniciais:        uploaded, pending (legacy)
 *   - OCR running:     ocr_running, processing
 *   - OCR terminais:   ocr_done, ocr_partial, ocr_failed, failed (legacy)
 *   - Chunking/emb:    chunk_pending, embedded, embedded_partial
 *   - Extração:        extracting, extracted, pendente (legacy PT-BR)
 */

export const STATUS_TERMINAL_OK = [
  'ocr_done',
  'ocr_partial',
  'extracted',
  'embedded',
  'embedded_partial',
] as const;

export const STATUS_TERMINAL_ERROR = ['failed', 'ocr_failed'] as const;

export const STATUS_IN_PROGRESS = [
  'uploaded',
  'pending',
  'pendente',
  'ocr_running',
  'processing',
  'chunk_pending',
  'extracting',
] as const;

export type DocumentStatus =
  | (typeof STATUS_TERMINAL_OK)[number]
  | (typeof STATUS_TERMINAL_ERROR)[number]
  | (typeof STATUS_IN_PROGRESS)[number];

export function isTerminalOk(status: string | null | undefined): boolean {
  if (!status) return false;
  return (STATUS_TERMINAL_OK as readonly string[]).includes(status);
}

export function isTerminalError(status: string | null | undefined): boolean {
  if (!status) return false;
  return (STATUS_TERMINAL_ERROR as readonly string[]).includes(status);
}

export function isTerminal(status: string | null | undefined): boolean {
  return isTerminalOk(status) || isTerminalError(status);
}

export function isInProgress(status: string | null | undefined): boolean {
  if (!status) return true; // null/undefined = ainda inicializando
  return (STATUS_IN_PROGRESS as readonly string[]).includes(status);
}
