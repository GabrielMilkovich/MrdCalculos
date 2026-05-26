/**
 * Shim — re-exports from @/lib/ctps/core.ts (módulo puro compartilhado).
 * Mantido para compatibilidade de imports existentes.
 */

export { parseFaltas, classificarTipoAfastamento } from '@/lib/ctps/core';
export type { FaltaParseada, ParseFaltasResult, TipoAfastamento } from '@/lib/ctps/core';
