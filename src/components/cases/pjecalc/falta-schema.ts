/**
 * Schema de validação — Falta (paridade PJe-Calc v2.15.1).
 *
 * Regras de Falta.validar() (Falta.java:199-210, PeriodoDaFaltaValidRule.java):
 *  - dataInicioPeriodoFalta / dataTerminoPeriodoFalta: @Required (obrigatórias).
 *  - término ≥ inicial (@GreaterOrEqualThan) → MSG0008-like.
 *  - overlap: período não pode coincidir com outra falta do mesmo cálculo → MSG0024.
 *  - (best-effort, fora deste schema local) início ≥ admissão / término ≤ demissão.
 * Ver docs/specs/faltas.md.
 */
import { z } from "zod";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export const faltaSchema = z
  .object({
    data_inicial: z.string().trim().min(1, "Data inicial é obrigatória.").regex(dateRe, "Data inicial inválida."),
    data_final: z.string().trim().min(1, "Data final é obrigatória.").regex(dateRe, "Data final inválida."),
    justificada: z.boolean().default(false),
    reiniciar_ferias: z.boolean().default(false),
    motivo: z.string().trim().max(200, "Justificativa: máx. 200 caracteres.").default(""),
  })
  .superRefine((v, ctx) => {
    // término ≥ inicial (datas ISO comparáveis lexicograficamente)
    if (dateRe.test(v.data_inicial) && dateRe.test(v.data_final) && v.data_final < v.data_inicial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data_final"],
        message: "Data final não pode ser anterior à data inicial.",
      });
    }
  });

export type FaltaForm = z.infer<typeof faltaSchema>;

/** Período [inicial, final] (datas ISO yyyy-MM-dd). */
export interface PeriodoFalta {
  id?: string;
  data_inicial: string;
  data_final: string;
}

/** true se dois períodos se sobrepõem (datas inclusivas). */
export function periodosCoincidem(a: PeriodoFalta, b: PeriodoFalta): boolean {
  if (!a.data_inicial || !a.data_final || !b.data_inicial || !b.data_final) return false;
  // sobreposição inclusiva: a.ini ≤ b.fim E b.ini ≤ a.fim
  return a.data_inicial <= b.data_final && b.data_inicial <= a.data_final;
}

/**
 * Detecta se `candidata` coincide com alguma falta da `lista` (excluindo a
 * própria, por id). Paridade com Falta.validar (MSG0024). Retorna o id
 * conflitante ou null.
 */
export function detectarOverlapFalta(candidata: PeriodoFalta, lista: PeriodoFalta[]): string | null {
  for (const f of lista) {
    if (candidata.id && f.id === candidata.id) continue;
    if (periodosCoincidem(candidata, f)) return f.id ?? "conflito";
  }
  return null;
}
