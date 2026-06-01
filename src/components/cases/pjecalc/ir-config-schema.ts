/**
 * Validação — Config de Imposto de Renda (IRPF) (Seção 16).
 *
 * Regras de Irpf.validar()/validarQuantidadeDependentes (Java):
 *  - possuiDependentes ⇒ quantidadeDependentes ≥ 1 (MSG0004 "Dependentes",
 *    Irpf.java:486-490).
 *  - dependentes ≥ 0 sempre.
 *  - RRA (art. 12-A): quando apurar_rra, meses ≥ 1 (qtdMesesRendimentoTributaveis;
 *    rra_numero_parcelas é extra MRD, também ≥ 1 quando preenchido).
 * Ver docs/specs/imposto-de-renda.md.
 */
import { z } from "zod";

export const irConfigSchema = z
  .object({
    apurar: z.boolean().default(true),
    possui_dependentes: z.boolean().default(false),
    dependentes: z.number().int("Dependentes deve ser inteiro.").min(0, "Dependentes não pode ser negativo.").default(0),
    apurar_rra: z.boolean().default(false),
    rra_meses: z.number().int().min(0).default(0),
    rra_numero_parcelas: z.number().int().min(0).default(0),
  })
  .superRefine((v, ctx) => {
    if (!v.apurar) return; // IR desligado → nada a validar
    // possui dependentes ⇒ quantidade ≥ 1 (MSG0004)
    if (v.possui_dependentes && v.dependentes < 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dependentes"], message: "Informe a quantidade de dependentes (≥ 1)." });
    }
    // RRA habilitado ⇒ meses ≥ 1
    if (v.apurar_rra) {
      if (v.rra_meses < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rra_meses"], message: "RRA: informe o número de meses (≥ 1)." });
      }
      if (v.rra_numero_parcelas < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rra_numero_parcelas"], message: "RRA: informe o número de parcelas (≥ 1)." });
      }
    }
  });

export type IrConfigForm = z.infer<typeof irConfigSchema>;

/** Campos do form de IR que NÃO são colunas de pjecalc_ir_config — vão em extras jsonb. */
export interface IrConfigExtras {
  apurar_rra?: boolean;
  rra_meses?: number;
  rra_numero_parcelas?: number;
  incidir_sobre_principal_tributavel?: boolean;
  incidir_sobre_principal_nao_tributavel?: boolean;
}
