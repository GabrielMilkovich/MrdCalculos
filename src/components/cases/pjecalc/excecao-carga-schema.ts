/**
 * Validação — Exceção de Carga Horária (paridade PJe-Calc v2.15.1).
 *
 * Regras de ExcecaoDaCargaHorariaDoCalculo (Java) + Calculo.adicionar (:2062-2072):
 *  - dataInicioExcecao / dataTerminoExcecao: @Required (obrigatórias).
 *  - término ≥ início (@GreaterOrEqualThan) → MSG0008-like.
 *  - valorCargaHoraria: @Required (≥ 0).
 *  - overlap entre exceções do mesmo cálculo → MSG0024 (Calculo.java:2067).
 * Reusa o helper de coincidência de período de falta-schema (mesma semântica
 * inclusiva de Periodo.isDatasCoincidentesCom). Ver docs/specs/excecoes-carga-horaria.md.
 */
import { z } from "zod";
import { periodosCoincidem, type PeriodoFalta } from "./falta-schema";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

export const excecaoCargaSchema = z
  .object({
    periodo_inicio: z.string().trim().min(1, "Período início é obrigatório.").regex(dateRe, "Data inválida."),
    periodo_fim: z.string().trim().min(1, "Período fim é obrigatório.").regex(dateRe, "Data inválida."),
    carga_horaria_mensal: z.number({ invalid_type_error: "Carga horária inválida." }).min(0, "Carga horária deve ser ≥ 0."),
  })
  .superRefine((v, ctx) => {
    if (dateRe.test(v.periodo_inicio) && dateRe.test(v.periodo_fim) && v.periodo_fim < v.periodo_inicio) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["periodo_fim"],
        message: "Período fim não pode ser anterior ao início.",
      });
    }
  });

export type ExcecaoCargaForm = z.infer<typeof excecaoCargaSchema>;

/** Período de exceção (datas ISO). */
export interface PeriodoExcecao {
  id?: string;
  periodo_inicio: string;
  periodo_fim: string;
}

/**
 * Detecta overlap (MSG0024) de uma exceção candidata contra a lista existente,
 * excluindo ela própria (por id). Retorna o id conflitante ou null.
 */
export function detectarOverlapExcecaoCarga(
  candidata: PeriodoExcecao,
  lista: PeriodoExcecao[],
): string | null {
  const asFalta = (p: PeriodoExcecao): PeriodoFalta => ({
    id: p.id,
    data_inicial: p.periodo_inicio,
    data_final: p.periodo_fim,
  });
  const c = asFalta(candidata);
  for (const e of lista) {
    if (candidata.id && e.id === candidata.id) continue;
    if (periodosCoincidem(c, asFalta(e))) return e.id ?? "conflito";
  }
  return null;
}
