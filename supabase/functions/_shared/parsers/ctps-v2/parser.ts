import type { CtpsDominioV2 } from '../../tipos-dominio.ts';

/**
 * Parser CTPS V2 — Ficha de Anotações.
 *
 * Recebe texto layout-preservado (saída de `extrairGeometrico` em edge
 * function ou de `extrair-texto.ts` em vitest/Node). Devolve estrutura
 * completa V2 ou null se não for Ficha de Anotações.
 *
 * Implementação a partir da Fase 2.
 */
export function parseFichaAnotacoes(_texto: string): CtpsDominioV2 | null {
  throw new Error('Não implementado — Fase 2 em diante');
}
