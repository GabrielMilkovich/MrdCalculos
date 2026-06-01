/**
 * Mapper puro Falta (DB) → input PjeFalta do engine (Seção 5).
 * Sem dependência do Supabase client — testável isoladamente.
 * Consumido por orchestrator.toEngineFaltas. Ver docs/specs/faltas.md §3.
 */
import type { PjeFalta } from "./engine-types";
import type { PjecalcFaltaRow } from "./types";

export function mapFaltasToEngine(faltas: PjecalcFaltaRow[]): PjeFalta[] {
  return faltas.map((f) => ({
    id: f.id,
    data_inicial: f.data_inicial || "",
    data_final: f.data_final || "",
    justificada: f.justificada ?? false,
    justificativa: f.motivo || undefined,
    reinicia: f.reiniciar_ferias ?? false,
  }));
}
