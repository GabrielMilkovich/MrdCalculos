/**
 * Validação — Vale Transporte (Seção 14).
 *
 * NOTA DE PARIDADE: o domínio Java (ValeTransporte/ValorValeTransporte) é um
 * CATÁLOGO de linha+vigência, SEM regra de 6% e SEM bound de valor≥0 (só
 * @Required). O MRD usa um modelo próprio (config: apurar + desconto 0–6%;
 * linhas: descrição/tipo/valor_passagem/quantidade_dia). Esta validação cobre o
 * modelo do MRD (guards de nível MRD), documentando a divergência na spec.
 *  - descrição obrigatória.
 *  - valor_passagem ≥ 0, quantidade_dia ≥ 0 (guards MRD; Java não valida).
 *  - desconto_empregado_pct ∈ [0, 6] (regra MRD; Art. 4º Lei 7.418/85, sem backing Java).
 */
import { z } from "zod";

export const TIPO_LINHA_VT = ["URBANO", "INTERMUNICIPAL", "INTERESTADUAL"] as const;
export type TipoLinhaVT = (typeof TIPO_LINHA_VT)[number];

/** Config do Vale Transporte (apurar + desconto). */
export const vtConfigSchema = z.object({
  apurar: z.boolean().default(false),
  desconto_empregado_pct: z
    .number({ invalid_type_error: "Percentual inválido." })
    .min(0, "Desconto não pode ser negativo.")
    .max(6, "Desconto máximo é 6% (Art. 4º Lei 7.418/85)."),
});
export type VtConfigForm = z.infer<typeof vtConfigSchema>;

/** Linha de transporte. */
export const vtLinhaSchema = z.object({
  descricao: z.string().trim().min(1, "Descrição da linha é obrigatória."),
  tipo: z.enum(TIPO_LINHA_VT).default("URBANO"),
  valor_passagem: z.number({ invalid_type_error: "Valor inválido." }).min(0, "Valor da passagem deve ser ≥ 0."),
  quantidade_dia: z.number({ invalid_type_error: "Quantidade inválida." }).int("Quantidade deve ser inteira.").min(0, "Quantidade/dia deve ser ≥ 0."),
});
export type VtLinhaForm = z.infer<typeof vtLinhaSchema>;

/** Normaliza percentual de desconto ao teto de 6% (paridade c/ Math.min do módulo). */
export function clampDescontoVT(pct: number): number {
  if (!Number.isFinite(pct) || pct < 0) return 0;
  return Math.min(6, pct);
}
