/**
 * Schema de validação — Advogado (paridade PJe-Calc v2.15.1).
 *
 * Regras de Advogado.validar() (Advogado.java:137-165):
 *  - Nome obrigatório (MSG0003) — único campo realmente exigido.
 *  - Documento Fiscal: validado por tipo SOMENTE se número preenchido (MSG0004).
 *  - OAB: capturado/persistido, NUNCA validado.
 * Ver docs/specs/advogados.md.
 */
import { z } from "zod";
import { validarCPF, validarCNPJ } from "@/lib/validadores";

export const TIPO_ADVOGADO = ["RECLAMANTE", "RECLAMADO"] as const;
export const TIPO_DOC_ADVOGADO = ["CPF", "CNPJ", "CEI"] as const;

export type TipoAdvogado = (typeof TIPO_ADVOGADO)[number];
export type TipoDocAdvogado = (typeof TIPO_DOC_ADVOGADO)[number];

/** Doc fiscal válido p/ o tipo. Vazio = válido (opcional). */
export function docAdvogadoValido(numero: string | undefined, tipo: TipoDocAdvogado): boolean {
  const n = (numero ?? "").replace(/\D+/g, "");
  if (!n) return true;
  if (tipo === "CPF") return validarCPF(n);
  if (tipo === "CNPJ") return validarCNPJ(n);
  return true; // CEI: Java valida, mas sem validador local (debt — ver Seção 1 §6)
}

export const advogadoSchema = z
  .object({
    nome: z.string().trim().min(1, "Nome do advogado é obrigatório."),
    representa: z.enum(TIPO_ADVOGADO),
    tipo_documento: z.enum(TIPO_DOC_ADVOGADO).default("CPF"),
    numero_documento: z.string().trim().default(""),
    oab: z.string().trim().default(""),     // nunca valida (paridade Java)
    oab_uf: z.string().trim().default(""),
  })
  .superRefine((v, ctx) => {
    if (!docAdvogadoValido(v.numero_documento, v.tipo_documento)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numero_documento"],
        message: `${v.tipo_documento} do advogado inválido.`,
      });
    }
  });

export type AdvogadoForm = z.infer<typeof advogadoSchema>;
