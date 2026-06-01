/**
 * Schema de validação — Parâmetros Gerais (paridade PJe-Calc Cidadão v2.15.1).
 *
 * Regras extraídas de Calculo.java (ver docs/specs/parametros-gerais.md):
 *  - Obrigatórios (consistirCamposObrigatorios:467): Estado, Município, Admissão,
 *    Ajuizamento; e Demissão OU Data Final (MSG0020).
 *  - Admissão (consistirDataDeAdmissao:525): não pode ser hoje/futuro (MSG0009);
 *    não > 100 anos atrás (MSG0011).
 *  - Demissão (:604): admissão ≤ demissão (MSG0008).
 *  - Ajuizamento (:618): admissão ≤ ajuizamento (MSG0008).
 *  - Início cálculo (:632): ≥ admissão; ≤ demissão.
 *  - Término cálculo (:655): ≥ admissão; ≥ início.
 *  - Aviso prévio "informado": Quantidade obrigatória e ≥ 1 (:490-495, validarQtdePrazoAviso:521).
 *  - Carga horária padrão obrigatória se houver exceções (MSG0033) — validado na Seção 9.
 *
 * Datas no formato ISO yyyy-MM-dd (input type=date).
 */
import { z } from "zod";

export const REGIME_TRABALHO = ["tempo_integral", "tempo_parcial", "intermitente"] as const;
export const PRAZO_AVISO = ["nao_apurar", "calculado", "informado"] as const;
export const TIPO_MES = ["civil", "comercial"] as const;
export const PONTOS_FACULTATIVOS = ["sexta_santa", "carnaval", "corpus_christi"] as const;

export type RegimeTrabalho = (typeof REGIME_TRABALHO)[number];
export type PrazoAviso = (typeof PRAZO_AVISO)[number];

/** Parse ISO date (yyyy-MM-dd) → Date (meio-dia local p/ evitar TZ). null se vazio. */
function parseDate(s: string | undefined | null): Date | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function anosAtras(anos: number): Date {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anos);
  return d;
}

export const parametrosGeraisSchema = z
  .object({
    estado: z.string().trim().min(1, "Estado é obrigatório."),
    municipio: z.string().trim().min(1, "Município é obrigatório."),
    data_admissao: z.string().trim().min(1, "Admissão é obrigatória."),
    data_demissao: z.string().trim().default(""),
    data_ajuizamento: z.string().trim().min(1, "Ajuizamento é obrigatório."),
    data_inicial: z.string().trim().default(""),
    data_final: z.string().trim().default(""),
    prescricao_quinquenal: z.boolean().default(false),
    prescricao_fgts: z.boolean().default(false),
    regime_trabalho: z.enum(REGIME_TRABALHO).default("tempo_integral"),
    carga_horaria_padrao: z.string().trim().default("220"),
    maior_remuneracao: z.string().trim().default(""),
    ultima_remuneracao: z.string().trim().default(""),
    prazo_aviso_previo: z.enum(PRAZO_AVISO).default("nao_apurar"),
    prazo_aviso_dias: z.string().trim().default(""),
    projetar_aviso_indenizado: z.boolean().default(true),
    limitar_avos_periodo: z.boolean().default(false),
    zerar_valor_negativo: z.boolean().default(false),
    sabado_dia_util: z.boolean().default(true),
    considerar_feriado_estadual: z.boolean().default(true),
    considerar_feriado_municipal: z.boolean().default(true),
    tipo_mes: z.enum(TIPO_MES).default("comercial"),
    pontos_facultativos: z.array(z.enum(PONTOS_FACULTATIVOS)).default([]),
    comentarios: z.string().trim().default(""),
  })
  .superRefine((v, ctx) => {
    const adm = parseDate(v.data_admissao);
    const dem = parseDate(v.data_demissao);
    const aju = parseDate(v.data_ajuizamento);
    const ini = parseDate(v.data_inicial);
    const fim = parseDate(v.data_final);
    const hoje = new Date();
    const cem = anosAtras(100);

    // MSG0020 — Demissão OU Data Final
    if (!v.data_demissao.trim() && !v.data_final.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_demissao"], message: "Informe Demissão ou Data Final do cálculo." });
    }
    // Admissão: não hoje/futuro (MSG0009); não > 100 anos (MSG0011)
    if (adm) {
      if (adm >= new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_admissao"], message: "Admissão não pode ser igual/posterior à data atual." });
      }
      if (adm < cem) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_admissao"], message: "Admissão fora do limite de 100 anos." });
      }
    }
    // Demissão ≥ Admissão (MSG0008)
    if (adm && dem && adm > dem) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_demissao"], message: "Demissão não pode ser anterior à Admissão." });
    }
    // Ajuizamento ≥ Admissão (MSG0008)
    if (adm && aju && adm > aju) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_ajuizamento"], message: "Ajuizamento não pode ser anterior à Admissão." });
    }
    // Início ≥ Admissão; Início ≤ Demissão
    if (ini && adm && ini < adm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_inicial"], message: "Data inicial não pode ser anterior à Admissão." });
    }
    if (ini && dem && ini > dem) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_inicial"], message: "Data inicial não pode ser posterior à Demissão." });
    }
    // Término ≥ Admissão; Término ≥ Início
    if (fim && adm && fim < adm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_final"], message: "Data final não pode ser anterior à Admissão." });
    }
    if (fim && ini && fim < ini) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["data_final"], message: "Data final não pode ser anterior à Data inicial." });
    }
    // Aviso prévio "informado": Quantidade ≥ 1
    if (v.prazo_aviso_previo === "informado") {
      const q = v.prazo_aviso_dias.trim();
      if (!q) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prazo_aviso_dias"], message: "Quantidade obrigatória para aviso informado." });
      } else {
        const n = Number(q);
        if (!Number.isFinite(n) || n < 1) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["prazo_aviso_dias"], message: "Quantidade deve ser ≥ 1." });
        }
      }
    }
  });

export type ParametrosGeraisForm = z.infer<typeof parametrosGeraisSchema>;
