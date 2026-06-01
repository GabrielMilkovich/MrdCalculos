/**
 * Validação — Exceção de Sábado (paridade PJe-Calc v2.15.1).
 *
 * Regras de ExcecaoDoSabadoDoCalculo (Java) + Calculo.adicionar (:2098-2108):
 *  - dataInicioExcecaoSabado / dataTerminoExcecaoSabado: @Required (obrigatórias).
 *  - término ≥ início (@GreaterOrEqualThan) → MSG0008-like.
 *  - overlap entre exceções do mesmo cálculo → MSG0024 (inclusivo).
 * NB: o Java NÃO tem flag de sábado (inverte o global). O MRD guarda
 * `sabado_dia_util` por período (modelagem explícita) — divergência registrada
 * na spec; aqui só validamos o período. Reusa periodosCoincidem de falta-schema.
 */
import { z } from "zod";
import { periodosCoincidem, type PeriodoFalta } from "./falta-schema";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export const excecaoSabadoSchema = z
  .object({
    data_inicio: z.string().trim().min(1, "Data início é obrigatória.").regex(dateRe, "Data inválida."),
    data_fim: z.string().trim().min(1, "Data fim é obrigatória.").regex(dateRe, "Data inválida."),
    sabado_dia_util: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (dateRe.test(v.data_inicio) && dateRe.test(v.data_fim) && v.data_fim < v.data_inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["data_fim"],
        message: "Data fim não pode ser anterior ao início.",
      });
    }
  });

export type ExcecaoSabadoForm = z.infer<typeof excecaoSabadoSchema>;

/** Período de exceção de sábado (datas ISO). */
export interface PeriodoSabado {
  id?: string;
  data_inicio: string;
  data_fim: string;
}

/** Detecta overlap (MSG0024) contra a lista, excluindo a própria. id ou null. */
export function detectarOverlapExcecaoSabado(
  candidata: PeriodoSabado,
  lista: PeriodoSabado[],
): string | null {
  const asFalta = (p: PeriodoSabado): PeriodoFalta => ({
    id: p.id,
    data_inicial: p.data_inicio,
    data_final: p.data_fim,
  });
  const c = asFalta(candidata);
  for (const e of lista) {
    if (candidata.id && e.id === candidata.id) continue;
    if (periodosCoincidem(c, asFalta(e))) return e.id ?? "conflito";
  }
  return null;
}
