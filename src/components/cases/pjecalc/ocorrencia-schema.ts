/**
 * Validação + recompute — Ocorrência de Verba (paridade PJe-Calc v2.15.1).
 *
 * Regras de OcorrenciaDeVerba (Java): a entidade NÃO tem validar() próprio; o
 * único bound de valor é `divisor` @Min("0.01") (OcorrenciaDeVerba.java:94-96).
 * Devido/pago NÃO têm ≥0 (negativos são possíveis; zera-negativo é regra de
 * cálculo da verba, não constraint) — por paridade, NÃO validamos ≥0 neles.
 *
 * Recompute de devido/diferença/total via Decimal (CLAUDE.md: nunca number/
 * parseFloat em valores monetários). Ver docs/specs/ocorrencias.md.
 */
import { z } from "zod";
import Decimal from "decimal.js";

Decimal.set({ precision: 20 });

const compRe = /^\d{4}-\d{2}(-\d{2})?$/;

export const ocorrenciaSchema = z
  .object({
    competencia: z.string().trim().min(1, "Competência obrigatória.").regex(compRe, "Competência inválida (mês/ano)."),
    base_valor: z.number().default(0),
    divisor_valor: z.number().default(30),
    multiplicador_valor: z.number().default(1),
    quantidade_valor: z.number().default(1),
    dobra: z.number().default(1),
    pago: z.number().default(0),
  })
  .superRefine((v, ctx) => {
    // único bound canônico: divisor ≥ 0.01 (@Min("0.01"))
    if (v.divisor_valor < 0.01) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["divisor_valor"], message: "Divisor deve ser ≥ 0,01." });
    }
    // NÃO validamos devido/pago ≥ 0 (paridade: Java permite negativo).
  });

export type OcorrenciaForm = z.infer<typeof ocorrenciaSchema>;

export interface OcorrenciaValores {
  base_valor: number;
  divisor_valor: number;
  multiplicador_valor: number;
  quantidade_valor: number;
  dobra: number;
  pago: number;
  correcao?: number;
  juros?: number;
}

export interface OcorrenciaComputada {
  devido: number;
  diferenca: number;
  total: number;
}

/**
 * Recalcula devido/diferença/total via Decimal (espelha a fórmula do grid:
 * devido = base * multiplicador / divisor * quantidade * dobra; arredonda 2 casas).
 * divisor 0/ausente cai em 30 (mesma proteção do código original).
 */
export function recomputeOcorrencia(o: OcorrenciaValores): OcorrenciaComputada {
  const base = new Decimal(o.base_valor || 0);
  const mult = new Decimal(o.multiplicador_valor || 0);
  const div = new Decimal(o.divisor_valor || 0).isZero() ? new Decimal(30) : new Decimal(o.divisor_valor);
  const qtd = new Decimal(o.quantidade_valor || 0);
  const dobra = new Decimal(o.dobra || 0);
  const pago = new Decimal(o.pago || 0);

  const devido = base.times(mult).dividedBy(div).times(qtd).times(dobra).toDecimalPlaces(2);
  const diferenca = devido.minus(pago).toDecimalPlaces(2);
  const total = diferenca
    .plus(new Decimal(o.correcao || 0))
    .plus(new Decimal(o.juros || 0))
    .toDecimalPlaces(2);

  return { devido: devido.toNumber(), diferenca: diferenca.toNumber(), total: total.toNumber() };
}
