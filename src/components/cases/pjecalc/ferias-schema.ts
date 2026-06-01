/**
 * Schema de validação — Férias (paridade PJe-Calc v2.15.1).
 *
 * Regras de Ferias.java + regras/*ValidRule (ver docs/specs/ferias.md §1):
 *  - 5 datas (aquisitivo ini/fim, concessivo ini/fim) + situação obrigatórias.
 *  - prazo ≥ 0 (PrazoDeFeriasValidRule, MSG0004).
 *  - abono só se situação ∈ {gozadas, gozadas_parcialmente} (AbonoDeFeriasValidRule).
 *  - se abono: dias_abono ≤ prazo/3 (DiasDeAbonoValidRule, MSG0175).
 *  - gozo: fim ≥ início (MSG0008); frações não-sobrepostas: gozo2.ini > gozo1.fim,
 *    gozo3.ini > gozo2.fim (PeriodoDeGozoValidRule, MSG0007).
 * (gozo-dentro-do-aquisitivo e soma==prazo: best-effort/dívida — fora do schema local.)
 */
import { z } from "zod";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const optDate = z.string().trim().default("");

// Situação: aceita rótulos do MRD (lowercase) — mapeados ao engine/Java.
export const SITUACAO_FERIAS = [
  "gozadas",
  "gozadas_parcialmente",
  "indenizadas",
  "perdidas",
  "vencidas_nao_gozadas",
] as const;
export type SituacaoFerias = (typeof SITUACAO_FERIAS)[number];

const SITUACAO_PERMITE_ABONO = new Set<string>(["gozadas", "gozadas_parcialmente"]);

export const feriasSchema = z
  .object({
    periodo_aquisitivo_inicio: z.string().trim().min(1, "Aquisitivo início é obrigatório.").regex(dateRe, "Data inválida."),
    periodo_aquisitivo_fim: z.string().trim().min(1, "Aquisitivo fim é obrigatório.").regex(dateRe, "Data inválida."),
    periodo_concessivo_inicio: z.string().trim().min(1, "Concessivo início é obrigatório.").regex(dateRe, "Data inválida."),
    periodo_concessivo_fim: z.string().trim().min(1, "Concessivo fim é obrigatório.").regex(dateRe, "Data inválida."),
    situacao: z.enum(SITUACAO_FERIAS),
    prazo_dias: z.number().int().min(0, "Prazo deve ser ≥ 0.").max(30, "Prazo máximo 30 dias."),
    dobra_geral: z.boolean().default(false),
    abono: z.boolean().default(false),
    abono_dias: z.number().int().min(0).default(0),
    gozo_1_inicio: optDate, gozo_1_fim: optDate,
    gozo_2_inicio: optDate, gozo_2_fim: optDate,
    gozo_3_inicio: optDate, gozo_3_fim: optDate,
  })
  .superRefine((v, ctx) => {
    // aquisitivo fim ≥ início; concessivo fim ≥ início
    if (dateRe.test(v.periodo_aquisitivo_inicio) && dateRe.test(v.periodo_aquisitivo_fim) && v.periodo_aquisitivo_fim < v.periodo_aquisitivo_inicio) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["periodo_aquisitivo_fim"], message: "Fim do aquisitivo não pode ser anterior ao início." });
    }
    if (dateRe.test(v.periodo_concessivo_inicio) && dateRe.test(v.periodo_concessivo_fim) && v.periodo_concessivo_fim < v.periodo_concessivo_inicio) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["periodo_concessivo_fim"], message: "Fim do concessivo não pode ser anterior ao início." });
    }
    // abono só se situação permite
    if (v.abono && !SITUACAO_PERMITE_ABONO.has(v.situacao)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["abono"], message: "Abono só é permitido para férias gozadas ou gozadas parcialmente." });
    }
    // abono ⇒ dias ≤ prazo/3
    if (v.abono && v.abono_dias > Math.floor(v.prazo_dias / 3)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["abono_dias"], message: "Dias de abono não podem exceder 1/3 do prazo." });
    }
    // gozo: fim ≥ início (cada fração)
    const fracoes: Array<["gozo_1_fim" | "gozo_2_fim" | "gozo_3_fim", string, string]> = [
      ["gozo_1_fim", v.gozo_1_inicio, v.gozo_1_fim],
      ["gozo_2_fim", v.gozo_2_inicio, v.gozo_2_fim],
      ["gozo_3_fim", v.gozo_3_inicio, v.gozo_3_fim],
    ];
    for (const [path, ini, fim] of fracoes) {
      if (dateRe.test(ini) && dateRe.test(fim) && fim < ini) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message: "Fim do gozo não pode ser anterior ao início." });
      }
    }
    // frações não-sobrepostas: gozo2.ini > gozo1.fim; gozo3.ini > gozo2.fim
    if (dateRe.test(v.gozo_1_fim) && dateRe.test(v.gozo_2_inicio) && v.gozo_2_inicio <= v.gozo_1_fim) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gozo_2_inicio"], message: "Início do gozo 2 deve ser posterior ao fim do gozo 1." });
    }
    if (dateRe.test(v.gozo_2_fim) && dateRe.test(v.gozo_3_inicio) && v.gozo_3_inicio <= v.gozo_2_fim) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["gozo_3_inicio"], message: "Início do gozo 3 deve ser posterior ao fim do gozo 2." });
    }
  });

export type FeriasForm = z.infer<typeof feriasSchema>;
