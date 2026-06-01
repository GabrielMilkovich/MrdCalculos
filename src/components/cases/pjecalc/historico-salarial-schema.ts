/**
 * Schema de validação — Ocorrência de Histórico Salarial (paridade PJe-Calc v2.15.1).
 *
 * Regras de OcorrenciaDoHistoricoSalarial (Java):
 *  - dataOcorrencia (competência/mês-ano): @NotNull → obrigatória.
 *  - valor: @NotNull, BigDecimal(12,2) → obrigatório, monetário (Decimal), ≥ 0.
 *  - tipo de variação na série (header): FIXA/VARIAVEL (TipoVariacaoDaParcelaEnum).
 * Ver docs/specs/historico-salarial.md.
 */
import { z } from "zod";
import { isValidMoney } from "@/lib/pjecalc/money";

// Java: FIXA/VARIAVEL. MRD adiciona INFORMADA (extra; mantido p/ retrocompat).
export const TIPO_VARIACAO = ["FIXA", "VARIAVEL", "INFORMADA"] as const;
export type TipoVariacao = (typeof TIPO_VARIACAO)[number];

/** Competência no formato yyyy-MM (input type=month) ou yyyy-MM-dd. */
const competenciaRe = /^\d{4}-\d{2}(-\d{2})?$/;

export const ocorrenciaHistoricoSchema = z
  .object({
    competencia: z
      .string()
      .trim()
      .min(1, "Competência (mês/ano) é obrigatória.")
      .regex(competenciaRe, "Competência inválida (use mês/ano)."),
    valor: z.string().trim().default(""),
    nome: z.string().trim().default(""),
    tipo_variacao: z.enum(TIPO_VARIACAO).default("VARIAVEL"),
  })
  .superRefine((v, ctx) => {
    // valor obrigatório + monetário válido ≥ 0 (Decimal — nunca parseFloat).
    if (v.valor.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "Valor é obrigatório." });
    } else if (!isValidMoney(v.valor)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["valor"], message: "Valor inválido (deve ser ≥ 0)." });
    }
  });

export type OcorrenciaHistoricoForm = z.infer<typeof ocorrenciaHistoricoSchema>;
