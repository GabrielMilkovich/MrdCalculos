/**
 * Validação — Config de Contribuição Social / INSS (Seção 15, modelo flattened MRD).
 *
 * Regras de Inss.validar() (Java) traduzidas ao nível achatado do MRD (pjecalc_cs_config):
 *  - tipo de alíquota do segurado: 'empregado' | 'domestico' | 'fixa'
 *    (= TipoDeAliquotaDoSeguradoEnum SE/ED/F).
 *  - se tipo='fixa', aliquota_segurado_fixa é obrigatória (MSG0003).
 *  - alíquotas são percentuais: 0–100 (precisões Java 5,2 / 5,4).
 *  - período SIMPLES: término ≥ início (@GreaterOrEqualThan).
 * NÃO há master aplicarInss / regime no INSS Java (só IRPF tem regime) — não validamos.
 * Alíquotas via Decimal (CLAUDE.md). Ver docs/specs/inss-contribuicao-social.md.
 */
import { z } from "zod";
import Decimal from "decimal.js";

Decimal.set({ precision: 20 });

export const TIPO_ALIQUOTA_SEGURADO = ["empregado", "domestico", "fixa"] as const;
export type TipoAliquotaSegurado = (typeof TIPO_ALIQUOTA_SEGURADO)[number];

const dateRe = /^\d{4}-\d{2}-\d{2}$/;

/** Parse percentual pt-BR/en → Decimal; null se vazio/inválido. */
export function parseAliquota(v: string | number | undefined | null): Decimal | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? new Decimal(v) : null;
  const s = v.trim();
  if (s === "") return null;
  try {
    return new Decimal(s.replace(",", "."));
  } catch {
    return null;
  }
}

/** Alíquota válida = numérica em [0, 100]. Vazio é tratado pelo caller. */
function aliquotaNoIntervalo(v: string | number | undefined | null): boolean {
  const d = parseAliquota(v);
  if (d === null) return false;
  return d.greaterThanOrEqualTo(0) && d.lessThanOrEqualTo(100);
}

export const csConfigSchema = z
  .object({
    aliquota_segurado_tipo: z.enum(TIPO_ALIQUOTA_SEGURADO).default("empregado"),
    aliquota_segurado_fixa: z.string().trim().default(""),
    aliquota_empresa_fixa: z.string().trim().default("20"),
    aliquota_sat_fixa: z.string().trim().default("2"),
    aliquota_terceiros_fixa: z.string().trim().default("5.8"),
    // período SIMPLES (opcional)
    simples_nacional: z.boolean().default(false),
    simples_inicio: z.string().trim().default(""),
    simples_fim: z.string().trim().default(""),
  })
  .superRefine((v, ctx) => {
    // segurado FIXA exige alíquota fixa (MSG0003)
    if (v.aliquota_segurado_tipo === "fixa") {
      if (v.aliquota_segurado_fixa.trim() === "") {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aliquota_segurado_fixa"], message: "Informe a alíquota fixa do segurado (%)." });
      } else if (!aliquotaNoIntervalo(v.aliquota_segurado_fixa)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aliquota_segurado_fixa"], message: "Alíquota do segurado deve estar entre 0 e 100%." });
      }
    } else if (v.aliquota_segurado_fixa.trim() !== "" && !aliquotaNoIntervalo(v.aliquota_segurado_fixa)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["aliquota_segurado_fixa"], message: "Alíquota do segurado deve estar entre 0 e 100%." });
    }
    // alíquotas empregador 0–100
    for (const [campo, label] of [
      ["aliquota_empresa_fixa", "empresa"],
      ["aliquota_sat_fixa", "SAT/RAT"],
      ["aliquota_terceiros_fixa", "terceiros"],
    ] as const) {
      const raw = v[campo];
      if (raw.trim() !== "" && !aliquotaNoIntervalo(raw)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [campo], message: `Alíquota de ${label} deve estar entre 0 e 100%.` });
      }
    }
    // período SIMPLES: término ≥ início (quando ambos preenchidos)
    if (v.simples_nacional && dateRe.test(v.simples_inicio) && dateRe.test(v.simples_fim) && v.simples_fim < v.simples_inicio) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["simples_fim"], message: "Fim do período Simples não pode ser anterior ao início." });
    }
  });

export type CsConfigForm = z.infer<typeof csConfigSchema>;
